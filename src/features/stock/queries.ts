import "server-only";
import type { ProductStock } from "@/features/catalog/types";
import { type VariantStock, variantKey } from "@/features/catalog/variants";
import { createClient } from "@/lib/supabase/server";

/** Available quantity and low-stock flag per product id (get_stock: no cost, all roles). */
export async function getStock(shopId: string): Promise<Record<string, ProductStock>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_stock", { p_shop_id: shopId });
  if (error) throw error;
  return Object.fromEntries(
    (data ?? []).map((row) => [
      row.product_id,
      { available: row.qty_available, isLow: row.is_low },
    ]),
  );
}

/** Bags available per product and color (get_variant_stock: no cost, all roles). */
export async function getVariantStock(shopId: string): Promise<VariantStock> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_variant_stock", { p_shop_id: shopId });
  if (error) throw error;
  const stock: VariantStock = {};
  for (const row of data ?? []) {
    (stock[row.product_id] ??= {})[variantKey(row.variant_id)] = row.qty_available;
  }
  return stock;
}
