import { readFileSync } from "node:fs";
import { generateSync } from "otplib";
import { expect, type Page } from "@playwright/test";

// Lido aqui, e não no playwright.config: o config roda no processo principal,
// e os testes, em workers que não herdam o que ele define.
function lerSenhaDoAmbiente(): string {
  for (const linha of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const par = linha.match(/^SEED_USER_PASSWORD=(.*)$/);
    if (par) return par[1].trim();
  }

  return "";
}

// Contas de desenvolvimento, dispensadas do segundo fator fora de produção.
// Os testes nunca usam as de demonstração: foi assim que o fator cadastrado
// pelo Daniel no autenticador dele acabou apagado.
export const PROFESSOR = "dev.professor@exemplo.edu.br";
export const ADMIN = "dev.admin@exemplo.edu.br";

// A única que exige TOTP, usada pelos testes do próprio segundo fator. O fator
// dela é apagado no global-setup, antes de cada suíte.
export const CONTA_COM_SEGUNDO_FATOR = "teste.mfa@exemplo.edu.br";

export const SENHA = lerSenhaDoAmbiente();

// O segredo do segundo fator só é exibido no cadastro. Guardá-lo entre os
// testes evita recadastrar a cada login, e funciona porque a suíte usa um
// worker só.
const segredos = new Map<string, string>();

async function informarCodigo(page: Page, segredo: string) {
  await page.fill("#codigo", generateSync({ secret: segredo }));
  await page.getByRole("button", { name: "Verificar" }).click();
}

export async function entrarComo(page: Page, email: string) {
  if (!SENHA) {
    throw new Error(
      "Defina SEED_USER_PASSWORD em .env.local para rodar os testes."
    );
  }

  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#senha", SENHA);
  await page.getByRole("button", { name: "Entrar" }).click();

  await page.waitForURL(/\/(verificacao|reservas|aceitar-termos)/);

  if (page.url().includes("/verificacao")) {
    // A mesma tela cadastra e desafia. O segredo só aparece no cadastro, e é
    // a presença dele que diz em qual dos dois casos estamos.
    const revelar = page.getByText("Não consigo escanear");

    // Espera a tela montar antes de decidir: o cadastro do fator é pedido ao
    // servidor depois da montagem, e a ausência imediata do segredo não
    // significa que este é um desafio.
    await page
      .locator("#codigo")
      .waitFor({ state: "visible", timeout: 60_000 });

    const ehCadastro = await revelar
      .waitFor({ state: "visible", timeout: 20_000 })
      .then(() => true)
      .catch(() => false);

    if (ehCadastro) {
      await revelar.click();
      const segredo = (await page.locator("code").innerText()).trim();

      segredos.set(email, segredo);
      await informarCodigo(page, segredo);
    } else {
      const segredo = segredos.get(email);

      if (!segredo) {
        throw new Error(
          `${email} já tem segundo fator de uma execução anterior. Rode "npm run seed:usuarios" antes da suíte.`
        );
      }

      await informarCodigo(page, segredo);
    }

    await page.waitForURL(/\/(reservas|aceitar-termos)/);
  }

  // Navegação explícita em vez de esperar o redirecionamento assentar: a tela
  // de aceite aparece no meio do caminho, e checar a URL cedo demais a perde.
  await page.goto("/reservas");

  if (page.url().includes("/aceitar-termos")) {
    // check, e não click: ele espera o estado mudar de fato, o que evita
    // marcar a caixa antes de o React assumir o controle dela.
    await page.getByRole("checkbox").check();

    const continuar = page.getByRole("button", { name: "Continuar" });

    await expect(continuar).toBeEnabled();
    await continuar.click();
    await page.waitForURL(/\/reservas/);
  }

  await expect(page).toHaveURL(/\/reservas/);
}
