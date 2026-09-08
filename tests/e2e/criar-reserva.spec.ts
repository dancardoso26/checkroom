import { test, expect } from "@playwright/test";
import { limparReservasDeTeste, PREFIXO_TESTE } from "./helpers/banco";
import {
  avancar,
  escolherHorario,
  esperarAnalise,
  espacosDisponiveis,
  espacosIncompativeis,
  preencherAtividade,
} from "./helpers/wizard";

/**
 * CRIAÇÃO DE RESERVA PELO NAVEGADOR
 *
 * Percorre o formulário como um professor faria, e verifica o roteiro descrito
 * no fim de supabase/seed.sql.
 *
 * O QUE ESTA SUÍTE PEGA E OS TESTES UNITÁRIOS NÃO
 *
 * Os testes do domínio provam que validateBooking decide certo. Não provam que
 * a decisão chega à tela, que o formulário envia o que mostra, nem que o
 * caminho inteiro funciona junto.
 *
 * Três defeitos reais deste projeto viveram exatamente nesse vão: o botão
 * "Continuar" que criava a reserva pulando a revisão, o formulário que apagava
 * tudo ao recusar, e o campo de horário que oferecia opções inválidas. Os 70
 * testes unitários passavam durante os três.
 *
 * DEPENDÊNCIA DO SEED
 *
 * Os cenários usam os dados de supabase/seed.sql: a aula de segunda das 19h às
 * 20h40 com Ana Beatriz Moura e a turma SI 8º semestre A, e a sala 102 sem
 * projetor. Sem o seed aplicado, a suíte falha por falta de dado, não por
 * defeito no sistema.
 */

/**
 * A próxima segunda-feira, que é o dia usado pelas reservas do seed.
 *
 * Duas armadilhas aqui, e as duas custaram uma execução vermelha.
 *
 * A primeira é o cálculo: quando hoje já é segunda, a resposta precisa ser a
 * segunda seguinte, e não hoje. O "|| 7" cobre esse caso, porque o resto zero
 * significa "estamos no dia".
 *
 * A segunda é a formatação. toISOString converte para UTC antes de recortar, e
 * à noite isso adianta a data em um dia. As partes locais são montadas à mão
 * justamente para evitar essa conversão.
 */
function proximaSegunda(): string {
  const hoje = new Date();
  const diasAteSegunda = (8 - hoje.getDay()) % 7 || 7;

  const alvo = new Date(hoje);
  alvo.setDate(hoje.getDate() + diasAteSegunda);

  const mes = String(alvo.getMonth() + 1).padStart(2, "0");
  const dia = String(alvo.getDate()).padStart(2, "0");

  return `${alvo.getFullYear()}-${mes}-${dia}`;
}

const SEGUNDA = proximaSegunda();

test.beforeEach(async () => {
  await limparReservasDeTeste();
});

test.afterAll(async () => {
  await limparReservasDeTeste();
});

test("cria uma reserva válida do início ao fim", async ({ page }) => {
  await page.goto("/reservas/nova");

  await preencherAtividade(page, {
    finalidade: `${PREFIXO_TESTE} aula de laboratório`,
    professor: "Marina",
    turma: "ENF 6",
    disciplina: "Saúde Coletiva",
  });
  await avancar(page);

  await page.fill("#dateField", SEGUNDA);
  await escolherHorario(page, "startField", "07:00");
  await escolherHorario(page, "endField", "08:40");

  await expect(page.getByText("Horário disponível")).toBeVisible();
  await esperarAnalise(page);
  await avancar(page);

  // Etapa de necessidades: segue sem exigir recurso nenhum, que é o caso de uma
  // aula expositiva em sala comum.
  await avancar(page);

  await expect(espacosDisponiveis(page).first()).toBeVisible({ timeout: 20_000 });
  await espacosDisponiveis(page).first().click();
  await avancar(page);

  await expect(page.getByText("Revise antes de confirmar")).toBeVisible();
  await page.getByRole("button", { name: "Confirmar reserva" }).click();

  await expect(page.getByText("Reserva confirmada")).toBeVisible({
    timeout: 25_000,
  });

  // A reserva precisa aparecer na agenda, e não apenas na tela de sucesso.
  await page.goto("/reservas");
  await expect(
    page.getByText(`${PREFIXO_TESTE} aula de laboratório`)
  ).toBeVisible();
});

test("impede avançar quando o professor e a turma já têm compromisso", async ({
  page,
}) => {
  await page.goto("/reservas/nova");

  // Ana e a turma SI 8º A têm aula na segunda das 19h às 20h40, pelo seed.
  await preencherAtividade(page, {
    finalidade: `${PREFIXO_TESTE} conflito`,
    professor: "Ana",
    turma: "SI 8",
  });
  await avancar(page);

  await page.fill("#dateField", SEGUNDA);
  await escolherHorario(page, "startField", "19:00");
  await escolherHorario(page, "endField", "20:40");

  await expect(page.getByText("Conflito de agenda")).toBeVisible({
    timeout: 20_000,
  });

  // Nenhuma escolha de espaço resolve um conflito de agenda, então o avanço
  // fica bloqueado em vez de levar o usuário a uma recusa três telas adiante.
  await expect(page.getByRole("button", { name: "Continuar" })).toBeDisabled();
});

