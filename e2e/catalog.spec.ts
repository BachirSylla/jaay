import { deflateSync } from "node:zlib";
import { expect, test } from "@playwright/test";
import { seedOwnerShop } from "./support/admin";
import { signIn } from "./support/auth";
import { seedDemoData, seedDemoStock } from "./support/demo-data";

// Public catalog (anonymous), Open Graph images, price display and logo. Desktop only.
test.describe.configure({ mode: "serial" });

let slug = "";
let ownerEmail = "";
let cabasId = "";

function solidPng(size = 64): Buffer {
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
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.writeUInt8(8, 8);
  header.writeUInt8(2, 9);
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(size * 3, 0)]);
  for (let x = 0; x < size; x++) row.set([168, 90, 36], 1 + x * 3);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.concat(Array.from({ length: size }, () => row)))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

test.beforeAll(async () => {
  const { owner, shop, client } = await seedOwnerShop("cat-owner", "Awa Catalogue", "Zz Catalogue");
  const demo = await seedDemoData(client, shop.id);
  await seedDemoStock(client, shop.id, demo);
  slug = shop.slug;
  ownerEmail = owner.email;
  cabasId = demo.products[0].id;
});

test("anonymous visitors see the public catalog and can order on WhatsApp", async ({ page }) => {
  await page.goto(`/b/${slug}`);
  await expect(page.getByRole("link", { name: /Zz Catalogue/ })).toBeVisible();
  await expect(page.getByText("Cabas cuir grainé")).toBeVisible();
  await expect(page.getByLabel("8 000 F").first()).toBeVisible();
  // Hidden from the catalog, and sold out: not listed.
  await expect(page.getByText("Sac de voyage week-end")).toHaveCount(0);

  const order = page.getByRole("link", { name: "Commander — Cabas cuir grainé" });
  const href = await order.getAttribute("href");
  expect(href).toContain("https://wa.me/221771234567?text=");
  // \s also matches the no-break spaces of formatted amounts.
  expect(decodeURIComponent(href!.split("text=")[1])).toMatch(
    /« Cabas cuir grainé » \(8\s000\sF\)/,
  );

  await page
    .getByRole("link", { name: /Cabas cuir grainé/ })
    .first()
    .click();
  await expect(page).toHaveURL(new RegExp(`/b/${slug}/${cabasId}$`));
  await expect(page.getByRole("heading", { level: 1, name: "Cabas cuir grainé" })).toBeVisible();
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    /opengraph-image/,
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    "Cabas cuir grainé — Zz Catalogue",
  );

  const ogUrl = await page.locator('meta[property="og:image"]').getAttribute("content");
  const og = await page.request.get(ogUrl!);
  expect(og.status()).toBe(200);
  expect(og.headers()["content-type"]).toContain("image/png");
});

test("owner hides prices, adds a logo, then disables the catalog", async ({ page }) => {
  await signIn(page, ownerEmail);
  await page.goto(`/s/${slug}/parametres`);
  // The file input only reacts once React has hydrated the page.
  await page.waitForLoadState("networkidle");

  await page.getByLabel("Ajouter un logo").setInputFiles({
    name: "logo.png",
    mimeType: "image/png",
    buffer: solidPng(),
  });
  await expect(page.getByText("Logo enregistré.")).toBeVisible({ timeout: 20_000 });

  await page.getByRole("switch", { name: /Afficher les prix/ }).click();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  // Saved: the form is clean again, so the button is disabled.
  await expect(page.getByRole("button", { name: "Enregistrer" })).toBeDisabled();

  const visitor = await page.context().browser()!.newPage();
  await visitor.goto(`/b/${slug}`);
  await expect(visitor.getByText("Prix sur demande").first()).toBeVisible();
  await expect(visitor.getByLabel("8 000 F")).toHaveCount(0);

  await page.getByRole("switch", { name: /Catalogue public activé/ }).click();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  // Saved: the form is clean again, so the button is disabled.
  await expect(page.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
  // Streamed page (partial prerendering): the shell is already sent with 200, the not-found
  // content and a noindex robots tag replace the catalog.
  await visitor.goto(`/b/${slug}`);
  await expect(visitor.getByText("Élément introuvable.", { exact: true })).toBeVisible();
  await expect(visitor.getByText("Cabas cuir grainé")).toHaveCount(0);
  await expect(visitor.locator('meta[name="robots"]').first()).toHaveAttribute(
    "content",
    /noindex/,
  );
  await visitor.close();
});
