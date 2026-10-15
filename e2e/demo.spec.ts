import { expect, test } from "@playwright/test";

test("home page links to the component demo", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Votre dépôt-vente, enfin sous contrôle." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Composants de base" }).click();
  await expect(page).toHaveURL(/\/demo$/);
});

test("demo page renders money and switches theme", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByRole("heading", { level: 1, name: "Composants de base" })).toBeVisible();
  await expect(page.getByLabel("1 250 000 F")).toBeVisible();

  await page.getByRole("button", { name: "Sombre" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);

  await page.getByRole("button", { name: "Clair" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});

test("cancel dialog opens and closes", async ({ page }) => {
  await page.goto("/demo");
  await page.getByRole("button", { name: "Ouvrir la boîte de dialogue" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(dialog).toBeHidden();
});
