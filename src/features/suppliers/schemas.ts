import { z } from "zod";
import { optionalPhoneSchema } from "@/features/shop/schemas";
import { MAX_AMOUNT } from "@/lib/amount";
import { fr } from "@/messages/fr";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value));

export const supplierSchema = z.object({
  name: z.string().trim().min(1, { error: fr.validation.required }).max(100),
  phone: optionalPhoneSchema,
  address: optionalText(200),
  notes: optionalText(1000),
});
export type SupplierInput = z.input<typeof supplierSchema>;
export type SupplierValues = z.output<typeof supplierSchema>;

export const supplierPaymentSchema = z.object({
  // Empty while typing, required on submit.
  amount: z
    .number()
    .int()
    .min(1)
    .max(MAX_AMOUNT)
    .nullable()
    .refine((value) => value !== null, { error: fr.errors.INVALID_AMOUNT })
    .transform((value) => value as number),
  method: z.enum(["wave", "orange_money", "cash"]),
  paidAt: z.iso.date(),
  note: z
    .string()
    .trim()
    .max(500)
    .transform((value) => (value === "" ? null : value)),
  /** Sold bags paid (in full) by this payment. */
  items: z
    .array(z.object({ allocationId: z.uuid(), quantity: z.number().int().min(1).max(1000) }))
    .max(500),
});
export type SupplierPaymentInput = z.input<typeof supplierPaymentSchema>;
export type SupplierPaymentValues = z.output<typeof supplierPaymentSchema>;