test("mostra por que cada espaço incompatível foi descartado", async ({
  page,
}) => {
  await page.goto("/reservas/nova");

  // A turma SI 4º B tem 55 alunos e não cabe em nenhum espaço além do
  // auditório, e a exigência de projetor descarta a sala 102.
  await preencherAtividade(page, {
    finalidade: `${PREFIXO_TESTE} incompatíveis`,
    professor: "Carlos",
    turma: "SI 4",
  });
  await avancar(page);

  await page.fill("#dateField", SEGUNDA);
  await escolherHorario(page, "startField", "09:00");
  await escolherHorario(page, "endField", "10:40");
  await esperarAnalise(page);
  await avancar(page);

  await page.locator("fieldset").getByText("Projetor", { exact: true }).click();
  await avancar(page);

  await expect(espacosDisponiveis(page).first()).toBeVisible({ timeout: 20_000 });

  // O ponto da tela: os incompatíveis continuam visíveis, com o motivo escrito,
  // em vez de simplesmente sumirem da lista.
  await expect(espacosIncompativeis(page).first()).toBeVisible();
  // Vários espaços recusam a mesma turma, então a asserção conta as ocorrências
  // em vez de exigir uma só. O que interessa é que o motivo apareça escrito.
  await expect(
    page.getByText(/comporta \d+ pessoas e a turma tem 55/).first()
  ).toBeVisible();
});

test("preserva o preenchimento quando a reserva é recusada", async ({ page }) => {
  // O React 19 limpa um formulário com action assim que ela termina, e nos
  // componentes do Radix isso zerava os seletores. Recusar uma reserva e
  // devolver o formulário em branco obrigaria a preencher tudo de novo.
  await page.goto("/reservas/nova");

  await preencherAtividade(page, {
    finalidade: `${PREFIXO_TESTE} preservar`,
    professor: "Marina",
    turma: "ENF 6",
  });

  await expect(page.locator("#professorField")).toContainText("Marina");
  await avancar(page);

  await page.fill("#dateField", SEGUNDA);
  await escolherHorario(page, "startField", "11:00");
  await escolherHorario(page, "endField", "12:40");
  await esperarAnalise(page);

  // Voltar e conferir que a etapa anterior continua preenchida.
  await page.getByRole("button", { name: "Voltar" }).click();
  await expect(page.locator("#purposeField")).toHaveValue(
    `${PREFIXO_TESTE} preservar`
  );
  await expect(page.locator("#professorField")).toContainText("Marina");
});

test("recusa quando o professor não leciona a disciplina para a turma", async ({
  page,
}) => {
  // Marina leciona Saúde Coletiva para ENF 6º, não Banco de Dados II para SI 8º.
  // Todos os horários estão livres: o que impede a reserva é só o vínculo.
  await page.goto("/reservas/nova");

  await preencherAtividade(page, {
    finalidade: `${PREFIXO_TESTE} sem vínculo`,
    professor: "Marina",
    turma: "SI 8",
    disciplina: "Banco de Dados II",
  });
  await avancar(page);

  await page.fill("#dateField", SEGUNDA);
  await escolherHorario(page, "startField", "14:00");
  await escolherHorario(page, "endField", "15:40");

  await expect(page.getByText(/não leciona a disciplina/)).toBeVisible({
    timeout: 20_000,
  });

  // O vínculo não se resolve escolhendo outro espaço, então o avanço fica
  // bloqueado pelo mesmo motivo do conflito de agenda.
  await expect(page.getByRole("button", { name: "Continuar" })).toBeDisabled();
});

test("aceita atividade sem disciplina, como seminário ou defesa", async ({
  page,
}) => {
  await page.goto("/reservas/nova");

  await preencherAtividade(page, {
    finalidade: `${PREFIXO_TESTE} defesa de TCC`,
    professor: "Marina",
    turma: "SI 8",
    // Sem disciplina de propósito.
  });
  await avancar(page);

  await page.fill("#dateField", SEGUNDA);
  await escolherHorario(page, "startField", "16:00");
  await escolherHorario(page, "endField", "17:40");

  await expect(page.getByText("Horário disponível")).toBeVisible({
    timeout: 20_000,
  });
  await esperarAnalise(page);
});

test("oferece apenas horários dentro do expediente", async ({ page }) => {
  await page.goto("/reservas/nova");

  await preencherAtividade(page, {
    finalidade: `${PREFIXO_TESTE} horários`,
    professor: "Marina",
    turma: "ENF 6",
  });
  await avancar(page);

  await page.click("#startField");

  const horas = page.locator('[data-slot="popover-content"] > div > div').first();

  await expect(horas.getByText("07", { exact: true })).toBeVisible();

  // A hora 22 não pode aparecer no início: o término precisa ser posterior, e o
  // expediente acaba às 22:00. Escolhê-la deixaria o usuário sem saída.
  await expect(horas.getByText("22", { exact: true })).toHaveCount(0);
});
