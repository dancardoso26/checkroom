import { test, expect } from "@playwright/test";
import { ADMIN, PROFESSOR, entrarComo } from "./helpers/autenticacao";
import {
  limparCadastrosDeTeste,
  PREDIO_DE_TESTE,
  PREFIXO_TESTE,
} from "./helpers/banco";

test.beforeEach(async () => {
  await limparCadastrosDeTeste();
});

test.afterAll(async () => {
  await limparCadastrosDeTeste();
});

test("a administração cadastra, edita e exclui um espaço com recursos", async ({
  page,
}) => {
  await entrarComo(page, ADMIN);
  await page.goto("/configuracoes/espacos");
  await page.getByRole("button", { name: "Novo espaço" }).click();

  const modal = page.getByRole("dialog", { name: "Novo espaço" });

  await modal.getByLabel("Prédio").fill(String(PREDIO_DE_TESTE));
  await modal.getByLabel("Andar").click();
  await page.getByRole("option", { name: "3 · 3º andar" }).click();
  await modal.getByLabel("Sala").fill("5");
  await expect(modal.locator("[data-codigo]")).toHaveText("993-05");

  await modal.getByLabel("Tipo").click();
  await page.getByRole("option", { name: "Laboratório" }).click();
  await modal.getByLabel("Capacidade").fill("0");
  await modal.getByLabel("Projetor").check();
  await modal.getByRole("button", { name: "Salvar" }).click();

  await expect(
    modal.getByText("A capacidade deve ser um número inteiro maior que zero.")
  ).toBeVisible();
  await expect(modal.getByLabel("Sala")).toHaveValue("5");

  await modal.getByLabel("Capacidade").fill("25");
  await modal.getByRole("button", { name: "Salvar" }).click();
  await expect(modal).toBeHidden();

  const linha = page.locator('[data-espaco="993-05"]');
  await expect(linha).toContainText("Laboratório");
  await expect(linha).toContainText("3º andar");
  await expect(linha).toContainText("25");
  await expect(linha).toContainText("Projetor");

  await linha.getByRole("button", { name: /Ações de/ }).click();
  await page.getByRole("menuitem", { name: "Editar" }).click();
  const edicao = page.getByRole("dialog", { name: "Editar espaço" });
  await edicao.getByLabel("Capacidade").fill("30");
  await edicao.getByLabel("Computadores").check();
  await edicao.getByRole("button", { name: "Salvar" }).click();
  await expect(edicao).toBeHidden();
  await expect(linha).toContainText("30");
  await expect(linha).toContainText("Computadores");

  await linha.getByRole("button", { name: /Ações de/ }).click();
  await page.getByRole("menuitem", { name: "Excluir" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Excluir" }).click();
  await expect(linha).toHaveCount(0);
});

test("espaço com reservas não pode ser excluído", async ({ page }) => {
  await entrarComo(page, ADMIN);
  await page.goto("/configuracoes/espacos");

  await page.getByRole("button", { name: "Ações de 1T-01" }).click();
  await page.getByRole("menuitem", { name: "Excluir" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Excluir" }).click();

  await expect(
    page.getByText("Este espaço tem reservas, chamados ou palestras e não pode ser excluído.")
  ).toBeVisible();
});

test("o código repetido é recusado", async ({ page }) => {
  await entrarComo(page, ADMIN);
  await page.goto("/configuracoes/espacos");
  await page.getByRole("button", { name: "Novo espaço" }).click();

  const modal = page.getByRole("dialog", { name: "Novo espaço" });
  await modal.getByLabel("Prédio").fill("2");
  await modal.getByLabel("Andar").click();
  await page.getByRole("option", { name: "1 · 1º andar" }).click();
  await modal.getByLabel("Sala").fill("4");
  await modal.getByLabel("Tipo").click();
  await page.getByRole("option", { name: "Laboratório" }).click();
  await modal.getByLabel("Capacidade").fill("20");
  await modal.getByRole("button", { name: "Salvar" }).click();

  await expect(modal.getByText("Já existe o espaço 21-04.")).toBeVisible();
});

test("a administração cadastra e exclui um recurso", async ({ page }) => {
  const nome = `${PREFIXO_TESTE} Microscópio`;

  await entrarComo(page, ADMIN);
  await page.goto("/configuracoes/recursos");
  await page.getByRole("button", { name: "Novo recurso" }).click();

  const modal = page.getByRole("dialog", { name: "Novo recurso" });
  await modal.getByRole("button", { name: "Salvar" }).click();
  await expect(modal.getByText("Informe o nome do recurso.")).toBeVisible();

  await modal.getByLabel("Nome").fill(nome);
  await modal.getByRole("button", { name: "Salvar" }).click();
  await expect(modal).toBeHidden();

  const linha = page.locator(`[data-recurso="${nome}"]`);
  await expect(linha).toBeVisible();

  await linha.getByRole("button", { name: /Ações de/ }).click();
  await page.getByRole("menuitem", { name: "Excluir" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Excluir" }).click();
  await expect(linha).toHaveCount(0);
});

test("quem não administra não abre o cadastro de espaços", async ({ page }) => {
  await entrarComo(page, PROFESSOR);
  await page.goto("/configuracoes/espacos");

  await expect(page).toHaveURL(/\/reservas/);
});
