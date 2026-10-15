"use server";

import { refresh } from "next/cache";
import { cancelReasonSchema } from "@/features/receptions/schemas";
import { type ActionResult, toErrorCode } from "@/lib/errors";
import { businessDateToTimestamp } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";
import { expenseSchema, type ExpenseValues } from "./schemas";

export async function createExpense(shopId: string, values: ExpenseValues): Promise<ActionResult> {
  const parsed = expenseSchema.safeParse({ ...values, note: values.note ?? "" });
  if (!parsed.success || !isUuid(shopId)) return { ok: false, error: "VALIDATION" };

  // Direct insert (RLS: members), only business columns are writable.
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").insert({
    shop_id: shopId,
    category: parsed.data.category,
    amount: parsed.data.amount,
    spent_at: businessDateToTimestamp(parsed.data.spentAt),
    supplier_id: parsed.data.supplierId,
    note: parsed.data.note,
  });
  if (error) return { ok: false, error: toErrorCode(error) };

  refresh();
  return { ok: true, data: undefined };
}

export async function cancelExpense(expenseId: string, reason: string): Promise<ActionResult> {
  const parsed = cancelReasonSchema.safeParse(reason);
  if (!parsed.success) return { ok: false, error: "REASON_REQUIRED" };
  if (!isUuid(expenseId)) return { ok: false, error: "VALIDATION" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_expense", {
    p_expense_id: expenseId,
    p_reason: parsed.data,
  });
  if (error) return { ok: false, error: toErrorCode(error) };

  refresh();
  return { ok: true, data: undefined };
}
