import { z } from "zod";
import { MAX_AMOUNT } from "@/lib/amount";
import { fr } from "@/messages/fr";

export const returnSchema = z.object({
  supplierId: z.uuid({ error: fr.returns.supplierPlaceholder }),
  returnedAt: z.iso.date(),
  /** Lines with 0 are kept in stock (not sent). */
  lines: z
    .array(z.object({ productId: z.uuid(), quantity: z.number().int().min(0).max(10_000) }))
    .refine((lines) => lines.some((line) => line.quantity > 0), {
      error: fr.returns.nothingToReturn,
    }),
  deliveryFee: z.number().int().min(0).max(MAX_AMOUNT).nullable(),
  note: z
    .string()
    .trim()
    .max(500)
    .transform((value) => (value === "" ? null : value)),
});
export type ReturnInput = z.input<typeof returnSchema>;
export type ReturnValues = z.output<typeof returnSchema>;
