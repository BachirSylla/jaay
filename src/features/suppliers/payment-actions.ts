"use server";

import { refresh } from "next/cache";
import { cancelReasonSchema } from "@/features/receptions/schemas";
import { type ActionResult, toErrorCode } from "@/lib/errors";
import { businessDateToTimestamp } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";
import { supplierPaymentSchema, type SupplierPaymentValues } from "./schemas";

export async function createSupplierPayment(
  shopId: string,
  supplierId: string,
  values: SupplierPaymentValues,
): Promise<ActionResult> {
  const parsed = supplierPaymentSchema.safeParse({ ...values, note: values.note ?? "" });
  if (!parsed.success || !isUuid(shopId) || !isUuid(supplierId)) {
    return { ok: false, error: "VALIDATION" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_supplier_payment", {
    p_shop_id: shopId,
    p_supplier_id: supplierId,
    p_amount: parsed.data.amount,
    p_method: parsed.data.method,
    p_paid_at: businessDateToTimestamp(parsed.data.paidAt),
    p_note: parsed.data.note ?? undefined,
  });
  if (error) return { ok: false, error: toErrorCode(error) };

  refresh();
  return { ok: true, data: undefined };
}

export async function cancelSupplierPayment(
  paymentId: string,
  reason: string,
): Promise<ActionResult> {
  const parsed = cancelReasonSchema.safeParse(reason);
  if (!parsed.success) return { ok: false, error: "REASON_REQUIRED" };
  if (!isUuid(paymentId)) return { ok: false, error: "VALIDATION" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_supplier_payment", {
    p_payment_id: paymentId,
    p_reason: parsed.data,
  });
  if (error) return { ok: false, error: toErrorCode(error) };

  refresh();
  return { ok: true, data: undefined };
}
