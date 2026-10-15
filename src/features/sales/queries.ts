import "server-only";
import type { FifoLot } from "@/lib/fifo";
import { createClient } from "@/lib/supabase/server";
import type { Sale } from "./types";

// RLS decides which sales come back (a manager only gets theirs) and whether the
// allocations (costs) are readable (owner/admin only).
const SALE_COLUMNS = `
  id, number, sold_at, customer_id, customer_type, channel, total_amount, note, status,
  cancel_reason, created_by,
  customer:customers (name, phone),
  items:sale_items (
    id, product_id, quantity, unit_price, line_total,
    product:products (name, color, photos:product_photos (storage_path, position)),
    allocations:sale_item_allocations (quantity, unit_cost)
  ),
  payments:sale_payments (method, amount)
`;

type SaleRow = {
  id: string;
  number: number;
  sold_at: string;
  customer_id: string | null;
  customer_type: Sale["customerType"];
  channel: Sale["channel"];
  total_amount: number;
  note: string | null;
  status: Sale["status"];
  cancel_reason: string | null;
  created_by: string | null;
  customer: { name: string; phone: string | null } | null;
  items: {
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    product: {
      name: string;
      color: string | null;
      photos: { storage_path: string; position: number }[];
    } | null;
    allocations: { quantity: number; unit_cost: number }[];
  }[];
  payments: { method: Sale["payments"][number]["method"]; amount: number }[];
};

function toSale(row: SaleRow, withCosts: boolean): Sale {
  const lines = row.items.map((item) => {
    const cover = [...(item.product?.photos ?? [])].sort((a, b) => a.position - b.position)[0];
    const cost = item.allocations.reduce((sum, a) => sum + a.quantity * a.unit_cost, 0);
    return {
      id: item.id,
      productId: item.product_id,
      productName: item.product?.name ?? "",
      productColor: item.product?.color ?? null,
      photoPath: cover?.storage_path ?? null,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      lineTotal: item.line_total,
      cost: withCosts ? cost : null,
    };
  });
  const cost = withCosts ? lines.reduce((sum, line) => sum + (line.cost ?? 0), 0) : null;

  return {
    id: row.id,
    number: row.number,
    soldAt: row.sold_at,
    customerId: row.customer_id,
    customerName: row.customer?.name ?? null,
    customerPhone: row.customer?.phone ?? null,
    customerType: row.customer_type,
    channel: row.channel,
    totalAmount: row.total_amount,
    note: row.note,
    status: row.status,
    cancelReason: row.cancel_reason,
    createdBy: row.created_by,
    lines,
    payments: row.payments,
    cost,
    margin: cost === null ? null : row.total_amount - cost,
    bags: lines.reduce((sum, line) => sum + line.quantity, 0),
  };
}

export async function listSales(
  shopId: string,
  { from, customerId, withCosts }: { from?: Date; customerId?: string; withCosts: boolean },
): Promise<Sale[]> {
  const supabase = await createClient();
  let query = supabase
    .from("sales")
    .select(SALE_COLUMNS)
    .eq("shop_id", shopId)
    .order("sold_at", { ascending: false })
    .limit(500);
  if (from) query = query.gte("sold_at", from.toISOString());
  if (customerId) query = query.eq("customer_id", customerId);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as SaleRow[]).map((row) => toSale(row, withCosts));
}

export async function getSale(
  shopId: string,
  id: string,
  withCosts: boolean,
): Promise<Sale | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales")
    .select(SALE_COLUMNS)
    .eq("shop_id", shopId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toSale(data as SaleRow, withCosts) : null;
}

/** Number the next sale will probably get (shown on the new sale screen). */
export async function getNextSaleNumber(shopId: string): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shops")
    .select("next_sale_number")
    .eq("id", shopId)
    .maybeSingle();
  return data?.next_sale_number ?? 1;
}

/**
 * Available lots per product in FIFO order, to estimate the margin while selling.
 * Owner/admin only (lots are not readable by managers: the result is then empty).
 */
export async function getFifoLots(shopId: string): Promise<Record<string, FifoLot[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lots")
    .select("product_id, qty_available, unit_cost, received_at, id, reception:receptions (status)")
    .eq("shop_id", shopId)
    .gt("qty_available", 0)
    .order("received_at")
    .order("id");
  if (error) throw error;
  const lots: Record<string, FifoLot[]> = {};
  for (const lot of data ?? []) {
    if (lot.reception?.status !== "active") continue;
    (lots[lot.product_id] ??= []).push({
      available: lot.qty_available ?? 0,
      unitCost: lot.unit_cost,
    });
  }
  return lots;
}

export async function getCustomerStats(
  shopId: string,
): Promise<
  Record<string, { purchases: number; totalSpent: number; lastPurchaseAt: string | null }>
> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_customer_stats", { p_shop_id: shopId });
  if (error) throw error;
  return Object.fromEntries(
    (data ?? []).map((row) => [
      row.customer_id,
      {
        purchases: row.purchases,
        totalSpent: row.total_spent,
        lastPurchaseAt: row.last_purchase_at,
      },
    ]),
  );
}
