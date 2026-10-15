import { expect, test, type Page } from "@playwright/test";
import { createE2EUser, E2E_PASSWORD, e2eEmail } from "./support/admin";

// One owner journey, run serially on the desktop project only (see playwright.config.ts).
// It creates real accounts on the dev project; the global teardown deletes them.
test.describe.configure({ mode: "serial" });

const ownerEmail = e2eEmail("owner");
const managerEmail = e2eEmail("manager");
const shopName = `Zz E2E ${Date.now().toString(36)}`;
let shopPath = "";

async function signIn(page: Page, email: string, password = E2E_PASSWORD) {
  await page.goto("/connexion");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
}

async function signOut(page: Page) {
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL(/\/connexion$/);
}

test("redirects guests from the shop space to sign-in", async ({ page }) => {
  await page.goto("/s/une-boutique/ventes");
  await expect(page).toHaveURL(/\/connexion\?next=%2Fs%2Fune-boutique%2Fventes$/);
});

test("signs up, names the shop and lands on its dashboard", async ({ page }) => {
  await page.goto("/inscription");
  await page.getByLabel("Votre nom").fill("Awa E2E");
  await page.getByLabel("E-mail").fill(ownerEmail);
  await page.getByLabel("Mot de passe", { exact: true }).fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Créer mon compte" }).click();

  await expect(page).toHaveURL(/\/bienvenue$/);
  await page.getByLabel("Nom de la boutique").fill(shopName);
  await expect(page.getByText(/\/b\/zz-e2e-/)).toBeVisible();
  await page.getByLabel(/Numéro WhatsApp/).fill("77 123 45 67");
  await page.getByRole("button", { name: "Créer ma boutique" }).click();

  await expect(page).toHaveURL(/\/s\/zz-e2e-[a-z0-9-]+$/);
  shopPath = new URL(page.url()).pathname;
  await expect(page.getByRole("heading", { level: 1, name: "Bonjour, Awa" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Changer de boutique" })).toContainText(shopName);
});

test("adds a new member and attaches an existing account", async ({ page }) => {
  const existing = await createE2EUser("existing", "Moussa Existant");

  await signIn(page, ownerEmail);
  await expect(page).toHaveURL(new RegExp(`${shopPath}$`));
  await page.goto(`${shopPath}/parametres/membres`);

  // New account
  await page.getByRole("button", { name: "Ajouter un membre" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nom").fill("Fatou Gérante");
  await dialog.getByLabel("E-mail").fill(managerEmail);
  await dialog.getByLabel("Mot de passe provisoire").fill(E2E_PASSWORD);
  await dialog.getByRole("button", { name: "Ajouter" }).click();
  await expect(page.getByText("Membre ajouté : il peut se connecter tout de suite.")).toBeVisible();
  await expect(page.getByText(managerEmail)).toBeVisible();

  // Existing account: attached, password untouched
  await page.getByRole("button", { name: "Ajouter un membre" }).click();
  await dialog.getByLabel("Nom").fill("Moussa");
  await dialog.getByLabel("E-mail").fill(existing.email);
  await dialog.getByRole("button", { name: "Ajouter" }).click();
  await expect(
    page.getByText("Compte existant rattaché : il se connecte avec son mot de passe habituel."),
  ).toBeVisible();
  await expect(page.getByText(existing.email)).toBeVisible();

  // Already a member
  await page.getByRole("button", { name: "Ajouter un membre" }).click();
  await dialog.getByLabel("Nom").fill("Moussa");
  await dialog.getByLabel("E-mail").fill(existing.email);
  await dialog.getByRole("button", { name: "Ajouter" }).click();
  await expect(dialog.getByText("Cette personne est déjà membre de la boutique.")).toBeVisible();
  await dialog.getByRole("button", { name: "Annuler" }).click();

  await signOut(page);

  // The attached account still signs in with its usual password.
  await signIn(page, existing.email);
  await expect(page).toHaveURL(new RegExp(`${shopPath}$`));
});

test("a manager does not see finance screens", async ({ page }) => {
  await signIn(page, managerEmail);
  await expect(page).toHaveURL(new RegExp(`${shopPath}$`));

  const nav = page.getByRole("navigation", { name: "Navigation principale" });
  await expect(nav.getByRole("link", { name: "Ventes" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Fournisseurs" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Rapports" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Paramètres" })).toHaveCount(0);

  await page.goto(`${shopPath}/parametres/membres`);
  await expect(page.getByText("Accès réservé")).toBeVisible();
});

test("a non-member gets a 404 on another shop", async ({ page }) => {
  const outsider = await createE2EUser("outsider", "Outsider");
  await signIn(page, outsider.email);
  await expect(page).toHaveURL(/\/bienvenue$/);
  await page.goto(shopPath);
  await expect(page.getByText("Élément introuvable.")).toBeVisible();
});
