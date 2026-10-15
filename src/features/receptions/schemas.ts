import { z } from "zod";
import { MAX_AMOUNT } from "@/lib/amount";
import { fr } from "@/messages/fr";

export const receptionLineSchema = z.object({
  productId: z.uuid(),
  quantity: z.number().int().min(1).max(10_000),
  unitCost: z
    .number({ error: fr.receptions.missingCost })
    .int()
    .min(0)
    .max(MAX_AMOUNT)
    .nullable()
    .refine((value) => value !== null, { error: fr.receptions.missingCost }),
});

export const receptionSchema = z.object({
  supplierId: z.uuid({ error: fr.receptions.supplierPlaceholder }),
  receivedAt: z.iso.date(),
  lines: z.array(receptionLineSchema).min(1, { error: fr.receptions.noLines }).max(100),
  deliveryFee: z.number().int().min(0).max(MAX_AMOUNT).nullable(),
  note: z
    .string()
    .trim()
    .max(500)
    .transform((value) => (value === "" ? null : value)),
});
export type ReceptionInput = z.input<typeof receptionSchema>;
export type ReceptionValues = z.output<typeof receptionSchema>;

export const cancelReasonSchema = z.string().trim().min(3).max(200);
