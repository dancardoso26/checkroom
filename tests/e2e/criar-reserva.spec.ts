import { test, expect } from "@playwright/test";
import { ADMIN, entrarComo } from "./helpers/autenticacao";
import {
  inserirReservaDireto,
  limparReservasDeTeste,
  listarEspacos,
  listarProfessores,
  listarTurmas,
  PREFIXO_TESTE,
} from "./helpers/banco";
import {
  abrirPainel,
  botaoConfirmar,
  espacosDisponiveis,
  botaoVerEspacos,
  espacosIncompativeis,
  irParaEspacos,
  marcarItens,
  preencherAtividade,
} from "./helpers/painel";

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

test.beforeEach(async ({ page }) => {
  await entrarComo(page, ADMIN);
  await limparReservasDeTeste();
});

test.afterAll(async () => {
  await limparReservasDeTeste();
});

test("cria uma reserva válida do início ao fim", async ({ page }) => {
  await abrirPainel(page, { dia: SEGUNDA, inicio: "07:00" });

  await preencherAtividade(page, {
    finalidade: `${PREFIXO_TESTE} aula de laboratório`,
    professor: "Marina",
    turma: "ENF 6",
    disciplina: "Saúde Coletiva",
  });

  // O horário veio do clique: 07:00, e o término sugerido de duas aulas.
  await expect(page.locator("#endField")).toHaveText("08:40");
  await expect(page.getByText("Horário disponível")).toBeVisible({
    timeout: 20_000,
  });

  await irParaEspacos(page);

  await expect(espacosDisponiveis(page).first()).toBeVisible({
    timeout: 20_000,
  });
  await espacosDisponiveis(page).first().click();

  await expect(botaoConfirmar(page)).toBeEnabled();
  await botaoConfirmar(page).click();

  // O painel fecha e a reserva aparece destacada na agenda.
  await expect(page).toHaveURL(/destaque=/, { timeout: 25_000 });
  await expect(page.getByRole("dialog", { name: "Nova reserva" })).toBeHidden();
  await expect(
    page
      .locator("[data-reserva]")
      .filter({ hasText: `${PREFIXO_TESTE} aula de laboratório` })
  ).toBeVisible();
});

test("impede confirmar quando o professor e a turma já têm compromisso", async ({
  page,
}) => {
  // Ana e a turma SI 8º A têm aula na segunda das 19h às 20h40, pelo seed.
  await abrirPainel(page, { dia: SEGUNDA, inicio: "19:00" });

  await preencherAtividade(page, {
    finalidade: `${PREFIXO_TESTE} conflito`,
    professor: "Ana",
    turma: "SI 8",
    disciplina: "Engenharia de Software",
  });

  await expect(page.getByText("Conflito de agenda")).toBeVisible({
    timeout: 20_000,
  });

  // Nenhum espaço resolve um conflito de agenda, então nem se chega à etapa
  // dos espaços, em vez de levar a uma recusa no envio.
  await expect(botaoVerEspacos(page)).toBeDisabled();
});

test("oferece só os espaços disponíveis", async ({ page }) => {
  await abrirPainel(page, { dia: SEGUNDA, inicio: "09:00" });

  // A turma SI 4º B tem 55 alunos e só cabe no auditório; a exigência de
  // projetor descartaria ainda a sala 102.
  await preencherAtividade(page, {
    finalidade: `${PREFIXO_TESTE} incompatíveis`,
    professor: "Carlos",
    turma: "SI 4",
    disciplina: "Banco de Dados II",
  });

  await marcarItens(page, ["Projetor"]);
  await irParaEspacos(page);

  await expect(espacosDisponiveis(page).first()).toBeVisible({
    timeout: 20_000,
  });

  // Os descartados não aparecem: a lista é só do que pode ser escolhido.
  await expect(espacosIncompativeis(page)).toHaveCount(0);
  await expect(page.getByText(/comporta \d+ pessoas/)).toHaveCount(0);
  await expect(page.getByText(/espaços? disponíve(l|is)/)).toBeVisible();
});

// Sem nenhum disponível, a lista vazia não explicaria nada: os descartados
// voltam com o motivo, para o usuário saber o que ajustar.
test("explica por que nenhum espaço serve quando não há disponível", async ({
  page,
}) => {
  const [salas, professores, turmas] = await Promise.all([
    listarEspacos(),
    listarProfessores(),
    listarTurmas(),
  ]);

  // O auditório é o único que comporta 55 alunos; ocupá-lo esgota as opções.
  await inserirReservaDireto({
    room_id: salas.find((s) => s.name === "Auditório")!.id,
    professor_id: professores.find((p) => p.name.startsWith("Marina"))!.id,
    class_id: turmas.find((t) => t.name.startsWith("ENF 6"))!.id,
    purpose: `${PREFIXO_TESTE} ocupa o auditorio`,
    starts_at: new Date(`${SEGUNDA}T09:00:00-03:00`).toISOString(),
    ends_at: new Date(`${SEGUNDA}T10:40:00-03:00`).toISOString(),
  });

  await abrirPainel(page, { dia: SEGUNDA, inicio: "09:00" });

  await preencherAtividade(page, {
    finalidade: `${PREFIXO_TESTE} sem espaco`,
    professor: "Carlos",
    turma: "SI 4",
    disciplina: "Banco de Dados II",
  });

  await irParaEspacos(page);

  await expect(page.getByText("Nenhum espaço disponível")).toBeVisible({
    timeout: 20_000,
  });
  await expect(espacosDisponiveis(page)).toHaveCount(0);
  await expect(espacosIncompativeis(page).first()).toBeVisible();
  await expect(
    page.getByText(/comporta \d+ pessoas e a turma tem 55/).first()
  ).toBeVisible();
});

