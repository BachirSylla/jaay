import { expect, test } from "@playwright/test";
import { adminClient, createE2EUser, seedOwnerShop } from "./support/admin";
import { signIn } from "./support/auth";
import { seedDemoData } from "./support/demo-data";

// Receptions and stock. Desktop only (see playwright.config.ts).
test.describe.configure({ mode: "serial" });

let slug = "";
let ownerEmail = "";
let managerEmail = "";

test.beforeAll(async () => {
  const { owner, shop, client } = await seedOwnerShop("stock-owner", "Awa Stock", "Zz Stock");
  await seedDemoData(client, shop.id);
  slug = shop.slug;
  ownerEmail = owner.email;
  const manager = await createE2EUser("stock-manager", "Fatou Stock");
  managerEmail = manager.email;
  const { error } = await adminClient()
    .from("shop_members")
    .insert({ shop_id: shop.id, user_id: manager.id, role: "manager" });
  if (error) throw error;
});

test("owner records a reception and sees it in stock", async ({ page }) => {
  await signIn(page, ownerEmail);
  await page.goto(`/s/${slug}/receptions/nouvelle`);

  await page.getByRole("combobox", { name: "Fournisseur" }).click();
  await page.getByRole("option", { name: "Ibrahima Maroquinerie" }).click();

  await page.getByRole("button", { name: "Ajouter un modèle" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Cabas cuir grainé/ })
    .click();
  await page
    .getByRole("group", { name: /Quantité — Cabas/ })
    .getByRole("textbox")
    .fill("10");
  await page.getByLabel(/Prix fournisseur — Cabas/).fill("5000");

  await page.getByRole("button", { name: "Ajouter un modèle" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Pochette soirée/ })
    .click();
  await page.getByRole("button", { name: "Ajouter un", exact: true }).last().click();
  await page.getByLabel(/Prix fournisseur — Pochette/).fill("3500");

  await page.getByLabel(/Frais de livraison/).fill("2000");
  await expect(page.getByLabel("57 000 F")).toBeVisible();
  await page.getByRole("button", { name: "Enregistrer la réception" }).click();

  await expect(page).toHaveURL(/\/receptions\/[0-9a-f-]{36}$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Ibrahima Maroquinerie" }),
  ).toBeVisible();
  await expect(page.getByLabel("57 000 F").first()).toBeVisible();

  await page.goto(`/s/${slug}/stock`);
  const cabas = page.getByRole("link", { name: /Cabas cuir grainé/ });
  await expect(cabas).toContainText("10 sacs");
  const pochette = page.getByRole("link", { name: /Pochette soirée/ });
  await expect(pochette).toContainText("2 sacs");
  await expect(pochette).toContainText("Stock bas");
});

test("a manager records a reception without seeing past costs", async ({ page }) => {
  await signIn(page, managerEmail);
  await page.goto(`/s/${slug}/receptions/nouvelle`);
  await page.getByRole("combobox", { name: "Fournisseur" }).click();
  await page.getByRole("option", { name: "Ibrahima Maroquinerie" }).click();
  await page.getByRole("button", { name: "Ajouter un modèle" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Cabas cuir grainé/ })
    .click();
  // No pre-filled supplier price for a manager.
  await expect(page.getByLabel(/Prix fournisseur — Cabas/)).toHaveValue("");
  await page.getByLabel(/Prix fournisseur — Cabas/).fill("5500");
  await page.getByRole("button", { name: "Enregistrer la réception" }).click();
  await expect(page).toHaveURL(/\/receptions\/[0-9a-f-]{36}$/);
  await expect(page.getByText("Dû au fournisseur à la vente")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Annuler la réception" })).toHaveCount(0);

  await page.goto(`/s/${slug}/receptions`);
  await expect(page.getByLabel(/000 F$/)).toHaveCount(0);
});

test("owner cancels a reception with a reason", async ({ page }) => {
  await signIn(page, ownerEmail);
  await page.goto(`/s/${slug}/receptions`);
  await page
    .getByRole("link", { name: /Ibrahima Maroquinerie/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Annuler la réception" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Motif de l'annulation").fill("Saisie en double");
  await dialog.getByRole("button", { name: "Annuler la réception" }).click();
  await expect(page.getByText("Réception annulée.")).toBeVisible();
  await expect(page.getByText(/Annulée — Saisie en double/)).toBeVisible();

  await page.goto(`/s/${slug}/stock`);
  await expect(page.getByRole("link", { name: /Cabas cuir grainé/ })).toContainText("10 sacs");
});
