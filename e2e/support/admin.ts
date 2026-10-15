import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/supabase/database.types";

/** E2E accounts all use this prefix, so that teardown only ever deletes test data. */
export const E2E_EMAIL_PREFIX = "jaay-e2e-";
export const E2E_EMAIL_DOMAIN = "example.com";
export const E2E_PASSWORD = "e2e-motdepasse";

export function e2eEmail(label: string): string {
  const unique = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return `${E2E_EMAIL_PREFIX}${label}-${unique}@${E2E_EMAIL_DOMAIN}`;
}

export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("E2E needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY");
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function createE2EUser(label: string, fullName: string) {
  const email = e2eEmail(label);
  const { data, error } = await adminClient().auth.admin.createUser({
    email,
    password: E2E_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw error;
  return { id: data.user.id, email };
}

/** Deletes the shops owned by E2E accounts, then the accounts themselves. */
export async function deleteE2EData() {
  const admin = adminClient();
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, email")
    .like("email", `${E2E_EMAIL_PREFIX}%@${E2E_EMAIL_DOMAIN}`);
  if (error) throw error;
  const ids = (profiles ?? []).map((profile) => profile.id);
  if (ids.length === 0) return;

  const { data: owned } = await admin
    .from("shop_members")
    .select("shop_id")
    .eq("role", "owner")
    .in("user_id", ids);
  const shopIds = (owned ?? []).map((row) => row.shop_id);
  if (shopIds.length) {
    // Photos live in Storage under <shop_id>/<product_id>/: remove them before the shops.
    for (const shopId of shopIds) {
      const bucket = admin.storage.from("product-photos");
      const { data: folders } = await bucket.list(shopId);
      for (const folder of folders ?? []) {
        const { data: files } = await bucket.list(`${shopId}/${folder.name}`);
        const paths = (files ?? []).map((file) => `${shopId}/${folder.name}/${file.name}`);
        if (paths.length) await bucket.remove(paths);
      }
    }
    await admin.from("shops").delete().in("id", shopIds);
  }

  for (const id of ids) await admin.auth.admin.deleteUser(id);
}

/** Owner account + shop created through create_shop (as the owner), for e2e journeys. */
export async function seedOwnerShop(label: string, fullName: string, shopName: string) {
  const owner = await createE2EUser(label, fullName);
  const client = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { error: signInError } = await client.auth.signInWithPassword({
    email: owner.email,
    password: E2E_PASSWORD,
  });
  if (signInError) throw signInError;
  const { data: shop, error } = await client.rpc("create_shop", {
    p_name: shopName,
    p_whatsapp_phone: "+221771234567",
  });
  if (error) throw error;
  return { owner, shop, client };
}
