import { mkdirSync } from "node:fs";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/supabase/database.types";
import { createE2EUser, E2E_PASSWORD } from "./support/admin";

// Visual check of every screen at 375 / 768 / 1280 px, light and dark.
// On demand only: SCREENS=1 pnpm test:e2e screens  → PNG files in ./screens (git-ignored).
// Each capture also asserts there is no horizontal page scroll.
test.skip(!process.env.SCREENS, "visual capture runs on demand (SCREENS=1)");
test.setTimeout(10 * 60_000);

const OUT = "screens";
const WIDTHS = [375, 768, 1280] as const;
const THEMES = ["light", "dark"] as const;

const PUBLIC_ROUTES = ["/connexion", "/inscription"];
/** Shop routes, relative to /s/<slug>. */
const SHOP_ROUTES = ["", "/parametres", "/parametres/membres", "/ventes"];

async function seedShop() {
  const owner = await createE2EUser("screens", "Awa Diop");
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
    p_name: "Chez Awa Maroquinerie",
    p_whatsapp_phone: "+221771234567",
  });
  if (error) throw error;
  return { owner, slug: shop.slug };
}

async function signIn(page: Page, email: string) {
  await page.goto("/connexion");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(/\/s\//);
}

async function capture(page: Page, name: string) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300); // let entrance animations finish
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  expect.soft(overflow, `${name}: horizontal overflow`).toBeLessThanOrEqual(0);
}

async function newPage(browser: Browser, width: number, theme: (typeof THEMES)[number]) {
  const context = await browser.newContext({
    viewport: { width, height: width < 768 ? 812 : 900 },
    colorScheme: theme,
    deviceScaleFactor: 1,
  });
  return { context, page: await context.newPage() };
}

test("capture all screens", async ({ browser }) => {
  mkdirSync(OUT, { recursive: true });
  const { owner, slug } = await seedShop();

  for (const theme of THEMES) {
    for (const width of WIDTHS) {
      const { context, page } = await newPage(browser, width, theme);
      const suffix = `${theme}-${width}`;

      for (const route of PUBLIC_ROUTES) {
        await page.goto(route);
        await capture(page, `${route.slice(1)}-${suffix}`);
      }

      await signIn(page, owner.email);
      for (const route of SHOP_ROUTES) {
        await page.goto(`/s/${slug}${route}`);
        const name = route ? route.slice(1).replaceAll("/", "-") : "accueil";
        await capture(page, `${name}-${suffix}`);
      }

      if (width < 768) {
        await page.goto(`/s/${slug}`);
        await page.getByRole("button", { name: "Plus" }).click();
        await page.getByRole("dialog").waitFor();
        await capture(page, `menu-plus-${suffix}`);
      }

      await context.close();
    }
  }
});
