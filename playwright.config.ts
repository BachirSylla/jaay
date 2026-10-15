import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// E2E helpers need the Supabase keys (dev project) to create and delete test accounts.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const PORT = 3000;

export default defineConfig({
  testDir: "./e2e",
  globalTeardown: "./e2e/support/global-teardown.ts",
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // The dev server compiles routes on first use: a few workers keep pages responsive.
  workers: 3,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "mobile",
      // Account journeys run once, on desktop: they create real accounts on the dev project.
      // pwa.spec.ts runs on both: network cuts matter most on phones.
      testIgnore:
        /(shop|screens|referentials|stock|sales|supplier-account|dashboard|catalog).spec.ts/,
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
