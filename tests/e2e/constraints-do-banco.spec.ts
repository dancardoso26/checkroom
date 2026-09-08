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
  type LinhaReserva,
} from "./helpers/banco";

/**
 * AS CONSTRAINTS DE EXCLUSÃO DO POSTGRESQL
 *
 * Nenhum destes testes abre o navegador nem chama a aplicação. Eles inserem
 * direto na API REST, que é o mesmo caminho de um INSERT digitado no editor SQL
 * do Supabase.
 *
 * Essa escolha é o ponto do arquivo. validateBooking julga o pedido contra uma
 * fotografia do banco tirada momentos antes, e entre a consulta e a gravação
 * outra reserva pode ter sido criada. Só as constraints, avaliadas dentro da
 * transação do INSERT, sobrevivem a duas requisições simultâneas.
 *
 * Se algum destes testes passar a aceitar a inserção, a garantia de integridade
 * deixou de existir, e nenhum teste unitário perceberia.
 */

/** A reserva do seed contra a qual os conflitos são testados. */
const RESERVA_BASE = "Aula de Engenharia de Software";

test.describe("constraints de sobreposição", () => {
  let base: LinhaReserva;
  let salaLivre: string;
  let professorLivre: string;
  let turmaLivre: string;

  test.beforeAll(async () => {
    await limparReservasDeTeste();

    const [reservas, salas, professores, turmas] = await Promise.all([
      listarReservas(),
      listarEspacos(),
      listarProfessores(),
      listarTurmas(),
    ]);

    const encontrada = reservas.find((r) => r.purpose === RESERVA_BASE);
    expect(
      encontrada,
      `A reserva "${RESERVA_BASE}" não está no banco. Rode supabase/seed.sql antes desta suíte.`
    ).toBeDefined();
    base = encontrada!;

    // Quem já está ocupado no período da reserva base. Escolher um professor ou
    // uma turma desta lista faria a constraint errada disparar primeiro, e o
    // teste mediria outra coisa.
    const inicio = new Date(base.starts_at);
    const fim = new Date(base.ends_at);
    const sobrepostas = reservas.filter(
      (r) => new Date(r.starts_at) < fim && new Date(r.ends_at) > inicio
    );

    const ocupadas = {
      salas: new Set(sobrepostas.map((r) => r.room_id)),
      professores: new Set(sobrepostas.map((r) => r.professor_id)),
      turmas: new Set(sobrepostas.map((r) => r.class_id)),
    };

    salaLivre = salas.find((s) => !ocupadas.salas.has(s.id))!.id;
    professorLivre = professores.find((p) => !ocupadas.professores.has(p.id))!.id;
    turmaLivre = turmas.find((t) => !ocupadas.turmas.has(t.id))!.id;
  });

  test.afterAll(async () => {
    await limparReservasDeTeste();
  });

  test("recusa duas reservas no mesmo espaço e horário", async () => {
    const resultado = await inserirReservaDireto({
      room_id: base.room_id,
      professor_id: professorLivre,
      class_id: turmaLivre,
      purpose: `${PREFIXO_TESTE} conflito de espaço`,
      starts_at: base.starts_at,
      ends_at: base.ends_at,
    });

    expect(resultado.aceitou).toBe(false);
    // 23P01 é o código do PostgreSQL para exclusion_violation. O nome da
    // constraint faz parte da interface: bookingRepository o lê para saber qual
    // dos três conflitos ocorreu.
    expect(resultado.codigo).toBe("23P01");
    expect(resultado.mensagem).toContain("bookings_no_room_overlap");
  });

  test("recusa o mesmo professor em dois espaços ao mesmo tempo", async () => {
    const resultado = await inserirReservaDireto({
      room_id: salaLivre,
      professor_id: base.professor_id,
      class_id: turmaLivre,
      purpose: `${PREFIXO_TESTE} conflito de professor`,
      starts_at: base.starts_at,
      ends_at: base.ends_at,
    });

    expect(resultado.aceitou).toBe(false);
    expect(resultado.mensagem).toContain("bookings_no_professor_overlap");
  });

  test("recusa a mesma turma em dois espaços ao mesmo tempo", async () => {
    const resultado = await inserirReservaDireto({
      room_id: salaLivre,
      professor_id: professorLivre,
      class_id: base.class_id,
      purpose: `${PREFIXO_TESTE} conflito de turma`,
      starts_at: base.starts_at,
      ends_at: base.ends_at,
    });

    expect(resultado.aceitou).toBe(false);
    expect(resultado.mensagem).toContain("bookings_no_class_overlap");
  });

  test("aceita uma reserva que começa quando a anterior termina", async () => {
    // O contraponto dos três acima, e tão importante quanto. Uma implementação
    // que recusasse tudo passaria em todos os testes de recusa e inviabilizaria
    // qualquer grade horária encadeada.
    const fim = new Date(base.ends_at);
    const duasHorasDepois = new Date(fim.getTime() + 100 * 60 * 1000);

    const resultado = await inserirReservaDireto({
      room_id: base.room_id,
      professor_id: base.professor_id,
      class_id: base.class_id,
      purpose: `${PREFIXO_TESTE} encostada`,
      starts_at: fim.toISOString(),
      ends_at: duasHorasDepois.toISOString(),
    });

    expect(resultado.aceitou).toBe(true);

    if (resultado.id) await apagarReserva(resultado.id);
  });

  test("recusa um período com término anterior ao início", async () => {
    // Sem este check, o período invertido produziria um intervalo vazio, e
    // intervalo vazio não se sobrepõe a nada: a reserva escaparia das três
    // constraints de exclusão e ficaria invisível à detecção de conflito.
    const resultado = await inserirReservaDireto({
      room_id: salaLivre,
      professor_id: professorLivre,
      class_id: turmaLivre,
      purpose: `${PREFIXO_TESTE} invertida`,
      starts_at: base.ends_at,
      ends_at: base.starts_at,
    });

    expect(resultado.aceitou).toBe(false);
    // 23514 é violação de check constraint, e não de exclusão.
    expect(resultado.codigo).toBe("23514");
    expect(resultado.mensagem).toContain("bookings_period_valid");
  });
});
