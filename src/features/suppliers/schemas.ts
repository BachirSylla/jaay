import { z } from "zod";
import { optionalPhoneSchema } from "@/features/shop/schemas";
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
