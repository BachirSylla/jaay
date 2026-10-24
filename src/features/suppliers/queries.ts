import "server-only";
import { createClient } from "@/lib/supabase/server";
import { type CoveredLine, paymentCoverage } from "./payment-coverage";
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

export type PaymentReceipt = {
  supplier: Supplier;
  payment: SupplierPayment;
  lines: (CoveredLine & { name: string; color: string | null; photoPath: string | null })[];
  advance: number;
  /** At the payment date: bags sold at supplier price, total paid (this one included). */
  soldTotal: number;
  paidTotal: number;
};

/**
 * Data of a supplier payment receipt: the sold bags this payment pays for ("first sold, first
 * paid") and the account after it. Owner/admin only (allocations are not readable otherwise).
 */
export async function getPaymentReceipt(
  shopId: string,
  supplierId: string,
  paymentId: string,
): Promise<PaymentReceipt | null> {
  const supabase = await createClient();
  const [supplier, payments, allocationsResult] = await Promise.all([
    getSupplier(shopId, supplierId),
    listSupplierPayments(shopId, supplierId),
    supabase
      .from("sale_item_allocations")
      .select(
        "id, quantity, unit_cost, item:sale_items (product_id, variant_id, sale:sales (sold_at, number, status))",
      )
      .eq("shop_id", shopId)
      .eq("supplier_id", supplierId),
  ]);
  if (allocationsResult.error) throw allocationsResult.error;
  const payment = payments.find((p) => p.id === paymentId && p.status === "active");
  if (!supplier || !payment) return null;

  // Payments in the order they were made; sold bags in the order of the sales.
  const active = payments
    .filter((p) => p.status === "active")
    .sort((a, b) => a.paidAt.localeCompare(b.paidAt) || a.id.localeCompare(b.id));
  const index = active.findIndex((p) => p.id === paymentId);
  const paidBefore = active.slice(0, index).reduce((sum, p) => sum + p.amount, 0);

  const sold = (allocationsResult.data ?? [])
    .filter((row) => row.item?.sale?.status === "active")
    .sort(
      (a, b) =>
        a.item!.sale!.sold_at.localeCompare(b.item!.sale!.sold_at) ||
        a.item!.sale!.number - b.item!.sale!.number ||
        a.id.localeCompare(b.id),
    );
  const coverage = paymentCoverage(
    sold.map((row) => ({
      productId: row.item!.product_id,
      variantId: row.item!.variant_id,
      quantity: row.quantity,
      unitCost: row.unit_cost,
    })),
    paidBefore,
    payment.amount,
  );
  const soldTotal = sold
    .filter((row) => row.item!.sale!.sold_at <= payment.paidAt)
    .reduce((sum, row) => sum + row.quantity * row.unit_cost, 0);

  const productIds = [...new Set(coverage.lines.map((line) => line.productId))];
  const variantIds = [
    ...new Set(coverage.lines.map((line) => line.variantId).filter((id) => id !== null)),
  ];
  const [productsResult, variantsResult] = await Promise.all([
    productIds.length
      ? supabase
          .from("products")
          .select("id, name, color, photos:product_photos (storage_path, position)")
          .in("id", productIds)
      : Promise.resolve({ data: [], error: null }),
    variantIds.length
      ? supabase.from("product_variants").select("id, color").in("id", variantIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (productsResult.error) throw productsResult.error;
  if (variantsResult.error) throw variantsResult.error;
  const products = new Map((productsResult.data ?? []).map((p) => [p.id, p]));
  const colors = new Map((variantsResult.data ?? []).map((v) => [v.id, v.color]));

  return {
    supplier,
    payment,
    lines: coverage.lines.map((line) => {
      const product = products.get(line.productId);
      const color = line.variantId ? (colors.get(line.variantId) ?? null) : null;
      const cover = [...(product?.photos ?? [])].sort((a, b) => a.position - b.position)[0];
      return {
        ...line,
        name: [product?.name ?? "", color].filter(Boolean).join(" · "),
        color: color ?? product?.color ?? null,
        photoPath: cover?.storage_path ?? null,
      };
    }),
    advance: coverage.advance,
    soldTotal,
    paidTotal: paidBefore + payment.amount,
  };
}
