// Demo account and shop on the DEV project, to try Jaay with realistic data.
// Usage: DEMO_EMAIL=... DEMO_PASSWORD=... pnpm db:seed   (values can also live in .env.local)
// Run with: node --experimental-strip-types scripts/seed-demo.ts
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types.ts";
import {
  seedDemoAccount,
  seedDemoData,
  seedDemoSales,
  seedDemoStock,
} from "../e2e/support/demo-data.ts";

const DEV_PROJECT_REF = "bixrtirfupirfbljsszu";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const linkedRef = existsSync("supabase/.temp/project-ref")
  ? readFileSync("supabase/.temp/project-ref", "utf8").trim()
  : "";
if (linkedRef !== DEV_PROJECT_REF) {
  console.error(
    `Refusing to seed: linked project is "${linkedRef}", expected dev "${DEV_PROJECT_REF}".`,
  );
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const email = process.env.DEMO_EMAIL;
const password = process.env.DEMO_PASSWORD;
if (!url || !publishableKey || !secretKey || !email || !password || password.length < 8) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY, " +
      "DEMO_EMAIL or DEMO_PASSWORD (8 characters minimum).",
  );
  process.exit(1);
}

const admin = createClient<Database>(url, secretKey, { auth: { persistSession: false } });
const { error: createError } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: "Awa Diop" },
});
if (createError) {
  console.error(`Cannot create ${email}: ${createError.message}`);
  console.error("The demo account probably exists already: sign in with it.");
  process.exit(1);
}

const client = createClient<Database>(url, publishableKey, { auth: { persistSession: false } });
const { error: signInError } = await client.auth.signInWithPassword({ email, password });
if (signInError) throw signInError;

const { data: shop, error: shopError } = await client.rpc("create_shop", {
  p_name: "Chez Awa Maroquinerie",
  p_whatsapp_phone: "+221771234567",
});
if (shopError) throw shopError;

const demo = await seedDemoData(client, shop.id);
await seedDemoStock(client, shop.id, demo);
await seedDemoSales(client, shop.id, demo);
await seedDemoAccount(client, shop.id, demo);

console.log(`Demo ready: sign in as ${email} → /s/${shop.slug}  (catalog: /b/${shop.slug})`);
