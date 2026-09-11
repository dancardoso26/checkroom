import { test, expect } from "@playwright/test";
import {
  apagarReserva,
  inserirReservaDireto,
  listarEspacos,
  listarProfessores,
  listarReservas,
  listarTurmas,
  limparReservasDeTeste,
  PREFIXO_TESTE,
} from "./helpers/banco";

let salaLivre: string;
let professorLivre: string;
let turmaLivre: string;
let inicio: string;
let fim: string;

test.beforeAll(async () => {
  await limparReservasDeTeste();

  const [salas, professores, turmas, reservas] = await Promise.all([
    listarEspacos(),
    listarProfessores(),
    listarTurmas(),
    listarReservas(),
  ]);

  // Um horário em que nada do seed acontece: quinta-feira da próxima semana.
  const hoje = new Date();
  const diasAteQuinta = (11 - hoje.getDay()) % 7 || 7;
  const quinta = new Date(hoje);
  quinta.setDate(hoje.getDate() + diasAteQuinta + 7);
  quinta.setHours(15, 0, 0, 0);

  inicio = quinta.toISOString();
  fim = new Date(quinta.getTime() + 100 * 60 * 1000).toISOString();

  const ocupadas = reservas.filter(
    (r) => new Date(r.starts_at) < new Date(fim) && new Date(r.ends_at) > quinta
  );

  salaLivre = salas.find(
    (s) => !ocupadas.some((r) => r.room_id === s.id)
  )!.id;
  professorLivre = professores.find(
    (p) => !ocupadas.some((r) => r.professor_id === p.id)
  )!.id;
  turmaLivre = turmas.find(
    (t) => !ocupadas.some((r) => r.class_id === t.id)
  )!.id;
});

test.afterAll(async () => {
  await limparReservasDeTeste();
});

test("cancela pela listagem e some da agenda", async ({ page }) => {
  const criada = await inserirReservaDireto({
    room_id: salaLivre,
    professor_id: professorLivre,
    class_id: turmaLivre,
    purpose: `${PREFIXO_TESTE} a cancelar`,
    starts_at: inicio,
    ends_at: fim,
  });

  expect(criada.aceitou).toBe(true);

  await page.goto("/reservas");

  const cartao = page
    .locator('[data-slot="card"]')
    .filter({ hasText: `${PREFIXO_TESTE} a cancelar` });

  await expect(cartao).toBeVisible();

  await cartao.getByRole("button", { name: /Ações da reserva/ }).click();
  await page.getByRole("menuitem", { name: "Cancelar" }).click();
  await page.getByLabel(/Motivo/).fill("Professor afastado");
  await page.getByRole("button", { name: "Confirmar" }).click();

  // A asserção é sobre o cartão, e não sobre o texto: a confirmação aberta
  // repete a descrição da reserva, e procurar pelo texto encontraria os dois.
  await expect(cartao).toBeHidden({ timeout: 15_000 });
});

test("a reserva cancelada continua no banco, com data e motivo", async () => {
  // É o que diferencia cancelar de apagar. Sem o registro, "quem cancelou a aula
  // de sexta e por quê" não teria resposta.
  const reservas = await listarReservas();
  const cancelada = reservas.find(
    (r) => r.purpose === `${PREFIXO_TESTE} a cancelar`
  );

  expect(cancelada, "a reserva cancelada não deveria sumir da tabela").toBeDefined();
  expect(cancelada!.status).toBe("cancelled");
  expect(cancelada!.cancelled_at).not.toBeNull();
  expect(cancelada!.cancellation_reason).toBe("Professor afastado");
});

test("cancelar libera o horário para uma nova reserva", async () => {
  const resultado = await inserirReservaDireto({
    room_id: salaLivre,
    professor_id: professorLivre,
    class_id: turmaLivre,
    purpose: `${PREFIXO_TESTE} ocupa o horario liberado`,
    starts_at: inicio,
    ends_at: fim,
  });

  expect(
    resultado.aceitou,
    `o horário deveria estar livre, mas o banco recusou: ${resultado.mensagem}`
  ).toBe(true);

  if (resultado.id) await apagarReserva(resultado.id);
});
