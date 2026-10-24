import { expect, test } from "@playwright/test";
import { adminClient, createE2EUser, E2E_PASSWORD, seedOwnerShop } from "./support/admin";
import { signIn } from "./support/auth";

// "Mon profil" and member password reset. Desktop only.
test.describe.configure({ mode: "serial" });

let slug = "";
let ownerEmail = "";
let managerEmail = "";
let sharedEmail = "";
const NEW_PASSWORD = "nouveau-mdp-2026";

test.beforeAll(async () => {
  const admin = adminClient();
  const { owner, shop } = await seedOwnerShop("acc-owner", "Awa Profil", "Zz Profil");
  slug = shop.slug;
  ownerEmail = owner.email;

  const manager = await createE2EUser("acc-manager", "Fatou Gérante");
  managerEmail = manager.email;
  // Member of this shop AND of a shop the owner does not manage.
  const shared = await createE2EUser("acc-shared", "Khady Partagée");
  sharedEmail = shared.email;
  const other = await seedOwnerShop("acc-other", "Autre Owner", "Zz Profil Autre");

  const { error } = await admin.from("shop_members").insert([
    { shop_id: shop.id, user_id: manager.id, role: "manager" },
    { shop_id: shop.id, user_id: shared.id, role: "manager" },
    { shop_id: other.shop.id, user_id: shared.id, role: "admin" },
  ]);
  if (error) throw error;
});

test("a user updates their profile and password", async ({ page }) => {
  await signIn(page, ownerEmail);
  // Keyboard: in dev, Next's overlay sits over the bottom of the sidebar and swallows clicks.
  await page.getByRole("link", { name: "Mon profil" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1, name: "Mon profil" })).toBeVisible();
  await page.waitForLoadState("networkidle");

  await page.getByLabel("Nom", { exact: true }).fill("Awa Diop");
  await page.getByLabel(/Téléphone/).fill("77 000 11 22");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Profil enregistré.")).toBeVisible();

  await page.getByLabel("Mot de passe actuel", { exact: true }).fill("mauvais-mdp");
  await page.getByLabel("Nouveau mot de passe", { exact: true }).fill(NEW_PASSWORD);
  await page.getByLabel("Confirmer le nouveau mot de passe").fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Changer le mot de passe" }).click();
  await expect(page.getByText("Le mot de passe actuel est incorrect.")).toBeVisible();

  await page.getByLabel("Mot de passe actuel", { exact: true }).fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Changer le mot de passe" }).click();
  await expect(page.getByText("Mot de passe changé.")).toBeVisible();

  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL(/\/connexion$/);
  await signIn(page, ownerEmail, NEW_PASSWORD);
  await expect(page).toHaveURL(new RegExp(`/s/${slug}$`));
  await expect(page.getByRole("heading", { level: 1, name: "Bonjour, Awa" })).toBeVisible();
});

test("owner resets a manager's password; refused for an account used elsewhere", async ({
  page,
  browser,
}) => {
  await signIn(page, ownerEmail, NEW_PASSWORD);
  await page.goto(`/s/${slug}/parametres/membres`);
  await page.waitForLoadState("networkidle");
  // Never on the owner.
  await expect(
    page.getByRole("button", { name: /Réinitialiser le mot de passe — Awa/ }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: "Réinitialiser le mot de passe — Fatou Gérante" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Réinitialiser" }).click();
  const code = dialog.getByLabel("Nouveau mot de passe provisoire");
  await expect(code).toBeVisible();
  const temporary = (await code.textContent())!.trim();
  expect(temporary).toMatch(/^[A-Za-z0-9]{12}$/);
  await dialog.getByRole("button", { name: "Fermer" }).first().click();

  await page
    .getByRole("button", { name: "Réinitialiser le mot de passe — Khady Partagée" })
    .click();
  await page.getByRole("dialog").getByRole("button", { name: "Réinitialiser" }).click();
  await expect(
    page.getByText(/appartient aussi à une boutique que vous ne gérez pas/),
  ).toBeVisible();

  const managerContext = await browser.newContext();
  const managerPage = await managerContext.newPage();
  await signIn(managerPage, managerEmail, temporary);
  await expect(managerPage).toHaveURL(new RegExp(`/s/${slug}$`));
  await managerContext.close();

  // The shared account kept its password.
  const sharedContext = await browser.newContext();
  const sharedPage = await sharedContext.newPage();
  await signIn(sharedPage, sharedEmail, E2E_PASSWORD);
  await expect(sharedPage).toHaveURL(/\/s\//);
  await sharedContext.close();
});
