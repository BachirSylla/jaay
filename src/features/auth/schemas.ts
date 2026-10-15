import { z } from "zod";
import { fr } from "@/messages/fr";

const v = fr.validation;

export const fullNameSchema = z.string().trim().min(2, { error: v.fullName }).max(80, {
  error: v.fullName,
});
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: v.email }));
export const passwordSchema = z.string().min(8, { error: v.password }).max(72, {
  error: v.password,
});

export const signUpSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  password: passwordSchema,
});
export type SignUpValues = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: v.required }),
});
export type SignInValues = z.infer<typeof signInSchema>;

/** Only internal app paths are allowed as post-login destinations (no open redirect). */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith("/s/") && next !== "/bienvenue") return null;
  if (next.startsWith("//") || next.includes("\\")) return null;
  return next;
}
