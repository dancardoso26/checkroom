import { defineConfig, devices } from "@playwright/test";
import { readFileSync } from "node:fs";

for (const linha of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const par = linha.match(/^([A-Z_]+)=(.*)$/);
  if (par && !process.env[par[1]]) process.env[par[1]] = par[2].trim();
}

const PORTA = Number(process.env.CHECKROOM_PORT ?? 3100);
const BASE_URL = `http://localhost:${PORTA}`;

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",

  workers: 1,
  fullyParallel: false,

  timeout: 90_000,
  expect: { timeout: 15_000 },

  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? "list" : [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: BASE_URL,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: {
    command: `npm run dev -- --port ${PORTA}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
