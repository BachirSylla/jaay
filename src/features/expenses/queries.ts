import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Expense } from "./types";

export async function listExpenses(shopId: string): Promise<Expense[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .select(
      "id, category, amount, spent_at, note, reception_id, return_id, status, cancel_reason, supplier:suppliers (name)",
    )
    .eq("shop_id", shopId)
    .order("spent_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    category: row.category,
    amount: row.amount,
    spentAt: row.spent_at,
    note: row.note,
    supplierName: row.supplier?.name ?? null,
    receptionId: row.reception_id,
    returnId: row.return_id,
    status: row.status,
    cancelReason: row.cancel_reason,
  }));
}
