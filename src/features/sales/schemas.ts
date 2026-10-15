import { z } from "zod";
import { MAX_AMOUNT } from "@/lib/amount";
import { fr } from "@/messages/fr";

export const SALE_CHANNELS = [
  "whatsapp",
  "instagram",
  "facebook",
  "tiktok",
  "in_person",
  "other",
] as const;
/** Payment methods offered at checkout ("other" exists in the database but is not proposed). */
export const PAYMENT_METHODS = ["wave", "orange_money", "cash"] as const;

const amount = z.number().int().min(0).max(MAX_AMOUNT);

export const saleLineSchema = z.object({
  productId: z.uuid(),
  quantity: z.number().int().min(1).max(1000),
  unitPrice: amount.nullable().refine((value) => value !== null, { error: fr.validation.required }),
});

export const salePaymentSchema = z.object({
  method: z.enum(PAYMENT_METHODS),
  amount: amount.min(1),
});

export const saleSchema = z
  .object({
    customerId: z.uuid().nullable(),
    customerType: z.enum(["individual", "reseller"]),
    channel: z.enum(SALE_CHANNELS),
    soldAt: z.iso.date(),
    lines: z.array(saleLineSchema).min(1, { error: fr.sales.noLines }).max(50),
    payments: z.array(salePaymentSchema).min(1).max(2),
    note: z
      .string()
      .trim()
      .max(500)
      .transform((value) => (value === "" ? null : value)),
  })
  .refine(
    (sale) =>
      new Set(sale.payments.map((p) => p.method)).size === sale.payments.length &&
      sale.payments.reduce((sum, p) => sum + p.amount, 0) === saleTotal(sale.lines),
    { error: fr.sales.paymentMismatch, path: ["payments"] },
  );
export type SaleInput = z.input<typeof saleSchema>;
export type SaleValues = z.output<typeof saleSchema>;

export function saleTotal(lines: { quantity: number; unitPrice: number | null }[]): number {
  return lines.reduce((sum, line) => sum + line.quantity * (line.unitPrice ?? 0), 0);
}
