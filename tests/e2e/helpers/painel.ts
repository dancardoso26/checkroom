import { expect, type Page } from "@playwright/test";

export function diaLocal(instante: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(instante));
}

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

export function blocoDaReserva(page: Page, finalidade: string) {
  return page.locator("[data-reserva]").filter({ hasText: finalidade });
}

export async function abrirDetalhe(page: Page, finalidade: string) {
  const detalhe = page.getByRole("dialog", { name: finalidade });

  await expect(async () => {
    if (!(await detalhe.isVisible())) {
      await blocoDaReserva(page, finalidade).click({ timeout: 2_000 });
    }
    await expect(detalhe).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 15_000 });

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
  "Aula" | "Palestra" | "Prova" | "Evento";

export async function preencherAtividade(
  page: Page,
  dados: {
    finalidade: string;
    professor: string;
    turma: string;
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

export async function irParaEspacos(page: Page) {
  await expect(botaoVerEspacos(page)).toBeEnabled({ timeout: 20_000 });
  await botaoVerEspacos(page).click();
}

export async function marcarItens(page: Page, itens: string[]) {
  await page.click("#resourcesField");
  for (const item of itens) {
    await page.getByRole("checkbox", { name: item }).check();
  }
  await page.keyboard.press("Escape");
}

export function espacosDisponiveis(page: Page) {
  return page.locator('[role="radio"][aria-disabled="false"]');
}

export function espacosIncompativeis(page: Page) {
  return page.locator('[role="radio"][aria-disabled="true"]');
}
