import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Where a signed-in user lands: the last opened shop (cookie) if still a member,
 * otherwise their first shop, or the welcome screen when they have none.
 */
export async function resolveHomePath(
  supabase: SupabaseClient<Database>,
  userId: string,
  lastSlug: string | undefined,
): Promise<string> {
  const { data } = await supabase
    .from("shop_members")
    .select("created_at, shop:shops (slug)")
    .eq("user_id", userId)
    .order("created_at");

  const slugs = (data ?? []).flatMap((row) => (row.shop ? [row.shop.slug] : []));
  if (slugs.length === 0) return "/bienvenue";
  return `/s/${lastSlug && slugs.includes(lastSlug) ? lastSlug : slugs[0]}`;
}
