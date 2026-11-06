import { readFileSync } from "node:fs";
import { generateSync } from "otplib";
import { expect, type Page } from "@playwright/test";

function lerSenhaDoAmbiente(): string {
  for (const linha of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const par = linha.match(/^SEED_USER_PASSWORD=(.*)$/);
    if (par) return par[1].trim();
  }

  return "";
}

export const PROFESSOR = "professor@umc.br";
export const ADMIN = "adm@umc.br";
export const ALUNO = "aluno@umc.br";
export const TI = "suporte@umc.br";

export const CONTA_COM_SEGUNDO_FATOR = "teste.mfa@exemplo.edu.br";

export const SENHA = lerSenhaDoAmbiente();

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
    const revelar = page.getByText("Não consigo escanear");

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

  await page.goto("/reservas").catch(() => undefined);
  await page.waitForURL(/\/(reservas|aceitar-termos)/);
  await page.waitForLoadState("networkidle");

  if (page.url().includes("/aceitar-termos")) {
    await page.getByRole("checkbox").check();

    const continuar = page.getByRole("button", { name: "Continuar" });

    await expect(continuar).toBeEnabled();
    await continuar.click();
    await page.waitForURL(/\/reservas/);
  }

  await expect(page).toHaveURL(/\/reservas/);
}
