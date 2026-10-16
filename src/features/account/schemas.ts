import { z } from "zod";
import { fullNameSchema, passwordSchema } from "@/features/auth/schemas";
import { optionalPhoneSchema } from "@/features/shop/schemas";
import { fr } from "@/messages/fr";

export const profileSchema = z.object({
  fullName: fullNameSchema,
  phone: optionalPhoneSchema,
});
export type ProfileInput = z.input<typeof profileSchema>;
export type ProfileValues = z.output<typeof profileSchema>;

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, { error: fr.validation.required }),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    error: fr.profile.passwordMismatch,
    path: ["confirmPassword"],
  });
export type PasswordChangeValues = z.infer<typeof passwordChangeSchema>;
