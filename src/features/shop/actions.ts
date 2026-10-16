"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { type ActionResult, toErrorCode } from "@/lib/errors";
import type { ShopRole } from "@/lib/permissions";
import { refreshPublicCatalog } from "@/features/catalog/cache";
import { SHOP_LOGOS_BUCKET } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";
import {
  addMemberSchema,
  createShopSchema,
  generatePassword,
  memberRoleSchema,
  shopSettingsSchema,
  type AddMemberValues,
  type CreateShopValues,
  type ShopSettingsValues,
} from "./schemas";

export async function createShop(values: CreateShopValues): Promise<ActionResult> {
  const parsed = createShopSchema.safeParse({
    name: values.name,
    whatsappPhone: values.whatsappPhone ?? "",
  });
  if (!parsed.success) return { ok: false, error: "VALIDATION" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_shop", {
    p_name: parsed.data.name,
    p_whatsapp_phone: parsed.data.whatsappPhone ?? undefined,
  });
  if (error || !data) return { ok: false, error: toErrorCode(error) };

  redirect(`/s/${data.slug}`);
}

export async function updateShopSettings(
  shopId: string,
  values: ShopSettingsValues,
): Promise<ActionResult> {
  const parsed = shopSettingsSchema.safeParse({
    ...values,
    whatsappPhone: values.whatsappPhone ?? "",
  });
  if (!parsed.success) return { ok: false, error: "VALIDATION" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shops")
    .update({
      name: parsed.data.name,
      whatsapp_phone: parsed.data.whatsappPhone,
      show_public_prices: parsed.data.showPublicPrices,
      catalog_enabled: parsed.data.catalogEnabled,
    })
    .eq("id", shopId)
    .select("id");
  if (error) return { ok: false, error: toErrorCode(error) };
  // RLS silently filters rows the user may not update.
  if (!data?.length) return { ok: false, error: "FORBIDDEN" };

  await refreshPublicCatalog(shopId);
  refresh();
  return { ok: true, data: undefined };
}

async function assertCanManageMembers(shopId: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("has_shop_role", {
    p_shop_id: shopId,
    p_roles: ["owner", "admin"],
  });
  return { supabase, allowed: data === true };
}

/**
 * Creates the member's account (secret key, server only) or attaches an existing account
 * with the same e-mail, then adds the membership with the CALLER's client so that RLS has
 * the final say. A created account is deleted again if the membership cannot be added.
 */
export async function addMember(
  shopId: string,
  values: AddMemberValues,
): Promise<ActionResult<{ attached: boolean }>> {
  const parsed = addMemberSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "VALIDATION" };

  const { supabase, allowed } = await assertCanManageMembers(shopId);
  if (!allowed) return { ok: false, error: "FORBIDDEN" };

  const admin = createAdminClient();
  const findExisting = async () => {
    const { data, error } = await admin.rpc("find_user_id_by_email", {
      p_email: parsed.data.email,
    });
    if (error) throw error;
    return data;
  };

  let userId: string | null;
  let created = false;
  try {
    userId = await findExisting();
  } catch (error) {
    return { ok: false, error: toErrorCode(error) };
  }

  if (userId) {
    const { data: membership } = await supabase
      .from("shop_members")
      .select("user_id")
      .eq("shop_id", shopId)
      .eq("user_id", userId)
      .maybeSingle();
    if (membership) return { ok: false, error: "ALREADY_MEMBER" };
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: { full_name: parsed.data.fullName },
    });
    if (error) {
      // Created concurrently by someone else: attach it instead.
      if (toErrorCode(error) !== "EMAIL_TAKEN") return { ok: false, error: toErrorCode(error) };
      try {
        userId = await findExisting();
      } catch (lookupError) {
        return { ok: false, error: toErrorCode(lookupError) };
      }
      if (!userId) return { ok: false, error: "UNKNOWN" };
    } else {
      userId = data.user.id;
      created = true;
    }
  }

  const { error: insertError } = await supabase
    .from("shop_members")
    .insert({ shop_id: shopId, user_id: userId, role: parsed.data.role });

  if (insertError) {
    if (created) await admin.auth.admin.deleteUser(userId);
    return {
      ok: false,
      error: insertError.code === "23505" ? "ALREADY_MEMBER" : toErrorCode(insertError),
    };
  }

  refresh();
  return { ok: true, data: { attached: !created } };
}

