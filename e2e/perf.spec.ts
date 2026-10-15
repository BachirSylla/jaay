import { expect, test, type Page } from "@playwright/test";
import { E2E_PASSWORD, seedOwnerShop } from "./support/admin";
import { seedDemoData, seedDemoSales, seedDemoStock } from "./support/demo-data";

// First paint under a mobile network, against a PRODUCTION build (dev compiles on demand).
// On demand only:
//   pnpm build && pnpm start -p 3100
//   PERF=1 PERF_URL=http://localhost:3100 pnpm exec playwright test perf --project=mobile
test.skip(!process.env.PERF, "performance measurement runs on demand (PERF=1)");
test.use({ baseURL: process.env.PERF_URL ?? "http://localhost:3100" });
test.setTimeout(5 * 60_000);

// Throttling profiles (Chrome DevTools presets): "4G" ≈ 9 Mbps / 1.5 Mbps / 60 ms RTT,
// "slow 4G" (Lighthouse mobile) ≈ 1.6 Mbps / 750 kbps / 150 ms RTT.
const NETWORKS = {
  "4G": { download: 9_000_000 / 8, upload: 1_500_000 / 8, latency: 60 },
  "slow 4G": { download: 1_600_000 / 8, upload: 750_000 / 8, latency: 150 },
} as const;

async function measure(page: Page, url: string) {
  await page.goto(url, { waitUntil: "load" });
  return page.evaluate(
    () =>
      new Promise<{ fcp: number; lcp: number }>((resolve) => {
        const fcp =
          performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? Number.NaN;
        let lcp = Number.NaN;
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          lcp = entries[entries.length - 1].startTime;
        }).observe({ type: "largest-contentful-paint", buffered: true });
        setTimeout(() => resolve({ fcp: Math.round(fcp), lcp: Math.round(lcp) }), 1000);
      }),
  );
}

test("first paint on a mobile network", async ({ browser }) => {
  const { owner, shop, client } = await seedOwnerShop("perf", "Awa Perf", "Zz Perf");
  const demo = await seedDemoData(client, shop.id);
  await seedDemoStock(client, shop.id, demo);
  await seedDemoSales(client, shop.id, demo);

  const results: Record<string, unknown>[] = [];
  for (const [network, conditions] of Object.entries(NETWORKS)) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      downloadThroughput: conditions.download,
      uploadThroughput: conditions.upload,
      latency: conditions.latency,
    });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

    // Cold visits (empty cache): sign-in screen and public catalog.
    results.push({ network, page: "connexion", ...(await measure(page, "/connexion")) });
    results.push({ network, page: "catalogue", ...(await measure(page, `/b/${shop.slug}`)) });

    // Signed in: dashboard and new sale (static assets now cached, as for a daily user).
    await page.goto("/connexion");
    await page.getByLabel("E-mail").fill(owner.email);
    await page.getByLabel("Mot de passe", { exact: true }).fill(E2E_PASSWORD);
    await page.getByRole("button", { name: "Se connecter" }).click();
    await page.waitForURL(/\/s\//);
    results.push({ network, page: "tableau de bord", ...(await measure(page, `/s/${shop.slug}`)) });
    results.push({
      network,
      page: "nouvelle vente",
      ...(await measure(page, `/s/${shop.slug}/ventes/nouvelle`)),
    });
    await context.close();
  }

  console.table(results);
  // LCP is asserted: the first paint always happens at or before it (FCP is not always
  // reported after a navigation in the same tab).
  for (const row of results.filter((r) => r.network === "4G")) {
    expect.soft(row.lcp as number, `${row.page}: displayed under 2 s on 4G`).toBeLessThan(2000);
  }
});
