import { defineConfig, devices } from "@playwright/test";

const PORTA = Number(process.env.CHECKROOM_PORT ?? 3100);
const BASE_URL = `http://localhost:${PORTA}`;

export default defineConfig({
  testDir: "./tests/e2e",

  // Um worker só. Os testes compartilham o mesmo banco, e rodá-los em paralelo
  // faria uma reserva criada por um aparecer como conflito para outro.
  workers: 1,
  fullyParallel: false,

  // Falhar se sobrar um test.only esquecido em um commit.
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? "list" : [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: BASE_URL,
    locale: "pt-BR",
    // O fuso é fixado porque o sistema inteiro trabalha com o horário de
    // Brasília. Rodar os testes em outro fuso mediria outra coisa.
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
