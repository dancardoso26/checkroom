import { test, expect } from "@playwright/test";
import { ADMIN, PROFESSOR, entrarComo } from "./helpers/autenticacao";
import { dataDaqui, limparCadastrosDeTeste, PREFIXO_TESTE } from "./helpers/banco";
import { preencherPalestra } from "./helpers/palestra";
import { escolherData } from "./helpers/seletores";

test.beforeEach(async () => {
  await limparCadastrosDeTeste();
});

test.afterAll(async () => {
  await limparCadastrosDeTeste();
});

test("período que cruza o vigente é recusado; um novo é aceito", async ({ page }) => {
  await entrarComo(page, ADMIN);
  await page.goto("/configuracoes/calendario");

  await page.getByRole("button", { name: "Novo período" }).click();
  const modal = page.getByRole("dialog", { name: "Novo período letivo" });
  await modal.getByLabel("Período").fill("2099.1");
  await escolherData(page, modal, "Início", "2026-12-01");
  await escolherData(page, modal, "Término", "2027-01-31");
  await modal.getByRole("button", { name: "Salvar" }).click();
  await expect(modal.getByText("As datas cruzam o período 2026.2.")).toBeVisible();

  await escolherData(page, modal, "Início", "2028-02-01");
  await escolherData(page, modal, "Término", "2028-06-30");
  await modal.getByRole("button", { name: "Salvar" }).click();
  await expect(modal).toBeHidden();
  await expect(page.locator('[data-periodo="2099.1"]')).toContainText("01/02/2028");
});

test("o feriado cadastrado recusa palestra na data", async ({ page }) => {
  const data = dataDaqui(45);
  const motivo = `${PREFIXO_TESTE} Feriado municipal`;

  await entrarComo(page, ADMIN);
  await page.goto("/configuracoes/calendario");
  await page.getByRole("button", { name: "Novo bloqueio" }).click();

  const modal = page.getByRole("dialog", { name: "Novo bloqueio" });
  await modal.getByRole("button", { name: "Salvar" }).click();
  await expect(modal.getByText("Informe o motivo, como o nome do feriado.")).toBeVisible();

  await escolherData(page, modal, "Início", data);
  await escolherData(page, modal, "Término", data);
  await modal.getByLabel("Motivo").fill(motivo);
  await modal.getByRole("button", { name: "Salvar" }).click();
  await expect(modal).toBeHidden();
  await expect(page.locator(`[data-bloqueio="${motivo}"]`)).toContainText("Todos");

  const palestra = await preencherPalestra(page, {
    titulo: `${PREFIXO_TESTE} No feriado`,
    palestrante: "Dr. Teste",
    data,
    vagas: "10",
    inicio: "09:00",
    fim: "10:00",
    cursos: ["Sistemas de Informação"],
  });

  await expect(palestra.getByLabel("Espaço", { exact: true })).toBeDisabled();
  await expect(palestra.getByText("Nenhum espaço atende à data")).toBeVisible();
  await expect(
    palestra.getByRole("button", { name: "Cadastrar palestra" })
  ).toBeDisabled();
});

test("quem não administra não abre o calendário", async ({ page }) => {
  await entrarComo(page, PROFESSOR);
  await page.goto("/configuracoes/calendario");

  await expect(page).toHaveURL(/\/reservas/);
});