// Outra reserva ocupa o horário depois que a análise o liberou, e antes do
// envio. O banco recusa, e o formulário precisa continuar preenchido: o
// action do React 19 limparia tudo, e já limpou neste projeto.
test("preserva o preenchimento quando a reserva é recusada no envio", async ({
  page,
}) => {
  await abrirPainel(page, { dia: SEGUNDA, inicio: "11:00" });

  await preencherAtividade(page, {
    finalidade: `${PREFIXO_TESTE} preservar`,
    professor: "Marina",
    turma: "ENF 6",
    disciplina: "Saúde Coletiva",
  });

  await irParaEspacos(page);
  await expect(espacosDisponiveis(page).first()).toBeVisible({
    timeout: 20_000,
  });
  await espacosDisponiveis(page).first().click();
  await expect(botaoConfirmar(page)).toBeEnabled();

  const [salas, professores, turmas] = await Promise.all([
    listarEspacos(),
    listarProfessores(),
    listarTurmas(),
  ]);

  await inserirReservaDireto({
    room_id: salas.find((s) => s.name === "102")!.id,
    professor_id: professores.find((p) => p.name.startsWith("Marina"))!.id,
    class_id: turmas.find((t) => t.name.startsWith("SI 4"))!.id,
    purpose: `${PREFIXO_TESTE} concorrente`,
    starts_at: new Date(`${SEGUNDA}T11:00:00-03:00`).toISOString(),
    ends_at: new Date(`${SEGUNDA}T12:40:00-03:00`).toISOString(),
  });

  await botaoConfirmar(page).click();

  await expect(page.getByText("Não foi possível criar a reserva")).toBeVisible({
    timeout: 20_000,
  });
  // Voltar aos detalhes mostra tudo como estava.
  await page.getByRole("button", { name: "Editar detalhes" }).click();
  await expect(page.locator("#purposeField")).toHaveValue(
    `${PREFIXO_TESTE} preservar`
  );
  await expect(page.locator("#professorField")).toContainText("Marina");
  await expect(page.locator("#startField")).toHaveText("11:00");
});

test("só oferece as turmas com vínculo quando a atividade é aula", async ({
  page,
}) => {
  await abrirPainel(page, { dia: SEGUNDA });

  await page.click("#professorField");
  await page.getByRole("option", { name: "Marina" }).first().click();

  await page.click("#classField");
  const turmas = await page.getByRole("option").allInnerTexts();
  await page.keyboard.press("Escape");

  expect(turmas.some((t) => t.includes("ENF 6"))).toBe(true);
  expect(turmas.some((t) => t.includes("SI 8"))).toBe(false);
});

test("oferece todas as turmas quando a atividade não é aula", async ({
  page,
}) => {
  // Palestra e evento não dependem de vínculo docente, então o filtro sai.
  await abrirPainel(page, { dia: SEGUNDA });

  await page.getByText("Palestra", { exact: true }).click();

  await page.click("#professorField");
  await page.getByRole("option", { name: "Marina" }).first().click();

  await page.click("#classField");
  const turmas = await page.getByRole("option").allInnerTexts();

  expect(turmas.some((t) => t.includes("SI 8"))).toBe(true);
});

test("aceita atividade sem disciplina, como seminário ou defesa", async ({
  page,
}) => {
  await abrirPainel(page, { dia: SEGUNDA, inicio: "16:00" });

  await preencherAtividade(page, {
    finalidade: `${PREFIXO_TESTE} defesa de TCC`,
    professor: "Marina",
    turma: "SI 8",
    // Defesa não pertence a disciplina, e por isso aceita uma turma sem vínculo.
    tipo: "Defesa",
  });

  await expect(page.getByText("Horário disponível")).toBeVisible({
    timeout: 20_000,
  });
  await irParaEspacos(page);
  await expect(espacosDisponiveis(page).first()).toBeVisible({
    timeout: 20_000,
  });
});

