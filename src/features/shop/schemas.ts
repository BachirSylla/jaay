import { z } from "zod";
import { emailSchema, fullNameSchema, passwordSchema } from "@/features/auth/schemas";
import { ASSIGNABLE_ROLES } from "@/lib/permissions";
import { toE164 } from "@/lib/phone";
import { fr } from "@/messages/fr";

const v = fr.validation;

export const shopNameSchema = z
  .string()
  .trim()
  .min(1, { error: v.shopName })
  .max(60, { error: v.shopName });

/** Optional phone typed freely ("77 123 45 67"), stored in E.164 ("+221771234567"). */
export const optionalPhoneSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || toE164(value) !== null, { error: v.phone })
  .transform((value) => (value === "" ? null : toE164(value)));

export const createShopSchema = z.object({
  name: shopNameSchema,
  whatsappPhone: optionalPhoneSchema,
});
export type CreateShopInput = z.input<typeof createShopSchema>;
export type CreateShopValues = z.output<typeof createShopSchema>;

export const shopSettingsSchema = z.object({
  name: shopNameSchema,
  whatsappPhone: optionalPhoneSchema,
  showPublicPrices: z.boolean(),
  catalogEnabled: z.boolean(),
});
export type ShopSettingsInput = z.input<typeof shopSettingsSchema>;
export type ShopSettingsValues = z.output<typeof shopSettingsSchema>;

export const memberRoleSchema = z.enum(ASSIGNABLE_ROLES);

export const addMemberSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  password: passwordSchema,
  role: memberRoleSchema,
});
export type AddMemberInput = z.input<typeof addMemberSchema>;
export type AddMemberValues = z.output<typeof addMemberSchema>;

/** Readable temporary password: 10 characters without ambiguous ones (0/O, 1/l). */
export function generatePassword(length = 10): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const values = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
}
