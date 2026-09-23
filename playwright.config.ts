import { defineConfig, devices } from "@playwright/test";
import { readFileSync } from "node:fs";

// O Playwright não lê .env.local sozinho, e os testes precisam da senha das
// contas de demonstração para autenticar.
for (const linha of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const par = linha.match(/^([A-Z_]+)=(.*)$/);
  if (par && !process.env[par[1]]) process.env[par[1]] = par[2].trim();
}

const PORTA = Number(process.env.CHECKROOM_PORT ?? 3100);
const BASE_URL = `http://localhost:${PORTA}`;

export default defineConfig({
  testDir: "./tests/e2e",

  // Um worker só. Os testes compartilham o mesmo banco, e rodá-los em paralelo
  // faria uma reserva criada por um aparecer como conflito para outro.
  workers: 1,
  fullyParallel: false,

  // O dev server compila cada rota na primeira visita, e o segundo fator
  // acrescenta duas telas ao caminho. Os padrões de 5s e 30s não bastam.
  timeout: 90_000,
  expect: { timeout: 15_000 },

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
