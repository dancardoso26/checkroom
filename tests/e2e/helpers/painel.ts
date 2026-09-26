import { expect, type Page } from "@playwright/test";

/** O dia de um instante no horário de Brasília, no formato da URL da agenda. */
export function diaLocal(instante: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(instante));
}

// O calendário mostra só o período navegado, então os testes abrem direto na
// semana da reserva em vez de contar com a semana atual.
export function semanaDoDia(
  instante: string | Date,
  canceladas = false
): string {
  const params = new URLSearchParams({
    visao: "calendario",
    escala: "semana",
    data: diaLocal(instante),
  });

  if (canceladas) params.set("status", "todas");
  return `/reservas?${params.toString()}`;
}

/** O bloco da reserva na grade, achado pela finalidade. */
export function blocoDaReserva(page: Page, finalidade: string) {
  return page.locator("[data-reserva]").filter({ hasText: finalidade });
}

/** Abre o detalhe da reserva e devolve o diálogo, com as ações dela. */
export async function abrirDetalhe(page: Page, finalidade: string) {
  await blocoDaReserva(page, finalidade).click();

  const detalhe = page.getByRole("dialog", { name: finalidade });
  await expect(detalhe).toBeVisible();
  return detalhe;
}

export async function abrirPainel(
  page: Page,
  { dia, inicio }: { dia: string; inicio?: string }
) {
  const params = new URLSearchParams({ nova: "1", dia, data: dia });
  if (inicio) params.set("inicio", inicio);

  await page.goto(`/reservas?${params.toString()}`);
  await expect(
    page.getByRole("dialog", { name: "Nova reserva" })
  ).toBeVisible();
}

export type TipoDeAtividade =
  "Aula" | "Palestra" | "Prova" | "Defesa" | "Evento";

export async function preencherAtividade(
  page: Page,
  dados: {
    finalidade: string;
    professor: string;
    turma: string;
    /** Aula é o padrão do formulário; os demais tipos dispensam disciplina. */
    tipo?: TipoDeAtividade;
    disciplina?: string;
  }
) {
  if (dados.tipo && dados.tipo !== "Aula") {
    await page.getByText(dados.tipo, { exact: true }).click();
  }

  await page.fill("#purposeField", dados.finalidade);

  await page.click("#professorField");
  await page.getByRole("option", { name: dados.professor }).first().click();

  await page.click("#classField");
  await page.getByRole("option", { name: dados.turma }).first().click();

  if (dados.disciplina) {
    await page.click("#subjectField");
    await page.getByRole("option", { name: dados.disciplina }).first().click();
  }
}

export function botaoVerEspacos(page: Page) {
  return page.getByRole("button", { name: "Ver espaços" });
}

export function botaoConfirmar(page: Page) {
  return page.getByRole("button", { name: "Reservar", exact: true });
}

/** Passa da etapa de detalhes para a de espaços, que exige a agenda livre. */
export async function irParaEspacos(page: Page) {
  await expect(botaoVerEspacos(page)).toBeEnabled({ timeout: 20_000 });
  await botaoVerEspacos(page).click();
}

/** Marca itens na lista suspensa de necessidades. */
export async function marcarItens(page: Page, itens: string[]) {
  await page.click("#resourcesField");
  for (const item of itens) {
    await page.getByRole("checkbox", { name: item }).check();
  }
  await page.keyboard.press("Escape");
}

/** Os cartões de espaço que podem ser escolhidos. */
export function espacosDisponiveis(page: Page) {
  return page.locator('[role="radio"][aria-disabled="false"]');
}

export function espacosIncompativeis(page: Page) {
  return page.locator('[role="radio"][aria-disabled="true"]');
}
