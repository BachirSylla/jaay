import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ReturnSummary, SupplierStock } from "./types";

const RETURN_COLUMNS = `
  id, supplier_id, returned_at, note, status, cancel_reason, created_by,
  supplier:suppliers (name),
  items:return_items (product_id, quantity, product:products (name, color)),
  expenses:expenses (amount, status)
`;

type ReturnRow = {
  id: string;
  supplier_id: string;
  returned_at: string;
  note: string | null;
  status: ReturnSummary["status"];
  cancel_reason: string | null;
  created_by: string | null;
  supplier: { name: string } | null;
  items: {
    product_id: string;
    quantity: number;
    product: { name: string; color: string | null } | null;
  }[];
  expenses: { amount: number; status: string }[];
};

function toReturn(row: ReturnRow): ReturnSummary {
  // A return line is split by lot: merge them per product.
  const byProduct = new Map<string, ReturnSummary["items"][number]>();
  for (const item of row.items) {
    const current = byProduct.get(item.product_id);
    byProduct.set(item.product_id, {
      productId: item.product_id,
      productName: item.product?.name ?? "",
      productColor: item.product?.color ?? null,
      quantity: (current?.quantity ?? 0) + item.quantity,
    });
  }
  const items = [...byProduct.values()];
  return {
    id: row.id,
    supplierId: row.supplier_id,
    supplierName: row.supplier?.name ?? "",
    returnedAt: row.returned_at,
    note: row.note,
    status: row.status,
    cancelReason: row.cancel_reason,
    createdBy: row.created_by,
    bags: items.reduce((sum, item) => sum + item.quantity, 0),
    deliveryFee: row.expenses
      .filter((expense) => expense.status === "active")
      .reduce((sum, expense) => sum + expense.amount, 0),
    items,
  };
}

export async function listReturns(
  shopId: string,
  { supplierId }: { supplierId?: string } = {},
): Promise<ReturnSummary[]> {
  const supabase = await createClient();
  let query = supabase
    .from("returns")
    .select(RETURN_COLUMNS)
    .eq("shop_id", shopId)
    .order("returned_at", { ascending: false })
    .limit(300);
  if (supplierId) query = query.eq("supplier_id", supplierId);
  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as ReturnRow[]).map(toReturn);
}

export async function getReturn(shopId: string, id: string): Promise<ReturnSummary | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("returns")
    .select(RETURN_COLUMNS)
    .eq("shop_id", shopId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toReturn(data as ReturnRow) : null;
}

export async function getSupplierStock(shopId: string): Promise<SupplierStock> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_supplier_stock", { p_shop_id: shopId });
  if (error) throw error;
  const stock: SupplierStock = {};
  for (const row of data ?? []) (stock[row.supplier_id] ??= {})[row.product_id] = row.qty_available;
  return stock;
}
