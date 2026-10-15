import { z } from "zod";
import { optionalPhoneSchema } from "@/features/shop/schemas";
import { fr } from "@/messages/fr";

export const CUSTOMER_TYPES = ["individual", "reseller"] as const;

export const customerSchema = z.object({
  name: z.string().trim().min(1, { error: fr.validation.required }).max(100),
  phone: optionalPhoneSchema,
  type: z.enum(CUSTOMER_TYPES),
  notes: z
    .string()
    .trim()
    .max(1000)
    .transform((value) => (value === "" ? null : value)),
});
export type CustomerInput = z.input<typeof customerSchema>;
export type CustomerValues = z.output<typeof customerSchema>;
