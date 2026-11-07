import { test, expect, type Locator, type Page } from "@playwright/test";
import { ALUNO, PROFESSOR, TI, entrarComo } from "./helpers/autenticacao";
import { limparCadastrosDeTeste, PREFIXO_TESTE } from "./helpers/banco";

test.beforeEach(async () => {
  await limparCadastrosDeTeste();
});

test.afterAll(async () => {
  await limparCadastrosDeTeste();
});

async function abrirChamado(page: Page, descricao: string) {
  await page.goto("/chamados");
  await page.getByRole("button", { name: "Abrir chamado" }).click();

  const modal = page.getByRole("dialog", { name: "Abrir chamado" });
  await modal.getByLabel("Espaço").click();
  await page.getByRole("option", { name: "1T-01" }).click();
  await modal.getByLabel("Prioridade").click();
  await page.getByRole("option", { name: "Alta" }).click();
  await modal.getByLabel("Problema").fill(descricao);
  await modal.getByRole("button", { name: "Abrir chamado" }).click();
  await expect(modal).toBeHidden();
}

function cartao(page: Page, descricao: string): Locator {
  return page.locator(`[data-cartao-chamado="${descricao}"]`);
}

function naColuna(
  page: Page,
  coluna: "abertos" | "andamento" | "concluidos",
  descricao: string,
): Locator {
  return page
    .locator(`[data-coluna="${coluna}"]`)
    .locator(`[data-cartao-chamado="${descricao}"]`);
}

async function irParaTodos(page: Page) {
  await page.getByRole("radio", { name: "Tabela" }).click();
}

test("o professor abre um chamado, que nasce aberto", async ({ page }) => {
  await entrarComo(page, PROFESSOR);
  await page.goto("/chamados");
  await page.getByRole("button", { name: "Abrir chamado" }).click();

  const modal = page.getByRole("dialog", { name: "Abrir chamado" });
  await modal.getByLabel("Espaço").click();
  await page.getByRole("option", { name: "1T-01" }).click();
  await modal.getByRole("button", { name: "Abrir chamado" }).click();
  await expect(modal.getByText("Descreva o problema.")).toBeVisible();

  await modal.getByLabel("Problema").fill(`${PREFIXO_TESTE} Projetor não liga`);
  await modal.getByRole("button", { name: "Abrir chamado" }).click();
  await expect(modal).toBeHidden();

  const card = naColuna(page, "abertos", `${PREFIXO_TESTE} Projetor não liga`);
  await expect(card).toBeVisible();
  await expect(card.getByRole("button", { name: "Cancelar" })).toBeVisible();

  await irParaTodos(page);
  const linha = page.locator(`[data-chamado="${PREFIXO_TESTE} Projetor não liga"]`);
  await expect(linha.getByText("Aberto")).toBeVisible();
});

test("a TI assume e resolve, com nota de solução", async ({ page }) => {
  const descricao = `${PREFIXO_TESTE} Ar-condicionado pingando`;

  await entrarComo(page, PROFESSOR);
  await abrirChamado(page, descricao);

  await page.context().clearCookies();
  await entrarComo(page, TI);
  await page.goto("/chamados");
  await naColuna(page, "abertos", descricao)
    .getByRole("button", { name: "Assumir" })
    .click();
  await expect(naColuna(page, "abertos", descricao)).toHaveCount(0);

  const card = naColuna(page, "andamento", descricao);
  await expect(card).toBeVisible();

  await card.getByRole("button", { name: "Resolver" }).click();
  const modal = page.getByRole("dialog", { name: "Resolver chamado" });
  await modal.getByRole("button", { name: "Resolver" }).click();
  await expect(modal.getByText("Descreva a solução para resolver o chamado.")).toBeVisible();

  await modal.getByLabel("Solução").fill("Dreno desobstruído.");
  await modal.getByRole("button", { name: "Resolver" }).click();
  await expect(modal).toBeHidden();
  await expect(card).toHaveCount(0);
  await expect(naColuna(page, "concluidos", descricao)).toBeVisible();

  await irParaTodos(page);
  const linha = page.locator(`[data-chamado="${descricao}"]`);
  await expect(linha.getByText("Resolvido")).toBeVisible();
  await expect(linha.getByRole("button", { name: /^Ações de/ })).toHaveCount(0);
});

test("a TI devolve à fila o chamado que assumiu", async ({ page }) => {
  const descricao = `${PREFIXO_TESTE} Tomada sem energia`;

  await entrarComo(page, PROFESSOR);
  await abrirChamado(page, descricao);

  await page.context().clearCookies();
  await entrarComo(page, TI);
  await page.goto("/chamados");

  await naColuna(page, "abertos", descricao)
    .getByRole("button", { name: "Assumir" })
    .click();
  const emAndamento = naColuna(page, "andamento", descricao);
  await expect(emAndamento).toBeVisible();
  await expect(emAndamento.getByText(/· Com /)).toBeVisible();

  await emAndamento.getByRole("button", { name: "Devolver" }).click();
  await expect(emAndamento).toHaveCount(0);

  const deVolta = naColuna(page, "abertos", descricao);
  await expect(deVolta.getByRole("button", { name: "Assumir" })).toBeVisible();
  await expect(deVolta.getByText(/· Com /)).toHaveCount(0);
});

test("o solicitante cancela o chamado ainda aberto", async ({ page }) => {
  const descricao = `${PREFIXO_TESTE} Cadeira quebrada`;

  await entrarComo(page, PROFESSOR);
  await abrirChamado(page, descricao);

  const card = cartao(page, descricao);
  await card.getByRole("button", { name: "Cancelar" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Cancelar chamado" }).click();
  await expect(card).toHaveCount(0);

  await irParaTodos(page);
  const linha = page.locator(`[data-chamado="${descricao}"]`);
  await expect(linha.getByText("Cancelado")).toBeVisible();
});

test("o aluno não tem acesso aos chamados", async ({ page }) => {
  await entrarComo(page, ALUNO);
  await expect(page.getByRole("link", { name: "Chamados" })).toHaveCount(0);

  await page.goto("/chamados");
  await expect(page).toHaveURL(/\/reservas/);
});
