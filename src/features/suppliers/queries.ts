import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Supplier, SupplierBalance, SupplierLot, SupplierPayment } from "./types";

const COLUMNS = "id, name, phone, address, notes, archived_at, created_at";

type Row = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
};

function toSupplier(row: Row): Supplier {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    address: row.address,
    notes: row.notes,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
  };
}

/** All suppliers of the shop, archived ones included (the list filters them). */
export async function listSuppliers(shopId: string): Promise<Supplier[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .select(COLUMNS)
    .eq("shop_id", shopId)
    .order("name");
  if (error) throw error;
  return (data ?? []).map(toSupplier);
}

export async function getSupplier(shopId: string, id: string): Promise<Supplier | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("suppliers")
    .select(COLUMNS)
    .eq("shop_id", shopId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toSupplier(data) : null;
}

/** Balances of every supplier (owner/admin only: the RPC refuses managers). */
export async function getSupplierBalances(
  shopId: string,
): Promise<Record<string, SupplierBalance>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_supplier_balances", { p_shop_id: shopId });
  if (error) throw error;
  return Object.fromEntries(
    (data ?? []).map((row) => [
      row.supplier_id,
      {
        due: row.due,
        paid: row.paid,
        balance: row.balance,
        qtyReceived: row.qty_received,
        qtySold: row.qty_sold,
        qtyReturned: row.qty_returned,
        qtyInStock: row.qty_in_stock,
      },
    ]),
  );
}

export async function getSupplierLots(supplierId: string): Promise<SupplierLot[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_supplier_lots", { p_supplier_id: supplierId });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    lotId: row.lot_id,
    receptionId: row.reception_id,
    productId: row.product_id,
    variantId: row.variant_id,
    receivedAt: row.received_at,
    qtyReceived: row.qty_received,
    qtySold: row.qty_sold,
    qtyReturned: row.qty_returned,
    qtyAvailable: row.qty_available,
    unitCost: row.unit_cost,
  }));
}

export async function listSupplierPayments(
  shopId: string,
  supplierId: string,
): Promise<SupplierPayment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("supplier_payments")
    .select("id, amount, method, paid_at, note, status, cancel_reason")
    .eq("shop_id", shopId)
    .eq("supplier_id", supplierId)
    .order("paid_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    amount: row.amount,
    method: row.method,
    paidAt: row.paid_at,
    note: row.note,
    status: row.status,
    cancelReason: row.cancel_reason,
  }));
}
