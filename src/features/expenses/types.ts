import type { Database } from "@/lib/supabase/database.types";

export type ExpenseCategory = Database["public"]["Enums"]["expense_category"];

export type Expense = {
  id: string;
  category: ExpenseCategory;
  amount: number;
  spentAt: string;
  note: string | null;
  supplierName: string | null;
  receptionId: string | null;
  returnId: string | null;
  status: Database["public"]["Enums"]["op_status"];
  cancelReason: string | null;
};