test("oferece apenas horários dentro do expediente", async ({ page }) => {
  await abrirPainel(page, { dia: SEGUNDA });

  await page.click("#startField");

  const horas = page
    .locator('[data-slot="popover-content"] > div > div')
    .first();

  await expect(horas.getByText("07", { exact: true })).toBeVisible();

  // A hora 22 não pode aparecer no início: o término precisa ser posterior, e o
  // expediente acaba às 22:00. Escolhê-la deixaria o usuário sem saída.
  await expect(horas.getByText("22", { exact: true })).toHaveCount(0);
});

test("o término escolhido à mão prevalece sobre o sugerido", async ({
  page,
}) => {
  await abrirPainel(page, { dia: SEGUNDA, inicio: "14:00" });

  await expect(page.locator("#endField")).toHaveText("15:40");

  // Trocar só a hora preserva o minuto e fecha o seletor, como no resto do
  // formulário: de 15:40 para a hora 17 fica 17:40.
  await page.click("#endField");
  await page
    .locator('[data-slot="popover-content"] > div > div')
    .first()
    .getByText("17", { exact: true })
    .click();

  await expect(page.locator("#endField")).toHaveText("17:40");
});

test("abre pronto para digitar o título", async ({ page }) => {
  await abrirPainel(page, { dia: SEGUNDA, inicio: "10:00" });

  await expect(page.locator("#purposeField")).toBeFocused();
  await expect(botaoVerEspacos(page)).toBeDisabled();
});

// O seletor de horário abre num popover fora do painel, e o bloqueio de
// rolagem do painel já engoliu a roda do mouse dentro dele.
test("a lista de horas rola com a roda do mouse dentro do painel", async ({
  page,
}) => {
  await abrirPainel(page, { dia: SEGUNDA });
  await page.click("#startField");

  const lista = page
    .locator('[data-slot="popover-content"] .overflow-y-auto')
    .first();

  await lista.hover();
  await page.mouse.wheel(0, 300);

  await expect
    .poll(() => lista.evaluate((e) => e.scrollTop))
    .toBeGreaterThan(0);
});

// A verificação só aparece com a atividade completa: enquanto falta a
// disciplina, o que falta é preenchimento, e não um conflito de agenda.
test("não mostra a verificação da agenda antes de preencher tudo", async ({
  page,
}) => {
  await abrirPainel(page, { dia: SEGUNDA, inicio: "13:00" });

  await preencherAtividade(page, {
    finalidade: `${PREFIXO_TESTE} incompleta`,
    professor: "Marina",
    turma: "ENF 6",
  });

  await expect(page.getByText("Conflito de agenda")).toHaveCount(0);
  await expect(page.getByText("Informe a disciplina")).toHaveCount(0);
  await expect(page.getByText("Horário disponível")).toHaveCount(0);

  await page.click("#subjectField");
  await page.getByRole("option", { name: "Saúde Coletiva" }).click();

  // O resultado aparece depois do campo de itens, e não junto da turma.
  const resultado = page.getByText("Horário disponível");
  await expect(resultado).toBeVisible({ timeout: 20_000 });

  const itens = await page.locator("#resourcesField").boundingBox();
  const mensagem = await resultado.boundingBox();
  expect(mensagem!.y).toBeGreaterThan(itens!.y);
});

test("o calendário próprio escolhe a data e bloqueia dias passados", async ({
  page,
}) => {
  await abrirPainel(page, { dia: SEGUNDA });

  await page.click("#dateField");

  // Hoje é o mínimo: qualquer dia anterior na grade fica desabilitado.
  const hoje = page.locator('[aria-current="date"]');
  await expect(hoje).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Mês anterior" })
  ).toBeDisabled();

  // Escolher um dia fecha o balão e atualiza o campo.
  const alvo = SEGUNDA.split("-").map(Number);
  const proximoDia = new Date(Date.UTC(alvo[0], alvo[1] - 1, alvo[2] + 1));
  const extenso = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(proximoDia);

  await page.getByRole("button", { name: extenso }).click();

  await expect(page.locator("#dateField")).toHaveText(
    proximoDia.toISOString().slice(0, 10).split("-").reverse().join("/")
  );
});

// O Enter segue a etapa: incompleto não faz nada, completo leva aos espaços,
// e nunca cria a reserva direto dos detalhes.
test("o Enter no painel avança de etapa sem pular a escolha do espaço", async ({
  page,
}) => {
  await abrirPainel(page, { dia: SEGUNDA, inicio: "07:00" });

  await page.locator("#purposeField").fill(`${PREFIXO_TESTE} enter`);
  await page.locator("#purposeField").press("Enter");
  await expect(page.locator("#purposeField")).toBeVisible();

  await preencherAtividade(page, {
    finalidade: `${PREFIXO_TESTE} enter`,
    professor: "Marina",
    turma: "ENF 6",
    disciplina: "Saúde Coletiva",
  });
  await expect(botaoVerEspacos(page)).toBeEnabled({ timeout: 20_000 });

  await page.locator("#purposeField").press("Enter");
  await expect(espacosDisponiveis(page).first()).toBeVisible({
    timeout: 20_000,
  });
  await expect(page).not.toHaveURL(/destaque=/);
});
