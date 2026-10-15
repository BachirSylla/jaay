import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ReceptionLine, ReceptionSummary } from "./types";

export async function getReceptions(shopId: string): Promise<ReceptionSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_receptions", { p_shop_id: shopId });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    supplierId: row.supplier_id,
    supplierName: row.supplier_name,
    receivedAt: row.received_at,
    note: row.note,
    status: row.status,
    cancelReason: row.cancel_reason,
    totalQty: row.total_qty,
    totalCost: row.total_cost,
    deliveryFee: row.delivery_fee,
    createdByName: row.created_by_name,
  }));
}

export async function getReceptionLines(receptionId: string): Promise<ReceptionLine[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_reception_lines", {
    p_reception_id: receptionId,
  });
  if (error) throw error;
  const lines = data ?? [];
  if (lines.length === 0) return [];

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, name, color, photos:product_photos (storage_path, position)")
    .in("id", [...new Set(lines.map((line) => line.product_id))]);
  if (productsError) throw productsError;
  const byId = new Map((products ?? []).map((product) => [product.id, product]));

  return lines.map((line) => {
    const product = byId.get(line.product_id);
    const cover = [...(product?.photos ?? [])].sort((a, b) => a.position - b.position)[0];
    return {
      lotId: line.lot_id,
      productId: line.product_id,
      productName: product?.name ?? "",
      productColor: product?.color ?? null,
      photoPath: cover?.storage_path ?? null,
      qtyReceived: line.qty_received,
      qtySold: line.qty_sold,
      qtyReturned: line.qty_returned,
      unitCost: line.unit_cost,
    };
  });
}

/**
 * Last supplier price of each product (most recent lot), to pre-fill a new reception.
 * Owner/admin only: lots are not readable by managers (RLS), the result is then empty.
 */
export async function getLatestCosts(shopId: string): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lots")
    .select("product_id, unit_cost, received_at")
    .eq("shop_id", shopId)
    .order("received_at", { ascending: false })
    .limit(1000);
  if (error) throw error;
  const costs: Record<string, number> = {};
  for (const lot of data ?? []) costs[lot.product_id] ??= lot.unit_cost;
  return costs;
}
