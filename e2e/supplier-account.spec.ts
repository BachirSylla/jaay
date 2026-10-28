import { expect, test } from "@playwright/test";
import { adminClient, createE2EUser, seedOwnerShop } from "./support/admin";
import { signIn } from "./support/auth";
import { seedDemoData, seedDemoSales, seedDemoStock } from "./support/demo-data";

// Supplier balance, payment, return of unsold bags, expenses. Desktop only.
test.describe.configure({ mode: "serial" });

let slug = "";
let ownerEmail = "";
let managerEmail = "";
let supplierId = "";

test.beforeAll(async () => {
  const { owner, shop, client } = await seedOwnerShop("acct-owner", "Awa Compte", "Zz Compte");
  const demo = await seedDemoData(client, shop.id);
  await seedDemoStock(client, shop.id, demo);
  await seedDemoSales(client, shop.id, demo);
  slug = shop.slug;
  ownerEmail = owner.email;
  supplierId = demo.suppliers[0].id;
  const manager = await createE2EUser("acct-manager", "Fatou Compte");
  managerEmail = manager.email;
  const { error } = await adminClient()
    .from("shop_members")
    .insert({ shop_id: shop.id, user_id: manager.id, role: "manager" });
  if (error) throw error;
});

test("owner sees the balance due and records a payment", async ({ page }) => {
  await signIn(page, ownerEmail);
  await page.goto(`/s/${slug}/fournisseurs/${supplierId}`);
  // Sold at frozen cost: 3×5 000 + 8 000 + 3 500 + 5 000 + 9 500 = 41 000.
  await expect(page.getByText("Dû au fournisseur")).toBeVisible();
  await expect(page.getByLabel("41 000 F").first()).toBeVisible();

  await page.getByRole("button", { name: "Régler" }).click();
  const dialog = page.getByRole("dialog");
  // Unpaid sold bags, one checkbox per bag: tick the first one, the amount follows.
  const bags = dialog.getByRole("checkbox");
  const unpaidBefore = await bags.count();
  expect(unpaidBefore).toBeGreaterThan(1);
  await bags.first().check();
  await expect(dialog.getByLabel("Montant")).not.toHaveValue("");
  // Paying more than the bag ticked: the rest is an advance.
  await dialog.getByLabel("Montant").fill("20000");
  await expect(dialog.getByText(/Dont acompte/)).toBeVisible();
  await expect(dialog.getByLabel("21 000 F")).toBeVisible();
  await dialog.getByRole("button", { name: "Enregistrer le règlement" }).click();
  await expect(page.getByText("Règlement enregistré.")).toBeVisible();
  await expect(page.getByLabel("21 000 F").first()).toBeVisible();

  // The bag paid is no longer offered.
  await page.getByRole("button", { name: "Régler" }).click();
  await expect(page.getByRole("dialog").getByRole("checkbox")).toHaveCount(unpaidBefore - 1);
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Historique" }).click();
  await expect(page.getByText("Règlement", { exact: true })).toBeVisible();

  // Stock sheet for the supplier: on desktop, its page(s) are downloaded.
  const sheetPopup = page.waitForEvent("popup").catch(() => null);
  const sheet = page.waitForEvent("download");
  await page.getByRole("button", { name: "Partager le stock" }).click();
  const sheetFile = await sheet;
  expect(sheetFile.suggestedFilename()).toMatch(/^stock-\d{4}-\d{2}-\d{2}(-1)?\.png$/);
  await sheetFile.saveAs(test.info().outputPath("stock-sheet.png"));
  await (await sheetPopup)?.close();

  // Receipt image: on desktop (no file sharing) it is downloaded, then WhatsApp opens.
  const popup = page.waitForEvent("popup").catch(() => null);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Partager le reçu — 20 000 F" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^reglement-\d{4}-\d{2}-\d{2}\.png$/);
  const bytes = await (await file.createReadStream()).toArray();
  // PNG signature.
  expect(Buffer.concat(bytes).subarray(1, 4).toString()).toBe("PNG");
  await (await popup)?.close();
});

test("owner returns unsold bags from the supplier page", async ({ page }) => {
  await signIn(page, ownerEmail);
  await page.goto(`/s/${slug}/fournisseurs/${supplierId}`);
  await page.getByRole("link", { name: "Rendre les invendus" }).click();
  await expect(page).toHaveURL(/\/retours\/nouveau\?fournisseur=/);

  // Pre-filled with what is left: keep everything but the pochette (1 left).
  const keep = ["Cabas cuir grainé", "Sac seau tressé", "Sac à dos city"];
  for (const name of keep) {
    await page
      .getByRole("group", { name: `Quantité rendue — ${name}` })
      .getByRole("textbox")
      .fill("0");
  }
  await expect(page.getByText("1 sac", { exact: true })).toBeVisible();
  await page.getByLabel(/Frais de livraison/).fill("1000");
  await page.getByRole("button", { name: "Enregistrer le retour" }).click();
  await expect(page).toHaveURL(/\/retours\/[0-9a-f-]{36}$/);
  await expect(page.getByText("Retour enregistré.")).toBeVisible();

  await page.goto(`/s/${slug}/stock`);
  await expect(page.getByRole("link", { name: /Pochette soirée/ })).toContainText("Épuisé");
});

test("expenses: owner adds and cancels, delivery fees are listed", async ({ page }) => {
  await signIn(page, ownerEmail);
  await page.goto(`/s/${slug}/depenses`);
  await expect(page.getByText("Livraison d'un retour")).toBeVisible();

  await page.getByRole("button", { name: "Nouvelle dépense" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Emballage" }).click();
  await dialog.getByLabel("Montant").fill("2500");
  await dialog.getByLabel(/Note/).fill("Sachets kraft");
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Dépense enregistrée.")).toBeVisible();

  await page.getByRole("button", { name: "Annuler la dépense" }).click();
  const confirm = page.getByRole("dialog");
  await confirm.getByLabel("Motif de l'annulation").fill("Erreur de montant");
  await confirm.getByRole("button", { name: "Annuler la dépense" }).click();
  await expect(page.getByText("Dépense annulée.")).toBeVisible();
});

test("a manager returns bags and records an expense, without supplier finances", async ({
  page,
}) => {
  await signIn(page, managerEmail);
  await page.goto(`/s/${slug}/fournisseurs/${supplierId}`);
  await expect(page.getByText("Accès réservé")).toBeVisible();

  await page.goto(`/s/${slug}/retours/nouveau`);
  await page.getByRole("combobox", { name: "Fournisseur" }).click();
  await page.getByRole("option", { name: "Ibrahima Maroquinerie" }).click();
  await expect(page.getByRole("group", { name: /Quantité rendue — Cabas/ })).toBeVisible();
  await page.getByRole("button", { name: "Enregistrer le retour" }).click();
  await expect(page.getByText("Retour enregistré.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Annuler le retour" })).toHaveCount(0);

  await page.goto(`/s/${slug}/depenses`);
  await page.getByRole("button", { name: "Nouvelle dépense" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Montant").fill("1500");
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Dépense enregistrée.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Annuler la dépense" })).toHaveCount(0);
});
