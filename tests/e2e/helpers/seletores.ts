import type { Locator, Page } from "@playwright/test";

const porExtenso = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export async function escolherData(
  page: Page,
  escopo: Locator,
  rotulo: string,
  chave: string
) {
  await escopo.getByLabel(rotulo, { exact: true }).click();

  const dia = page.getByRole("button", {
    name: porExtenso.format(new Date(`${chave}T00:00:00Z`)),
    exact: true,
  });

  for (let i = 0; i < 48 && !(await dia.isVisible()); i++) {
    await page.getByRole("button", { name: "Próximo mês" }).click();
  }

  await dia.click();
}

export async function escolherHora(
  page: Page,
  escopo: Locator,
  rotulo: string,
  horario: string
) {
  const [hora, minuto] = horario.split(":");

  await escopo.getByLabel(rotulo, { exact: true }).click();
  await page
    .getByRole("group", { name: "Hora" })
    .getByRole("button", { name: hora, exact: true })
    .click();
  await page
    .getByRole("group", { name: "Min" })
    .getByRole("button", { name: minuto, exact: true })
    .click();
}

export async function marcarCursos(page: Page, escopo: Locator, cursos: string[]) {
  if (cursos.length === 0) return;

  await escopo.getByLabel("Cursos de destino").click();
  for (const curso of cursos) {
    await page.getByLabel("Pesquisar cursos").fill(curso);
    await page.getByRole("checkbox", { name: curso }).check();
  }
  await page.keyboard.press("Escape");
}
