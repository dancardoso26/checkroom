import { defineConfig, devices } from "@playwright/test";

/**
 * CONFIGURAÇÃO DOS TESTES DE PONTA A PONTA
 *
 * O Vitest cobre a regra de negócio isolada: funções puras, sem banco e sem
 * navegador. Esta suíte cobre o que aquela não alcança, e que é justamente
 * onde os defeitos deste projeto apareceram na prática.
 *
 * Os testes daqui abrem o sistema de verdade, preenchem o formulário e
 * verificam o resultado no banco real. Foram eles que revelaram, durante o
 * desenvolvimento, que o botão "Continuar" criava a reserva sem passar pela
 * revisão, que o formulário apagava o preenchimento ao recusar, e que o Chrome
 * ignora min e max no campo de horário. Nenhum teste unitário pegaria isso.
 *
 * POR QUE ESTA SUÍTE PRECISA DO BANCO REAL
 *
 * Ela verifica as constraints de exclusão do PostgreSQL, que só existem no
 * banco. Substituí-lo por um dublê testaria o dublê.
 *
 * O custo é depender de um banco populado com supabase/seed.sql, e os testes
 * são escritos para tolerar isso: cada um limpa o que criou e nenhum depende da
 * ordem de execução.
 */
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
    baseURL: "http://localhost:3000",
    locale: "pt-BR",
    // O fuso é fixado porque o sistema inteiro trabalha com o horário de
    // Brasília. Rodar os testes em outro fuso mediria outra coisa.
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    // Reaproveita um servidor já em execução em vez de subir outro. Sem isto, a
    // suíte falharia sempre que alguém estivesse desenvolvendo em paralelo.
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
