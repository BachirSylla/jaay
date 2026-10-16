import { expect, type Page } from "@playwright/test";
import { E2E_PASSWORD } from "./admin";

export async function signIn(page: Page, email: string, password = E2E_PASSWORD) {
  await page.goto("/connexion");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  // The first sign-in also compiles routes on the dev server: allow some time.
  await expect(page).not.toHaveURL(/\/connexion/, { timeout: 15_000 });
}
