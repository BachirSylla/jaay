import { expect, test } from "@playwright/test";
import { seedOwnerShop } from "./support/admin";
import { signIn } from "./support/auth";
import { seedDemoData, seedDemoStock } from "./support/demo-data";

// Installability and network cuts. Desktop only.
test.describe.configure({ mode: "serial" });

let slug = "";
let ownerEmail = "";

test.beforeAll(async () => {
  const { owner, shop, client } = await seedOwnerShop("pwa-owner", "Awa Hors Ligne", "Zz Pwa");
  const demo = await seedDemoData(client, shop.id);
  await seedDemoStock(client, shop.id, demo);
  slug = shop.slug;
  ownerEmail = owner.email;
});

test("manifest and icons make the app installable", async ({ request }) => {
  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.status()).toBe(200);
  const json = await manifest.json();
  expect(json).toMatchObject({
    name: "Jaay",
    short_name: "Jaay",
    display: "standalone",
    theme_color: "#211A15",
    background_color: "#F2F2EF",
    start_url: "/app",
  });
  for (const icon of json.icons as { src: string }[]) {
    const response = await request.get(icon.src);
    expect(response.status(), icon.src).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");
  }
  expect((await request.get("/icons/apple-180.png")).status()).toBe(200);
  expect((await request.get("/sw.js")).status()).toBe(200);
  expect((await request.get("/hors-ligne")).status()).toBe(200);
});

test("a sale in progress survives a network cut", async ({ page, context }) => {
  await signIn(page, ownerEmail);
  await page.goto(`/s/${slug}/ventes/nouvelle`);
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Ajouter un modèle" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Cabas cuir grainé/ })
    .click();
  await page.getByRole("button", { name: "Instagram" }).click();

  await context.setOffline(true);
  await expect(page.getByRole("status").filter({ hasText: "Pas de connexion" })).toBeVisible();
  await page.getByRole("button", { name: "Encaisser 8 000 F" }).click();
  await expect(page.getByText("Pas de connexion. Votre saisie est conservée.")).toBeVisible();
  await context.setOffline(false);

  // The tab is reloaded (or reopened later): the draft comes back.
  await page.reload();
  await expect(page.getByText("Votre vente en cours a été retrouvée.")).toBeVisible();
  await expect(page.getByLabel(/Prix de vente — Cabas/)).toBeVisible();
  await page.getByRole("button", { name: "Encaisser 8 000 F" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Vente n° 1 enregistrée." }),
  ).toBeVisible();

  // Once collected, the draft is gone.
  await page.goto(`/s/${slug}/ventes/nouvelle`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Votre vente en cours a été retrouvée.")).toHaveCount(0);
});
