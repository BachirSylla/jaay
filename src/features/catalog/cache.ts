import "server-only";
import { updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export function catalogTag(slug: string): string {
  return `catalog:${slug}`;
}

/**
 * Expires the cached public catalog of a shop (call from Server Actions that change what
 * visitors see: settings, logo, products, photos). Stock moves refresh within a minute.
 */
export async function refreshPublicCatalog(shopId: string): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase.from("shops").select("slug").eq("id", shopId).maybeSingle();
  if (data) updateTag(catalogTag(data.slug));
}
