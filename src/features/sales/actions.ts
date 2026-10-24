"use server";

import { refresh } from "next/cache";
import { variantIdOf, variantKey } from "@/features/catalog/variants";
import { cancelReasonSchema } from "@/features/receptions/schemas";
import { type ActionResult, toErrorCode } from "@/lib/errors";
import { businessDateToTimestamp } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";
import { saleSchema, type SaleValues } from "./schemas";

export type CreateSaleResult = ActionResult<{ id: string; number: number }> & {
  /** On INSUFFICIENT_STOCK: model and color concerned, and bags really available. */
  stock?: { productId: string; variantKey: string; available: number };
};

export async function createSale(shopId: string, values: SaleValues): Promise<CreateSaleResult> {
  const parsed = saleSchema.safeParse({ ...values, note: values.note ?? "" });
  if (!parsed.success || !isUuid(shopId)) return { ok: false, error: "VALIDATION" };
  const sale = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_sale", {
    p_shop_id: shopId,
    p_customer_id: sale.customerId as string,
    p_customer_type: sale.customerType,
    p_channel: sale.channel,
    p_sold_at: businessDateToTimestamp(sale.soldAt),
    p_items: sale.lines.map((line) => ({
      product_id: line.productId,
      variant_id: variantIdOf(line.variantKey),
      quantity: line.quantity,
      unit_price: line.unitPrice,
    })),
    p_payments: sale.payments,
    p_note: sale.note ?? undefined,
  });

  if (error || !data) {
    const code = toErrorCode(error);
    if (code === "INSUFFICIENT_STOCK" && error?.details) {
      try {
        const details = JSON.parse(error.details) as {
          product_id: string;
          variant_id?: string | null;
          available: number;
        };
        return {
          ok: false,
          error: code,
          stock: {
            productId: details.product_id,
            variantKey: variantKey(details.variant_id),
            available: details.available,
          },
        };
      } catch {
        // Fall back to the generic message.
      }
    }
    return { ok: false, error: code };
  }

  return { ok: true, data: { id: data.id, number: data.number } };
}

export async function cancelSale(saleId: string, reason: string): Promise<ActionResult> {
  const parsed = cancelReasonSchema.safeParse(reason);
  if (!parsed.success) return { ok: false, error: "REASON_REQUIRED" };
  if (!isUuid(saleId)) return { ok: false, error: "VALIDATION" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_sale", { p_sale_id: saleId, p_reason: parsed.data });
  if (error) return { ok: false, error: toErrorCode(error) };

  refresh();
  return { ok: true, data: undefined };
}
