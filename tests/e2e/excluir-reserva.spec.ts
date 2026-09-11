import { test, expect } from "@playwright/test";
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
  turmaLivre = turmas.find((t) => !ocupadas.some((r) => r.class_id === t.id))!.id;
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

test("exclui pela listagem e a reserva some do banco", async ({ page }) => {
  const id = await criarReservaDeTeste("a excluir");
  await vincularRecursos(id, recursos);

  expect(await contarRecursosDaReserva(id)).toBe(recursos.length);

  await page.goto("/reservas");

  const cartao = page
    .locator('[data-slot="card"]')
    .filter({ hasText: `${PREFIXO_TESTE} a excluir` });

  await expect(cartao).toBeVisible();

  await cartao.getByRole("button", { name: /Ações da reserva/ }).click();
  await page.getByRole("menuitem", { name: "Excluir" }).click();
  await page.getByRole("button", { name: "Excluir", exact: true }).click();

  await expect(cartao).toBeHidden({ timeout: 15_000 });

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

test("exclui uma reserva já cancelada, pelo filtro da listagem", async ({
  page,
}) => {
  const id = await criarReservaDeTeste("desmarcar e remover");

  await page.goto("/reservas");

  const cartao = page
    .locator('[data-slot="card"]')
    .filter({ hasText: `${PREFIXO_TESTE} desmarcar e remover` });

  await cartao.getByRole("button", { name: /Ações da reserva/ }).click();
  await page.getByRole("menuitem", { name: "Cancelar" }).click();
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(cartao).toBeHidden({ timeout: 15_000 });

  // Sem o filtro, a cancelada ficaria fora de alcance para sempre: some da tela
  // mas continua no banco.
  await page.goto("/reservas?canceladas=1");

  const cartaoCancelado = page
    .locator('[data-slot="card"]')
    .filter({ hasText: `${PREFIXO_TESTE} desmarcar e remover` });

  await expect(cartaoCancelado).toBeVisible();
  await expect(
    cartaoCancelado.getByText("Cancelada", { exact: true })
  ).toBeVisible();

  await cartaoCancelado.getByRole("button", { name: /Ações da reserva/ }).click();
  await page.getByRole("menuitem", { name: "Excluir" }).click();
  await page.getByRole("button", { name: "Excluir", exact: true }).click();

  await expect(cartaoCancelado).toBeHidden({ timeout: 15_000 });
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
