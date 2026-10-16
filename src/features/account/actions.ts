"use server";

import { refresh } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { type ActionResult, toErrorCode } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import {
  passwordChangeSchema,
  profileSchema,
  type PasswordChangeValues,
  type ProfileValues,
} from "./schemas";

export async function updateProfile(values: ProfileValues): Promise<ActionResult> {
  const parsed = profileSchema.safeParse({ ...values, phone: values.phone ?? "" });
  if (!parsed.success) return { ok: false, error: "VALIDATION" };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { ok: false, error: "FORBIDDEN" };

  // Column privileges: only full_name and phone are writable, and only one's own row (RLS).
  const { data, error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, phone: parsed.data.phone })
    .eq("id", userId)
    .select("id");
  if (error) return { ok: false, error: toErrorCode(error) };
  if (!data?.length) return { ok: false, error: "FORBIDDEN" };

  refresh();
  return { ok: true, data: undefined };
}

/**
 * Changes the signed-in user's password after checking the current one. The check signs
 * in on a separate, cookie-less client whose session is revoked right away, so the
 * browser session is untouched.
 */
export async function changePassword(values: PasswordChangeValues): Promise<ActionResult> {
  const parsed = passwordChangeSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "VALIDATION" };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  const email = typeof claims?.claims?.email === "string" ? claims.claims.email : null;
  if (!userId || !email) return { ok: false, error: "FORBIDDEN" };

  const verifier = createSupabaseClient<Database>(supabaseUrl(), supabasePublishableKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: wrong } = await verifier.auth.signInWithPassword({
    email,
    password: parsed.data.currentPassword,
  });
  if (wrong) {
    const code = toErrorCode(wrong);
    return { ok: false, error: code === "INVALID_CREDENTIALS" ? "WRONG_PASSWORD" : code };
  }
  await verifier.auth.signOut({ scope: "local" });

  const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
  if (error) {
    // "Secure password change" may ask for a recent sign-in: the current password was
    // just verified, so the change is applied with the secret key instead.
    if (error.code === "reauthentication_needed") {
      const { error: adminError } = await createAdminClient().auth.admin.updateUserById(userId, {
        password: parsed.data.newPassword,
      });
      if (adminError) return { ok: false, error: toErrorCode(adminError) };
      return { ok: true, data: undefined };
    }
    return { ok: false, error: toErrorCode(error) };
  }

  return { ok: true, data: undefined };
}
