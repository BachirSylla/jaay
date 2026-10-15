import { z } from "zod";
import { MAX_AMOUNT } from "@/lib/amount";
import { fr } from "@/messages/fr";

const amount = z.number().int().min(0).max(MAX_AMOUNT).nullable();

export const productSchema = z.object({
  name: z.string().trim().min(1, { error: fr.validation.required }).max(100),
  categoryId: z.uuid().nullable(),
  color: z
    .string()
    .trim()
    .max(40)
    .transform((value) => (value === "" ? null : value)),
  description: z
    .string()
    .trim()
    .max(2000)
    .transform((value) => (value === "" ? null : value)),
  suggestedPrice: amount,
  resellerPrice: amount,
  lowStockThreshold: z.number().int().min(0).max(999),
  isPublic: z.boolean(),
});
export type ProductInput = z.input<typeof productSchema>;
export type ProductValues = z.output<typeof productSchema>;

export const categoryNameSchema = z.string().trim().min(1).max(60);
