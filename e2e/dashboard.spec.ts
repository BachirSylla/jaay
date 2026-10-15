import { expect, test } from "@playwright/test";
import { adminClient, createE2EUser, seedOwnerShop } from "./support/admin";
import { signIn } from "./support/auth";
import { seedDemoAccount, seedDemoData, seedDemoSales, seedDemoStock } from "./support/demo-data";

// Dashboard, reports and CSV export, owner vs manager. Desktop only.
test.describe.configure({ mode: "serial" });

let slug = "";
let ownerEmail = "";
let managerEmail = "";

test.beforeAll(async () => {
  const { owner, shop, client } = await seedOwnerShop("dash-owner", "Awa Tableau", "Zz Tableau");
  const demo = await seedDemoData(client, shop.id);
  await seedDemoStock(client, shop.id, demo);
  await seedDemoSales(client, shop.id, demo);
  await seedDemoAccount(client, shop.id, demo);
  slug = shop.slug;
  ownerEmail = owner.email;
  const manager = await createE2EUser("dash-manager", "Fatou Tableau");
  managerEmail = manager.email;
  const { error } = await adminClient()
    .from("shop_members")
    .insert({ shop_id: shop.id, user_id: manager.id, role: "manager" });
  if (error) throw error;
});

test("owner dashboard shows net profit, collections and stock to watch", async ({ page }) => {
  await signIn(page, ownerEmail);
  await page.goto(`/s/${slug}?periode=semaine`);
  await expect(page.getByRole("link", { name: "Semaine" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("Bénéfice net").filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Encaissements par mode" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Stock à surveiller" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dû aux fournisseurs" })).toBeVisible();
  await expect(page.getByText("Ventes des 7 derniers jours")).toBeVisible();

  await page.getByRole("link", { name: "Mois" }).click();
  await expect(page).toHaveURL(/periode=mois/);
});

test("manager dashboard has no profit, margin or supplier figures", async ({ page }) => {
  await signIn(page, managerEmail);
  await page.goto(`/s/${slug}?periode=mois`);
  await expect(page.getByText("Chiffre d'affaires")).toBeVisible();
  await expect(page.getByText("Bénéfice net")).toHaveCount(0);
  await expect(page.getByText("Dû aux fournisseurs")).toHaveCount(0);
  // The manager made no sale: their revenue is zero.
  await expect(page.getByLabel("0 F").filter({ visible: true }).first()).toBeVisible();

  await page.goto(`/s/${slug}/rapports`);
  await expect(page.getByText("Accès réservé")).toBeVisible();
  const csv = await page.request.get(`/s/${slug}/rapports/export?type=ventes`);
  expect(csv.status()).toBe(404);
});

test("owner reports and CSV export", async ({ page }) => {
  await signIn(page, ownerEmail);
  await page.goto(`/s/${slug}/rapports?periode=mois`);
  await expect(page.getByRole("heading", { level: 1, name: "Rapports" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Meilleurs modèles" })).toBeVisible();

  await page.getByRole("link", { name: "Période libre" }).click();
  await expect(page.getByLabel("Du")).toBeVisible();

  const response = await page.request.get(
    `/s/${slug}/rapports/export?type=ventes&du=2026-01-01&au=2026-12-31`,
  );
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/csv");
  const text = await response.text();
  expect(text.charCodeAt(0)).toBe(0xfeff);
  expect(text).toContain("Numéro;Date;Client");
  expect(text).toContain("Cabas cuir grainé");

  const expenses = await page.request.get(
    `/s/${slug}/rapports/export?type=depenses&du=2026-01-01&au=2026-12-31`,
  );
  expect(expenses.status(), await expenses.text()).toBe(200);
  expect(await expenses.text()).toContain("Emballage;2500");
});
