import { z } from "zod";
import { MAX_AMOUNT } from "@/lib/amount";
import { fr } from "@/messages/fr";

export const EXPENSE_CATEGORIES = ["delivery", "packaging", "advertising", "other"] as const;

export const expenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  amount: z
    .number()
    .int()
    .min(1)
    .max(MAX_AMOUNT)
    .nullable()
    .refine((value) => value !== null, { error: fr.errors.INVALID_AMOUNT })
    .transform((value) => value as number),
  spentAt: z.iso.date(),
  supplierId: z.uuid().nullable(),
  note: z
    .string()
    .trim()
    .max(500)
    .transform((value) => (value === "" ? null : value)),
});
export type ExpenseInput = z.input<typeof expenseSchema>;
export type ExpenseValues = z.output<typeof expenseSchema>;
