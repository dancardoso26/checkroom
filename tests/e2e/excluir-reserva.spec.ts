import { test, expect, type Page } from "@playwright/test";
import { ADMIN, entrarComo } from "./helpers/autenticacao";
import { abrirDetalhe, blocoDaReserva, semanaDoDia } from "./helpers/painel";
import {
  apagarReserva,
  buscarReserva,
  contarRecursosDaReserva,
  inserirReservaDireto,
  listarEspacos,
  listarProfessores,
  listarRecursos,
  listarReservas,
  listarTurmas,
  limparReservasDeTeste,
  vincularRecursos,
  PREFIXO_TESTE,
} from "./helpers/banco";

let salaLivre: string;
let professorLivre: string;
let turmaLivre: string;
let recursos: string[];
let inicio: string;
let fim: string;

test.beforeAll(async () => {
  await limparReservasDeTeste();

  const [salas, professores, turmas, todosRecursos, reservas] =
    await Promise.all([
      listarEspacos(),
      listarProfessores(),
      listarTurmas(),
      listarRecursos(),
      listarReservas(),
    ]);

  // Sexta-feira da semana seguinte, longe de tudo o que o seed cria.
  const hoje = new Date();
  const diasAteSexta = (12 - hoje.getDay()) % 7 || 7;
  const sexta = new Date(hoje);
  sexta.setDate(hoje.getDate() + diasAteSexta + 7);
  sexta.setHours(14, 0, 0, 0);

  inicio = sexta.toISOString();
  fim = new Date(sexta.getTime() + 100 * 60 * 1000).toISOString();

  const ocupadas = reservas.filter(
    (r) => new Date(r.starts_at) < new Date(fim) && new Date(r.ends_at) > sexta
  );

  salaLivre = salas.find((s) => !ocupadas.some((r) => r.room_id === s.id))!.id;
  professorLivre = professores.find(
    (p) => !ocupadas.some((r) => r.professor_id === p.id)
  )!.id;
  turmaLivre = turmas.find(
    (t) => !ocupadas.some((r) => r.class_id === t.id)
  )!.id;
  recursos = todosRecursos.slice(0, 2).map((r) => r.id);
});

test.afterAll(async () => {
  await limparReservasDeTeste();
});

async function criarReservaDeTeste(sufixo: string) {
  const criada = await inserirReservaDireto({
    room_id: salaLivre,
    professor_id: professorLivre,
    class_id: turmaLivre,
    purpose: `${PREFIXO_TESTE} ${sufixo}`,
    starts_at: inicio,
    ends_at: fim,
  });

  expect(criada.aceitou, criada.mensagem ?? "").toBe(true);
  return criada.id!;
}

// O detalhe e a confirmação têm um botão Excluir cada; o da confirmação é o
// último a abrir.
async function confirmarExclusao(page: Page) {
  await page
    .getByRole("button", { name: "Excluir", exact: true })
    .last()
    .click();
}

test.beforeEach(async ({ page }) => {
  await entrarComo(page, ADMIN);
});

test("exclui pelo detalhe e a reserva some do banco", async ({ page }) => {
  const id = await criarReservaDeTeste("a excluir");
  await vincularRecursos(id, recursos);

  expect(await contarRecursosDaReserva(id)).toBe(recursos.length);

  await page.goto(semanaDoDia(inicio));

  const detalhe = await abrirDetalhe(page, `${PREFIXO_TESTE} a excluir`);

  await detalhe.getByRole("button", { name: "Excluir" }).click();
  await confirmarExclusao(page);

  await expect(blocoDaReserva(page, `${PREFIXO_TESTE} a excluir`)).toBeHidden({
    timeout: 15_000,
  });

  // A asserção que dá sentido ao arquivo: cancelar deixaria a linha no banco.
  expect(
    await buscarReserva(id),
    "a reserva excluída não deveria continuar no banco"
  ).toBeNull();
});

test("os recursos vinculados somem junto", async () => {
  // Prova o "on delete cascade" de booking_resources. Sem ele, sobrariam linhas
  // apontando para uma reserva que não existe mais.
  const id = await criarReservaDeTeste("cascade");
  await vincularRecursos(id, recursos);

  expect(await contarRecursosDaReserva(id)).toBe(recursos.length);

  await apagarReserva(id);

  expect(await contarRecursosDaReserva(id)).toBe(0);
});

test("exclui uma reserva já cancelada, pelo filtro de canceladas", async ({
  page,
}) => {
  const id = await criarReservaDeTeste("desmarcar e remover");

  const finalidade = `${PREFIXO_TESTE} desmarcar e remover`;

  await page.goto(semanaDoDia(inicio));

  const detalhe = await abrirDetalhe(page, finalidade);

  await detalhe.getByRole("button", { name: "Cancelar reserva" }).click();
  await page.getByLabel("Motivo").fill("Turma reagendada");
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(blocoDaReserva(page, finalidade)).toBeHidden({
    timeout: 15_000,
  });

  // Sem o filtro, a cancelada ficaria fora de alcance para sempre: some da tela
  // mas continua no banco.
  await page.goto(semanaDoDia(inicio, true));

  const cancelada = await abrirDetalhe(page, finalidade);

  await expect(
    cancelada.getByRole("button", { name: "Cancelar reserva" })
  ).toBeHidden();
  await cancelada.getByRole("button", { name: "Excluir" }).click();
  await confirmarExclusao(page);

  await expect(blocoDaReserva(page, finalidade)).toBeHidden({
    timeout: 15_000,
  });
  expect(await buscarReserva(id)).toBeNull();
});

test("o horário de uma reserva excluída volta a ficar livre", async () => {
  const id = await criarReservaDeTeste("libera horario");

  await apagarReserva(id);

  const nova = await inserirReservaDireto({
    room_id: salaLivre,
    professor_id: professorLivre,
    class_id: turmaLivre,
    purpose: `${PREFIXO_TESTE} ocupa o horario da excluida`,
    starts_at: inicio,
    ends_at: fim,
  });

  expect(
    nova.aceitou,
    `o horário deveria estar livre, mas o banco recusou: ${nova.mensagem}`
  ).toBe(true);

  if (nova.id) await apagarReserva(nova.id);
});
