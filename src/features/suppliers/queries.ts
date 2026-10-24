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

/** Bags of one sale line sold from this supplier's lots, at supplier price. */
export type SoldBagLine = {
  allocationId: string;
  saleNumber: number;
  soldAt: string;
  productId: string;
  /** "Model · Color". */
  name: string;
  color: string | null;
  photoPath: string | null;
  unitCost: number;
  /** Bags of the line not paid to the supplier yet. */
  unpaid: number;
};

type AllocationRow = {
  id: string;
  quantity: number;
  unit_cost: number;
  item: {
    product_id: string;
    product: {
      name: string;
      color: string | null;
      photos: { storage_path: string; position: number }[];
    } | null;
    variant: { color: string } | null;
    sale: { sold_at: string; number: number; status: string } | null;
  } | null;
};

const ALLOCATION_COLUMNS = `
  id, quantity, unit_cost,
  item:sale_items (
    product_id,
    product:products (name, color, photos:product_photos (storage_path, position)),
    variant:product_variants (color),
    sale:sales (sold_at, number, status)
  )
`;

function describe(row: AllocationRow) {
  const product = row.item?.product;
  const color = row.item?.variant?.color ?? null;
  const cover = [...(product?.photos ?? [])].sort((a, b) => a.position - b.position)[0];
  return {
    productId: row.item?.product_id ?? "",
    name: [product?.name ?? "", color].filter(Boolean).join(" · "),
    color: color ?? product?.color ?? null,
    photoPath: cover?.storage_path ?? null,
  };
}

/** Sold bags of a supplier not paid yet, oldest sale first (owner/admin: RLS). */
export async function getUnpaidBags(shopId: string, supplierId: string): Promise<SoldBagLine[]> {
  const supabase = await createClient();
  const [allocations, paidItems] = await Promise.all([
    supabase
      .from("sale_item_allocations")
      .select(ALLOCATION_COLUMNS)
      .eq("shop_id", shopId)
      .eq("supplier_id", supplierId),
    supabase
      .from("supplier_payment_items")
      .select("allocation_id, quantity, payment:supplier_payments (status, supplier_id)")
      .eq("shop_id", shopId),
  ]);
  if (allocations.error) throw allocations.error;
  if (paidItems.error) throw paidItems.error;

  const paid = new Map<string, number>();
  for (const item of paidItems.data ?? []) {
    if (item.payment?.status !== "active" || item.payment.supplier_id !== supplierId) continue;
    paid.set(item.allocation_id, (paid.get(item.allocation_id) ?? 0) + item.quantity);
  }

  return ((allocations.data ?? []) as AllocationRow[])
    .filter((row) => row.item?.sale?.status === "active")
    .map((row) => ({
      allocationId: row.id,
      saleNumber: row.item!.sale!.number,
      soldAt: row.item!.sale!.sold_at,
      ...describe(row),
      unitCost: row.unit_cost,
      unpaid: row.quantity - (paid.get(row.id) ?? 0),
    }))
    .filter((line) => line.unpaid > 0)
    .sort((a, b) => a.soldAt.localeCompare(b.soldAt) || a.saleNumber - b.saleNumber);
}

export type PaymentReceiptLine = {
  key: string;
  name: string;
  color: string | null;
  photoPath: string | null;
  unitCost: number;
  bags: number;
  amount: number;
};

export type PaymentReceipt = {
  supplier: Supplier;
  payment: SupplierPayment;
  /** Bags this payment pays for, grouped by model, color and supplier price. */
  lines: PaymentReceiptLine[];
  /** Part of the payment not tied to bags. */
  advance: number;
  /** At the payment date: bags sold at supplier price, total paid (this one included). */
  soldTotal: number;
  paidTotal: number;
};

/** Data of a supplier payment receipt (owner/admin only: RLS). */
export async function getPaymentReceipt(
  shopId: string,
  supplierId: string,
  paymentId: string,
): Promise<PaymentReceipt | null> {
  const supabase = await createClient();
  const [supplier, payments, items, sold] = await Promise.all([
    getSupplier(shopId, supplierId),
    listSupplierPayments(shopId, supplierId),
    supabase
      .from("supplier_payment_items")
      .select(`quantity, amount, allocation:sale_item_allocations (${ALLOCATION_COLUMNS})`)
      .eq("shop_id", shopId)
      .eq("payment_id", paymentId),
    supabase
      .from("sale_item_allocations")
      .select("quantity, unit_cost, item:sale_items (sale:sales (sold_at, status))")
      .eq("shop_id", shopId)
      .eq("supplier_id", supplierId),
  ]);
  if (items.error) throw items.error;
  if (sold.error) throw sold.error;
  const payment = payments.find((p) => p.id === paymentId && p.status === "active");
  if (!supplier || !payment) return null;

  const lines = new Map<string, PaymentReceiptLine>();
  for (const item of items.data ?? []) {
    const allocation = item.allocation as unknown as AllocationRow | null;
    if (!allocation) continue;
    const bag = describe(allocation);
    const key = `${bag.name}:${allocation.unit_cost}`;
    const line = lines.get(key) ?? {
      key,
      name: bag.name,
      color: bag.color,
      photoPath: bag.photoPath,
      unitCost: allocation.unit_cost,
      bags: 0,
      amount: 0,
    };
    line.bags += item.quantity;
    line.amount += item.amount;
    lines.set(key, line);
  }
  const covered = [...lines.values()].reduce((sum, line) => sum + line.amount, 0);

  const soldTotal = (sold.data ?? [])
    .filter((row) => row.item?.sale?.status === "active" && row.item.sale.sold_at <= payment.paidAt)
    .reduce((sum, row) => sum + row.quantity * row.unit_cost, 0);
  const paidTotal = payments
    .filter((p) => p.status === "active" && p.paidAt <= payment.paidAt)
    .reduce((sum, p) => sum + p.amount, 0);

  return {
    supplier,
    payment,
    lines: [...lines.values()],
    advance: payment.amount - covered,
    soldTotal,
    paidTotal,
  };
}
