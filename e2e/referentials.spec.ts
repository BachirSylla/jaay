import { deflateSync } from "node:zlib";
import { expect, test } from "@playwright/test";
import { createE2EUser, E2E_PASSWORD, seedOwnerShop, adminClient } from "./support/admin";
import { signIn } from "./support/auth";

// Suppliers, products (with a photo) and customers; manager restrictions.
// Desktop only (see playwright.config.ts): creates data on the dev project, deleted by teardown.
test.describe.configure({ mode: "serial" });

let slug = "";
let ownerEmail = "";
let managerEmail = "";

/** A small valid PNG (solid color), to exercise the photo upload and WebP compression. */
function samplePng(width = 64, height = 48): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([length, body, sum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.writeUInt8(8, 8); // bit depth
  header.writeUInt8(2, 9); // RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 3, 0)]);
  for (let x = 0; x < width; x++) row.set([138, 85, 48], 1 + x * 3);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

test.beforeAll(async () => {
  const { owner, shop } = await seedOwnerShop("ref-owner", "Awa Ref", "Zz Ref Boutique");
  slug = shop.slug;
  ownerEmail = owner.email;
  const manager = await createE2EUser("ref-manager", "Fatou Ref");
  managerEmail = manager.email;
  const { error } = await adminClient()
    .from("shop_members")
    .insert({ shop_id: shop.id, user_id: manager.id, role: "manager" });
  if (error) throw error;
});

test("owner manages a supplier", async ({ page }) => {
  await signIn(page, ownerEmail);
  await page.goto(`/s/${slug}/fournisseurs`);
  await page.getByRole("button", { name: "Nouveau fournisseur" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nom du fournisseur").fill("Ibrahima Maroquinerie");
  await dialog.getByLabel(/Téléphone/).fill("76 555 44 33");
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Fournisseur ajouté.")).toBeVisible();

  await page.getByRole("link", { name: /Ibrahima Maroquinerie/ }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Ibrahima Maroquinerie" }),
  ).toBeVisible();
  // getByRole ignores routes kept hidden by Activity (cacheComponents); getByText would not.
  await expect(page.getByRole("definition").filter({ hasText: "+221 76 555 44 33" })).toBeVisible();
  await expect(page.getByRole("link", { name: "WhatsApp" })).toHaveAttribute(
    "href",
    "https://wa.me/221765554433",
  );

  await page.getByRole("button", { name: "Archiver" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Archiver" }).click();
  await expect(page.getByText("Fournisseur archivé.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Désarchiver" })).toBeVisible();
});

test("owner creates a product with a compressed photo", async ({ page }) => {
  await signIn(page, ownerEmail);
  await page.goto(`/s/${slug}/stock`);
  await page.getByRole("link", { name: "Nouveau modèle" }).first().click();

  await page.getByLabel("Nom du modèle").fill("Cabas cuir grainé");
  await page.getByRole("button", { name: "Marron" }).click();
  await page.getByLabel(/Prix de vente conseillé/).fill("8000");
  await page.getByLabel(/Prix revendeur conseillé/).fill("7000");
  await page.getByRole("button", { name: "Nouveau modèle" }).click();

  await expect(page).toHaveURL(/\/modeles\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1, name: "Cabas cuir grainé" })).toBeVisible();

  await page.getByLabel("Ajouter une photo").setInputFiles({
    name: "sac.png",
    mimeType: "image/png",
    buffer: samplePng(),
  });
  await expect(page.getByText("Photo ajoutée.")).toBeVisible({ timeout: 20_000 });
  const photo = page.getByRole("img", { name: "Cabas cuir grainé" }).first();
  await expect(photo).toHaveAttribute("src", /product-photos/);

  await page.goto(`/s/${slug}/stock`);
  await expect(page.getByRole("link", { name: /Cabas cuir grainé/ })).toBeVisible();
  await expect(page.getByLabel("8 000 F").first()).toBeVisible();
});

test("a manager adds customers but cannot edit the catalog", async ({ page }) => {
  await signIn(page, managerEmail, E2E_PASSWORD);
  await page.goto(`/s/${slug}/stock`);
  await expect(page.getByRole("link", { name: /Cabas cuir grainé/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Nouveau modèle" })).toHaveCount(0);

  await page.goto(`/s/${slug}/modeles/nouveau`);
  await expect(page.getByText("Accès réservé")).toBeVisible();

  await page.goto(`/s/${slug}/clients`);
  await page.getByRole("button", { name: "Nouveau client" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nom du client").fill("Mariama Revendeuse");
  await dialog.getByRole("button", { name: "Revendeur" }).click();
  await dialog.getByLabel(/Téléphone/).fill("70 111 22 33");
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Client ajouté.")).toBeVisible();

  await page.getByRole("button", { name: "Revendeur" }).click();
  await expect(page.getByRole("link", { name: /^Mariama Revendeuse/ })).toBeVisible();
  await page.getByRole("searchbox").fill("mariama");
  await expect(page.getByRole("link", { name: /^Mariama Revendeuse/ })).toBeVisible();
  await page.getByRole("searchbox").fill("inconnu");
  await expect(page.getByText("Aucun résultat pour cette recherche.")).toBeVisible();
});
