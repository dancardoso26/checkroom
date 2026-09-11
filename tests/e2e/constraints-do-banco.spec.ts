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
