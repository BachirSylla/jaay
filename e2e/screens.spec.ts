import { mkdirSync } from "node:fs";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { E2E_PASSWORD, seedOwnerShop } from "./support/admin";
import { seedDemoData, seedDemoStock } from "./support/demo-data";

// Visual check of every screen at 375 / 768 / 1280 px, light and dark.
// On demand only:  SCREENS=1 pnpm exec playwright test screens --project=desktop
// Optional filter: SCREENS_ONLY=stock,clients  (route name contains one of the words).
// PNG files go to ./screens (git-ignored). Each capture asserts there is no horizontal scroll.
test.skip(!process.env.SCREENS, "visual capture runs on demand (SCREENS=1)");
test.setTimeout(15 * 60_000);

const OUT = "screens";
const WIDTHS = [375, 768, 1280] as const;
const THEMES = ["light", "dark"] as const;
const ONLY = (process.env.SCREENS_ONLY ?? "").split(",").filter(Boolean);

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

const wanted = (name: string) => ONLY.length === 0 || ONLY.some((word) => name.includes(word));

test("capture all screens", async ({ browser }) => {
  mkdirSync(OUT, { recursive: true });
  const { owner, shop, client } = await seedOwnerShop(
    "screens",
    "Awa Diop",
    "Chez Awa Maroquinerie",
  );
  const demo = await seedDemoData(client, shop.id);
  const stock = await seedDemoStock(client, shop.id, demo);

  const publicRoutes: [string, string][] = [
    ["connexion", "/connexion"],
    ["inscription", "/inscription"],
  ];
  const base = `/s/${shop.slug}`;
  const shopRoutes: [string, string][] = [
    ["accueil", base],
    ["parametres", `${base}/parametres`],
    ["membres", `${base}/parametres/membres`],
    ["fournisseurs", `${base}/fournisseurs`],
    ["fournisseur-fiche", `${base}/fournisseurs/${demo.suppliers[0].id}`],
    ["stock", `${base}/stock`],
    ["modele-nouveau", `${base}/modeles/nouveau`],
    ["modele-fiche", `${base}/modeles/${demo.products[0].id}`],
    ["receptions", `${base}/receptions`],
    ["reception-nouvelle", `${base}/receptions/nouvelle`],
    ["reception-fiche", `${base}/receptions/${stock.receptionIds[0]}`],
    ["clients", `${base}/clients`],
    ["client-fiche", `${base}/clients/${demo.customers[0].id}`],
  ];

  for (const theme of THEMES) {
    for (const width of WIDTHS) {
      const { context, page } = await newPage(browser, width, theme);
      const suffix = `${theme}-${width}`;

      for (const [name, route] of publicRoutes.filter(([n]) => wanted(n))) {
        await page.goto(route);
        await capture(page, `${name}-${suffix}`);
      }

      await signIn(page, owner.email);
      for (const [name, route] of shopRoutes.filter(([n]) => wanted(n))) {
        await page.goto(route);
        await capture(page, `${name}-${suffix}`);
      }

      if (width < 768 && wanted("menu")) {
        await page.goto(base);
        await page.getByRole("button", { name: "Plus" }).click();
        await page.getByRole("dialog").waitFor();
        await capture(page, `menu-plus-${suffix}`);
      }

      await context.close();
    }
  }
});
