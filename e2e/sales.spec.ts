import { expect, test, type Page } from "@playwright/test";
import { adminClient, createE2EUser, seedOwnerShop } from "./support/admin";
import { signIn } from "./support/auth";
import { seedDemoData, seedDemoStock } from "./support/demo-data";

// Quick sale journey, receipt, manager rules and cancellation. Desktop only.
test.describe.configure({ mode: "serial" });

let slug = "";
let ownerEmail = "";
let managerEmail = "";

test.beforeAll(async () => {
  const { owner, shop, client } = await seedOwnerShop("sales-owner", "Awa Ventes", "Zz Ventes");
  const demo = await seedDemoData(client, shop.id);
  await seedDemoStock(client, shop.id, demo);
  slug = shop.slug;
  ownerEmail = owner.email;
  const manager = await createE2EUser("sales-manager", "Fatou Ventes");
  managerEmail = manager.email;
  const { error } = await adminClient()
    .from("shop_members")
    .insert({ shop_id: shop.id, user_id: manager.id, role: "manager" });
  if (error) throw error;
});

async function addProduct(page: Page, name: RegExp) {
  await page.getByRole("button", { name: "Ajouter un modèle" }).click();
  await page.getByRole("dialog").getByRole("button", { name }).click();
}

test("owner sells two bags in a few taps", async ({ page }) => {
  await signIn(page, ownerEmail);
  await page.goto(`/s/${slug}/ventes/nouvelle`);
  await expect(page.getByText("n° 1")).toBeVisible();

  await addProduct(page, /Cabas cuir grainé/);
  await expect(page.getByLabel(/Prix de vente — Cabas/)).toHaveValue("8 000");
  await page.getByRole("button", { name: "Ajouter un", exact: true }).click();
  await page.getByRole("button", { name: "WhatsApp", exact: true }).click();
  await page.getByRole("radio", { name: "Wave" }).first().click();

  // 2 × 8 000 = 16 000; FIFO cost 2 × 5 000 → margin 6 000 (owner only).
  await expect(page.getByText(/Marge/)).toContainText("6 000 F");
  await page.getByRole("button", { name: "Encaisser 16 000 F" }).click();

  await expect(page.getByRole("status")).toContainText("Vente n° 1 enregistrée.");
  await expect(page).toHaveURL(new RegExp(`/s/${slug}$`));

  // Back to the form without reloading (the screen stayed mounted, hidden): it opens empty,
  // with the next number and without the success overlay.
  await page
    .getByRole("link", { name: "Nouvelle vente" })
    .filter({ visible: true })
    .first()
    .click();
  await expect(page).toHaveURL(new RegExp(`/s/${slug}/ventes/nouvelle$`));
  await expect(page.getByText("n° 2").filter({ visible: true })).toBeVisible();
  await expect(
    page.locator("p", { hasText: "Vente n° 1 enregistrée." }).filter({ visible: true }),
  ).toHaveCount(0);
  await expect(page.getByLabel(/Prix de vente — Cabas/).filter({ visible: true })).toHaveCount(0);

  await page.goto(`/s/${slug}/ventes`);
  const sale = page.getByRole("link", { name: /n° 1/ });
  await expect(sale).toContainText("16 000 F");
  await expect(sale).toContainText("+6 000 F");
});

test("reseller sale with a new customer and a split payment", async ({ page }) => {
  await signIn(page, ownerEmail);
  await page.goto(`/s/${slug}/ventes/nouvelle`);

  await page.getByRole("button", { name: /Client de passage/ }).click();
  await page.getByRole("dialog").getByRole("searchbox").fill("Ndeye Revendeuse");
  await page.getByRole("button", { name: "Créer « Ndeye Revendeuse »" }).click();
  const form = page.getByRole("dialog");
  await expect(form.getByLabel("Nom du client")).toHaveValue("Ndeye Revendeuse");
  await form.getByRole("button", { name: "Revendeur" }).click();
  await form.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("button", { name: /Ndeye Revendeuse/ })).toBeVisible();

  await addProduct(page, /Sac seau tressé/);
  // Reseller price pre-filled (11 000 instead of 12 500), still editable.
  await expect(page.getByLabel(/Prix de vente — Sac seau/)).toHaveValue("11 000");
  await page.getByLabel(/Prix de vente — Sac seau/).fill("10500");

  await page.getByRole("radio", { name: "Espèces" }).first().click();
  await page.getByRole("button", { name: "Diviser en deux" }).click();
  await page.getByLabel(/Montant — Wave/).fill("4000");
  await expect(page.getByText("Reste 6 500 F")).toBeVisible();
  await page.getByRole("button", { name: "Encaisser 10 500 F" }).click();
  await expect(page.getByRole("status")).toContainText("Vente n° 2 enregistrée.");

  await page.goto(`/s/${slug}/ventes`);
  await page.getByRole("link", { name: /n° 2/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Vente n° 2" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ndeye Revendeuse" })).toBeVisible();

  const receipt = await page.request.get(`${page.url()}/recu`);
  expect(receipt.status()).toBe(200);
  expect(receipt.headers()["content-type"]).toContain("image/png");
});

test("a manager sees only their sales, without margins", async ({ page }) => {
  await signIn(page, managerEmail);
  await page.goto(`/s/${slug}/ventes`);
  await expect(page.getByText("Aucune vente")).toBeVisible();

  await page.goto(`/s/${slug}/ventes/nouvelle`);
  await addProduct(page, /Sac à dos city/);
  await expect(page.getByText(/Marge/)).toHaveCount(0);
  await page.getByRole("button", { name: "Encaisser 15 000 F" }).click();
  await expect(page.getByRole("status")).toContainText("Vente n° 3 enregistrée.");

  await page.goto(`/s/${slug}/ventes`);
  await expect(page.getByRole("link", { name: /n° 3/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /n° 1/ })).toHaveCount(0);
  await page.getByRole("link", { name: /n° 3/ }).click();
  await expect(page.getByRole("button", { name: "Annuler la vente" })).toHaveCount(0);
});

test("owner cancels a sale and the bags go back to stock", async ({ page }) => {
  await signIn(page, ownerEmail);
  await page.goto(`/s/${slug}/stock`);
  await expect(page.getByRole("link", { name: /Cabas cuir grainé/ })).toContainText("18 sacs");

  await page.goto(`/s/${slug}/ventes`);
  await page.getByRole("link", { name: /n° 1/ }).click();
  await page.getByRole("button", { name: "Annuler la vente" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Motif de l'annulation").fill("Client a changé d'avis");
  await dialog.getByRole("button", { name: "Annuler la vente" }).click();
  await expect(page.getByText("Vente annulée.")).toBeVisible();

  await page.goto(`/s/${slug}/stock`);
  await expect(page.getByRole("link", { name: /Cabas cuir grainé/ })).toContainText("20 sacs");

  // Hidden from the sales list until asked.
  await page.goto(`/s/${slug}/ventes`);
  const sale = page.getByRole("link", { name: /n° 1\b/ }).filter({ visible: true });
  await expect(page.getByRole("link", { name: /n° 2\b/ }).filter({ visible: true })).toBeVisible();
  await expect(sale).toHaveCount(0);
  await page.getByRole("button", { name: /Afficher les annulées/ }).click();
  await expect(sale).toContainText("Annulée");
});
