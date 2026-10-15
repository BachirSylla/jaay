"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LAST_SHOP_COOKIE } from "@/features/shop/constants";
import { resolveHomePath } from "@/features/shop/home-path";
import { type ActionResult, toErrorCode } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import {
  safeNextPath,
  signInSchema,
  signUpSchema,
  type SignInValues,
  type SignUpValues,
} from "./schemas";

// Server Actions: functions that run on the server and are called directly from forms.
// They validate again with the same Zod schema as the form (never trust the client).

export async function signUp(values: SignUpValues): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "VALIDATION" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.fullName } },
  });

  if (error) return { ok: false, error: toErrorCode(error) };
  // "Confirm email" must be disabled on the project: otherwise no session is returned.
  if (!data.session) return { ok: false, error: "EMAIL_CONFIRMATION_REQUIRED" };

  redirect("/bienvenue");
}

export async function signIn(values: SignInValues, next?: string): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "VALIDATION" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, error: toErrorCode(error) };

  const lastSlug = (await cookies()).get(LAST_SHOP_COOKIE)?.value;
  redirect(safeNextPath(next) ?? (await resolveHomePath(supabase, data.user.id, lastSlug)));
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}
