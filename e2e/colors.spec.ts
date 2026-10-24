import { expect, type Page, test } from "@playwright/test";
import { seedOwnerShop } from "./support/admin";
import { signIn } from "./support/auth";

// Colors per model and material: reception color by color, sale of a chosen color, spreading
// uncolored stock, material filter, public catalog. Desktop only.
test.describe.configure({ mode: "serial" });

let slug = "";
let ownerEmail = "";
let nomadeId = "";

test.beforeAll(async () => {
  const { owner, shop, client } = await seedOwnerShop(
    "colors-owner",
    "Awa Couleurs",
    "Zz Couleurs",
  );
  slug = shop.slug;
  ownerEmail = owner.email;

  const { data: supplier, error: supplierError } = await client
    .from("suppliers")
    .insert({ shop_id: shop.id, name: "Mouhamed Sarr" })
    .select("id")
    .single();
  if (supplierError) throw supplierError;

  const { data: products, error } = await client
    .from("products")
    .insert([
      { shop_id: shop.id, name: "Le Bureau", material: "leather", suggested_price: 10000 },
      { shop_id: shop.id, name: "Le Nomade", material: "leather", suggested_price: 10000 },
      { shop_id: shop.id, name: "Sac simili", material: "faux_leather", suggested_price: 7000 },
    ])
    .select("id, name");
  if (error) throw error;
  const id = (name: string) => products.find((p) => p.name === name)!.id;
  nomadeId = id("Le Nomade");

  // Le Nomade and Sac simili: stock recorded before colors existed.
  const { error: receptionError } = await client.rpc("create_reception", {
    p_shop_id: shop.id,
    p_supplier_id: supplier.id,
    p_received_at: new Date(Date.now() - 86_400_000).toISOString(),
    p_items: [
      { product_id: id("Le Nomade"), quantity: 3, unit_cost: 5500 },
      { product_id: id("Sac simili"), quantity: 2, unit_cost: 4000 },
    ],
  });
  if (receptionError) throw receptionError;

  const { error: variantsError } = await client.from("product_variants").insert([
    { shop_id: shop.id, product_id: id("Le Bureau"), color: "Marron", position: 0 },
    { shop_id: shop.id, product_id: id("Le Bureau"), color: "Noir", position: 1 },
    { shop_id: shop.id, product_id: id("Le Nomade"), color: "Marron", position: 0 },
    { shop_id: shop.id, product_id: id("Le Nomade"), color: "Noir", position: 1 },
  ]);
  if (variantsError) throw variantsError;
});

function stockCard(page: Page, name: string) {
  return page.getByRole("link", { name: new RegExp(name) }).filter({ visible: true });
}

test("owner receives a model color by color", async ({ page }) => {
  await signIn(page, ownerEmail);
  await page.goto(`/s/${slug}/receptions/nouvelle`);
  await page.waitForLoadState("networkidle");

  await page.getByRole("combobox", { name: "Fournisseur" }).click();
  await page.getByRole("option", { name: "Mouhamed Sarr" }).click();
  await page.getByRole("button", { name: "Ajouter un modèle" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Le Bureau/ })
    .click();
  await page.getByLabel(/Prix fournisseur — Le Bureau/).fill("5500");

  // No color chosen: refused.
  await page.getByRole("button", { name: "Enregistrer la réception" }).click();
  await expect(page.getByText("Choisissez la couleur.")).toBeVisible();

  await page.getByRole("radio", { name: "Marron" }).click();
  await page
    .getByRole("group", { name: "Quantité — Le Bureau · Marron" })
    .getByRole("textbox")
    .fill("2");
  await page.getByRole("button", { name: "Autre couleur" }).click();
  // Marron is taken by the first line: only Noir is left for the second one.
  await page.getByRole("radio", { name: "Noir" }).last().click();
  await expect(page.getByLabel("Prix fournisseur — Le Bureau · Noir")).toHaveValue("5 500");
  await page.getByRole("button", { name: "Enregistrer la réception" }).click();

  await expect(page).toHaveURL(/\/receptions\/[0-9a-f-]{36}$/);
  await expect(page.getByText("Marron", { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByText("Noir", { exact: true }).filter({ visible: true })).toBeVisible();

  await page.goto(`/s/${slug}/stock`);
  const card = stockCard(page, "Le Bureau");
  await expect(card).toContainText("Cuir");
  await expect(card.getByRole("list", { name: "Stock par couleur" })).toHaveText(
    /Marron\s*2\s*Noir\s*1/,
  );
});

test("a sale takes the chosen color only", async ({ page }) => {
  await signIn(page, ownerEmail);
  await page.goto(`/s/${slug}/ventes/nouvelle`);
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "Ajouter un modèle" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Le Bureau/ })
    .click();
  await expect(page.getByRole("radio", { name: "Marron · 2 en stock" })).toBeVisible();
  await page.getByRole("radio", { name: "Noir · 1 en stock" }).click();
  await page.getByRole("button", { name: "Encaisser 10 000 F" }).click();
  await expect(page.getByRole("status")).toContainText("Vente n° 1 enregistrée.");

  await page.goto(`/s/${slug}/ventes`);
  await expect(page.getByRole("link", { name: /n° 1\b/ })).toContainText("Le Bureau · Noir");

  await page.goto(`/s/${slug}/stock`);
  await expect(
    stockCard(page, "Le Bureau").getByRole("list", { name: "Stock par couleur" }),
  ).toHaveText(/^\s*Marron\s*2\s*$/);
});

test("owner spreads the uncolored stock over the colors", async ({ page }) => {
  await signIn(page, ownerEmail);
  await page.goto(`/s/${slug}/modeles/${nomadeId}`);
  await page.waitForLoadState("networkidle");

  await expect(page.getByRole("heading", { name: "Répartir par couleur" })).toBeVisible();
  await page.getByRole("group", { name: "Couleur — Marron" }).getByRole("textbox").fill("2");
  await page.getByRole("group", { name: "Couleur — Noir" }).getByRole("textbox").fill("1");
  await page.getByRole("button", { name: "Répartir", exact: true }).click();
  await expect(page.getByText("Stock réparti par couleur.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Répartir par couleur" })).toHaveCount(0);

  // Same bags, now by color, in the public catalog.
  await page.goto(`/b/${slug}/${nomadeId}`);
  await expect(page.getByText("Couleurs disponibles")).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Marron" })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Noir" })).toBeVisible();
});

test("the stock filters faux leather models", async ({ page }) => {
  await signIn(page, ownerEmail);
  await page.goto(`/s/${slug}/stock`);
  await page
    .getByRole("group", { name: "Filtrer par matière" })
    .getByRole("button", { name: /Simili cuir/ })
    .click();
  await expect(stockCard(page, "Sac simili")).toBeVisible();
  await expect(stockCard(page, "Le Bureau")).toHaveCount(0);
});
