"use server";

import { refresh } from "next/cache";
import { type ActionResult, toErrorCode } from "@/lib/errors";
import { businessDateToTimestamp } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";
import { cancelReasonSchema, receptionSchema, type ReceptionValues } from "./schemas";

export async function createReception(
  shopId: string,
  values: ReceptionValues,
): Promise<ActionResult<{ id: string }>> {
  const parsed = receptionSchema.safeParse({ ...values, note: values.note ?? "" });
  if (!parsed.success || !isUuid(shopId)) return { ok: false, error: "VALIDATION" };
  const { supplierId, receivedAt, lines, deliveryFee, note } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_reception", {
    p_shop_id: shopId,
    p_supplier_id: supplierId,
    p_received_at: businessDateToTimestamp(receivedAt),
    p_items: lines.map((line) => ({
      product_id: line.productId,
      quantity: line.quantity,
      unit_cost: line.unitCost,
    })),
    p_delivery_fee: deliveryFee ?? 0,
    p_note: note ?? undefined,
  });
  if (error || !data) return { ok: false, error: toErrorCode(error) };

  return { ok: true, data: { id: data } };
}

export async function cancelReception(receptionId: string, reason: string): Promise<ActionResult> {
  const parsed = cancelReasonSchema.safeParse(reason);
  if (!parsed.success) return { ok: false, error: "REASON_REQUIRED" };
  if (!isUuid(receptionId)) return { ok: false, error: "VALIDATION" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_reception", {
    p_reception_id: receptionId,
    p_reason: parsed.data,
  });
  if (error) return { ok: false, error: toErrorCode(error) };

  refresh();
  return { ok: true, data: undefined };
}
