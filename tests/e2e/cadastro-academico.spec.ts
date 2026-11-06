import { test, expect } from "@playwright/test";
import { ADMIN, PROFESSOR, entrarComo } from "./helpers/autenticacao";
import { limparCadastrosDeTeste, PREFIXO_TESTE } from "./helpers/banco";

test.beforeEach(async () => {
  await limparCadastrosDeTeste();
});

test.afterAll(async () => {
  await limparCadastrosDeTeste();
});

test("turma é cadastrada sem informar a quantidade de alunos", async ({
  page,
}) => {
  await entrarComo(page, ADMIN);
  await page.goto("/configuracoes/academico?aba=turmas");

  await page.getByRole("button", { name: "Nova turma" }).click();
  const modal = page.getByRole("dialog", { name: "Nova turma" });

  await expect(modal.getByLabel("Alunos", { exact: true })).toHaveCount(0);

  await modal.getByLabel("Nome").fill(`${PREFIXO_TESTE} SI 1º semestre`);
  await modal.getByLabel("Curso").click();
  await page.getByRole("option", { name: "Sistemas de Informação" }).click();
  await modal.getByRole("button", { name: "Salvar" }).click();
  await expect(modal).toBeHidden();
  await expect(
    page.locator(`[data-registro="${PREFIXO_TESTE} SI 1º semestre"]`),
  ).toContainText("0");
});

test("vínculo de professor idêntico é recusado", async ({ page }) => {
  await entrarComo(page, ADMIN);
  await page.goto("/configuracoes/academico?aba=vinculos");

  await page.getByRole("button", { name: "Novo vínculo" }).click();
  const modal = page.getByRole("dialog", { name: "Novo vínculo de professor" });

  await modal.getByLabel("Curso", { exact: true }).click();
  await page.getByRole("option", { name: "Sistemas de Informação" }).click();
  await modal.getByLabel("Professor").click();
  await page.getByRole("option", { name: "Ana Beatriz Moura" }).click();
  await modal.getByLabel("Disciplina").click();
  await page.getByRole("option", { name: /^Engenharia de Software/ }).click();
  await modal.getByLabel("Turma").click();
  await page
    .getByRole("option", { name: "SI 8º semestre A", exact: true })
    .click();
  await expect(modal.getByLabel("Período letivo")).toHaveValue("2026.2");
  await modal.getByRole("button", { name: "Salvar" }).click();

  await expect(
    modal.getByText("Este vínculo já está cadastrado para o período."),
  ).toBeVisible();
});

test("o vínculo só oferece disciplinas e turmas do curso escolhido", async ({
  page,
}) => {
  await entrarComo(page, ADMIN);
  await page.goto("/configuracoes/academico?aba=vinculos");

  await page.getByRole("button", { name: "Novo vínculo" }).click();
  const modal = page.getByRole("dialog", { name: "Novo vínculo de professor" });

  await expect(modal.getByLabel("Disciplina")).toBeDisabled();
  await expect(modal.getByLabel("Turma")).toBeDisabled();

  await modal.getByLabel("Curso", { exact: true }).click();
  await page.getByRole("option", { name: "Sistemas de Informação" }).click();

  await modal.getByLabel("Disciplina").click();
  await expect(
    page.getByRole("option", { name: /^Engenharia de Software/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("option", { name: /^Saúde Coletiva/ }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");

  await modal.getByLabel("Turma").click();
  await expect(
    page.getByRole("option", { name: /^SI 8º semestre A/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("option", { name: /^ENF 6º semestre A/ }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");

  await modal.getByLabel("Curso", { exact: true }).click();
  await page.getByRole("option", { name: "Enfermagem" }).click();
  await expect(modal.getByLabel("Disciplina")).toContainText("Selecione");
});

test("curso em uso não pode ser excluído; curso novo sim", async ({ page }) => {
  const curso = `${PREFIXO_TESTE} Biomedicina`;

  await entrarComo(page, ADMIN);
  await page.goto("/configuracoes/academico");

  await page
    .locator('[data-registro="Enfermagem"]')
    .getByRole("button", { name: /Ações de/ })
    .click();
  await page.getByRole("menuitem", { name: "Excluir" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Excluir" })
    .click();
  await expect(
    page.getByText("Este curso tem turmas, disciplinas, alunos ou palestras"),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Voltar" })
    .click();

  await page.getByRole("button", { name: "Novo curso" }).click();
  const modal = page.getByRole("dialog", { name: "Novo curso" });
  await modal.getByLabel("Nome").fill(curso);
  await modal.getByLabel("Departamento").fill("Ciências da Saúde");
  await modal.getByRole("button", { name: "Salvar" }).click();
  await expect(modal).toBeHidden();

  const linha = page.locator(`[data-registro="${curso}"]`);
  await linha.getByRole("button", { name: /Ações de/ }).click();
  await page.getByRole("menuitem", { name: "Excluir" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Excluir" })
    .click();
  await expect(linha).toHaveCount(0);
});

test("quem não administra não abre o cadastro acadêmico", async ({ page }) => {
  await entrarComo(page, PROFESSOR);
  await page.goto("/configuracoes/academico");

  await expect(page).toHaveURL(/\/reservas/);
});
