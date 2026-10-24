"use server";

import { refresh } from "next/cache";
import { variantIdOf } from "@/features/catalog/variants";
import { cancelReasonSchema } from "@/features/receptions/schemas";
import { type ActionResult, toErrorCode } from "@/lib/errors";
import { businessDateToTimestamp } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";
import { returnSchema, type ReturnValues } from "./schemas";

export async function createReturn(
  shopId: string,
  values: ReturnValues,
): Promise<ActionResult<{ id: string }>> {
  const parsed = returnSchema.safeParse({ ...values, note: values.note ?? "" });
  if (!parsed.success || !isUuid(shopId)) return { ok: false, error: "VALIDATION" };
  const { supplierId, returnedAt, lines, deliveryFee, note } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_return", {
    p_shop_id: shopId,
    p_supplier_id: supplierId,
    p_returned_at: businessDateToTimestamp(returnedAt),
    p_items: lines
      .filter((line) => line.quantity > 0)
      .map((line) => ({
        product_id: line.productId,
        variant_id: variantIdOf(line.variantKey),
        quantity: line.quantity,
      })),
    p_delivery_fee: deliveryFee ?? 0,
    p_note: note ?? undefined,
  });
  if (error || !data) return { ok: false, error: toErrorCode(error) };
  return { ok: true, data: { id: data } };
}

export async function cancelReturn(returnId: string, reason: string): Promise<ActionResult> {
  const parsed = cancelReasonSchema.safeParse(reason);
  if (!parsed.success) return { ok: false, error: "REASON_REQUIRED" };
  if (!isUuid(returnId)) return { ok: false, error: "VALIDATION" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_return", {
    p_return_id: returnId,
    p_reason: parsed.data,
  });
  if (error) return { ok: false, error: toErrorCode(error) };

  refresh();
  return { ok: true, data: undefined };
}