export async function updateMemberRole(
  shopId: string,
  userId: string,
  role: Exclude<ShopRole, "owner">,
): Promise<ActionResult> {
  const parsedRole = memberRoleSchema.safeParse(role);
  if (!parsedRole.success) return { ok: false, error: "VALIDATION" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shop_members")
    .update({ role: parsedRole.data })
    .eq("shop_id", shopId)
    .eq("user_id", userId)
    .select("user_id");
  if (error) return { ok: false, error: toErrorCode(error) };
  if (!data?.length) return { ok: false, error: "FORBIDDEN" };

  refresh();
  return { ok: true, data: undefined };
}

export async function removeMember(shopId: string, userId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shop_members")
    .delete()
    .eq("shop_id", shopId)
    .eq("user_id", userId)
    .select("user_id");
  if (error) return { ok: false, error: toErrorCode(error) };
  if (!data?.length) return { ok: false, error: "FORBIDDEN" };

  refresh();
  return { ok: true, data: undefined };
}

/** Sets (or removes) the shop logo, uploaded by the browser under "<shop_id>/". */
export async function setShopLogo(shopId: string, logoPath: string | null): Promise<ActionResult> {
  if (logoPath !== null && !logoPath.startsWith(`${shopId}/`)) {
    return { ok: false, error: "VALIDATION" };
  }

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("shops")
    .select("logo_path")
    .eq("id", shopId)
    .maybeSingle();
  const { data, error } = await supabase
    .from("shops")
    .update({ logo_path: logoPath })
    .eq("id", shopId)
    .select("id");
  if (error) return { ok: false, error: toErrorCode(error) };
  if (!data?.length) return { ok: false, error: "FORBIDDEN" };

  // The previous file is no longer used (a leftover file would be harmless).
  if (current?.logo_path && current.logo_path !== logoPath) {
    await supabase.storage.from(SHOP_LOGOS_BUCKET).remove([current.logo_path]);
  }

  await refreshPublicCatalog(shopId);
  refresh();
  return { ok: true, data: undefined };
}

/**
 * Gives a member a new temporary password (secret key, server only). Allowed to owner/admin
 * of the shop, never on an owner or on oneself, and only when every shop of that account is
 * managed by the caller: otherwise the reset would take over an account used elsewhere.
 */
export async function resetMemberPassword(
  shopId: string,
  userId: string,
): Promise<ActionResult<{ password: string }>> {
  if (!isUuid(shopId) || !isUuid(userId)) return { ok: false, error: "VALIDATION" };

  const { supabase, allowed } = await assertCanManageMembers(shopId);
  if (!allowed) return { ok: false, error: "FORBIDDEN" };
  const { data: claims } = await supabase.auth.getClaims();
  const callerId = claims?.claims?.sub;
  if (!callerId || callerId === userId) return { ok: false, error: "FORBIDDEN" };

  const admin = createAdminClient();
  const [{ data: targetShops, error: targetError }, { data: managedShops, error: callerError }] =
    await Promise.all([
      admin.from("shop_members").select("shop_id, role").eq("user_id", userId),
      admin
        .from("shop_members")
        .select("shop_id")
        .eq("user_id", callerId)
        .in("role", ["owner", "admin"]),
    ]);
  if (targetError || callerError) return { ok: false, error: "UNKNOWN" };

  const inThisShop = targetShops?.find((m) => m.shop_id === shopId);
  if (!inThisShop) return { ok: false, error: "NOT_FOUND" };
  if (inThisShop.role === "owner") return { ok: false, error: "FORBIDDEN" };
  const managed = new Set((managedShops ?? []).map((m) => m.shop_id));
  if (targetShops!.some((m) => m.role === "owner" || !managed.has(m.shop_id))) {
    return { ok: false, error: "RESET_NOT_ALLOWED" };
  }

  const password = generatePassword(12);
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) return { ok: false, error: toErrorCode(error) };
  return { ok: true, data: { password } };
}
