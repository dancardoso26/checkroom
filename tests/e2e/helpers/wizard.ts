import { expect, type Page } from "@playwright/test";

/**
 * AÇÕES DO FORMULÁRIO DE RESERVA
 *
 * Concentra o "como" mexer na tela para que os testes falem apenas do "o quê".
 *
 * Sem isto, cada teste repetiria a sequência de cliques do seletor de horário,
 * e trocar aquele componente, coisa que já aconteceu três vezes neste projeto,
 * exigiria reescrever a suíte inteira. Aqui, muda um arquivo.
 */

/** As colunas do seletor de horário, na ordem em que aparecem. */
function colunaDoHorario(page: Page, indice: 0 | 1) {
  return page.locator('[data-slot="popover-content"] > div > div').nth(indice);
}

export async function escolherHorario(
  page: Page,
  campo: "startField" | "endField",
  horario: `${string}:${string}`
) {
  const [hora, minuto] = horario.split(":");

  await page.click(`#${campo}`);
  await colunaDoHorario(page, 0).getByText(hora, { exact: true }).click();
  await colunaDoHorario(page, 1).getByText(minuto, { exact: true }).click();

  // O seletor fecha ao completar a escolha. Esperar por isso evita que o clique
  // seguinte caia sobre o popover ainda aberto.
  await expect(page.locator(`#${campo}`)).toHaveText(horario);
}

export type TipoDeAtividade =
  | "Aula"
  | "Palestra"
  | "Prova"
  | "Defesa"
  | "Evento";

/**
 * A ordem dos campos importa e reflete a da tela: o professor define quais
 * turmas aparecem, e a turma define quais disciplinas. Preencher fora de ordem
 * encontraria listas ainda vazias.
 */
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

export async function avancar(page: Page) {
  await page.getByRole("button", { name: "Continuar" }).click();
}

/**
 * Espera a análise do servidor terminar.
 *
 * O botão fica desabilitado enquanto ela acontece, então esperar por ele
 * habilitado é mais confiável do que esperar um tempo fixo. Quando há conflito
 * ele nunca habilita, e por isso o teste que verifica bloqueio não usa esta
 * função.
 */
export async function esperarAnalise(page: Page) {
  await expect(page.getByRole("button", { name: "Continuar" })).toBeEnabled({
    timeout: 20_000,
  });
}

/** Os cartões de espaço que podem ser escolhidos. */
export function espacosDisponiveis(page: Page) {
  return page.locator('[role="radio"][aria-disabled="false"]');
}

export function espacosIncompativeis(page: Page) {
  return page.locator('[role="radio"][aria-disabled="true"]');
}
