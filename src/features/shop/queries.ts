import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import type { ShopRole } from "@/lib/permissions";
import type { CurrentUser, Member, ShopContext, ShopSummary } from "./types";
import { createClient } from "@/lib/supabase/server";

// cache(): deduplicates calls within one request (layout + page + components).

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  // The session check compares the token expiry with the current time: request-time only,
  // never part of a prerendered or prefetched shell.
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", userId)
    .maybeSingle();

  return {
    id: userId,
    email: profile?.email ?? (typeof data.claims.email === "string" ? data.claims.email : null),
    fullName: profile?.full_name ?? "",
  };
});

export const getMyShops = cache(async (): Promise<ShopSummary[]> => {
  const user = await getCurrentUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shop_members")
    .select("role, shop:shops (id, name, slug)")
    .eq("user_id", user.id)
    .order("created_at");
  if (error) throw error;

  return (data ?? [])
    .filter((row) => row.shop !== null)
    .map((row) => ({
      id: row.shop!.id,
      name: row.shop!.name,
      slug: row.shop!.slug,
      role: row.role,
    }));
});

/** Shop of the URL for the current user, or null when they are not a member (→ 404). */
export const getShopContext = cache(async (slug: string): Promise<ShopContext | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const shops = await getMyShops();
  const membership = shops.find((shop) => shop.slug === slug);
  if (!membership) return null;

  const supabase = await createClient();
  const { data: shop, error } = await supabase
    .from("shops")
    .select("id, name, slug, whatsapp_phone, show_public_prices, catalog_enabled, currency")
    .eq("id", membership.id)
    .maybeSingle();
  if (error) throw error;
  if (!shop) return null;

  return {
    user,
    role: membership.role,
    shops,
    shop: {
      id: shop.id,
      name: shop.name,
      slug: shop.slug,
      whatsappPhone: shop.whatsapp_phone,
      showPublicPrices: shop.show_public_prices,
      catalogEnabled: shop.catalog_enabled,
      currency: shop.currency,
    },
  };
});

const ROLE_ORDER: Record<ShopRole, number> = { owner: 0, admin: 1, manager: 2 };

export async function getMembers(shopId: string): Promise<Member[]> {
  const supabase = await createClient();
  const { data: members, error } = await supabase
    .from("shop_members")
    .select("user_id, role, created_at")
    .eq("shop_id", shopId);
  if (error) throw error;
  if (!members?.length) return [];

  // shop_members.user_id references auth.users, so profiles are read separately.
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in(
      "id",
      members.map((member) => member.user_id),
    );
  if (profilesError) throw profilesError;
  const byId = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  return members
    .map((member) => ({
      userId: member.user_id,
      fullName: byId.get(member.user_id)?.full_name ?? "",
      email: byId.get(member.user_id)?.email ?? null,
      role: member.role,
      createdAt: member.created_at,
    }))
    .sort(
      (a, b) =>
        ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.fullName.localeCompare(b.fullName, "fr"),
    );
}
