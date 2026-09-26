import { describe, expect, it } from "vitest";

import { descreverEvento, type Catalogo } from "./descricao";

const catalogo: Catalogo = {
  espacos: new Map([["sala-1", "Bloco A · 101"]]),
  professores: new Map([["prof-1", "Ana Beatriz Moura"]]),
  contas: new Map([["conta-1", "Carlos Lima"]]),
};

const reserva = {
  purpose: "Aula de Engenharia de Software",
  room_id: "sala-1",
  professor_id: "prof-1",
  status: "active",
  starts_at: "2026-09-28T22:00:00Z",
  ends_at: "2026-09-29T23:40:00Z",
  cancellation_reason: null,
};

describe("descrição de reservas", () => {
  it("diz o que, onde, quando e de quem", () => {
    const { acao, detalhe } = descreverEvento(
      {
        action: "insert",
        entity: "bookings",
        beforeState: null,
        afterState: reserva,
      },
      catalogo
    );

    expect(acao).toBe("Criou");
    expect(detalhe).toBe(
      'Reserva "Aula de Engenharia de Software", Bloco A · 101, 28/09/2026, 19:00 às 20:40, professor Ana Beatriz Moura'
    );
  });

  it("reconhece o cancelamento e cita o motivo", () => {
    const { acao, detalhe } = descreverEvento(
      {
        action: "update",
        entity: "bookings",
        beforeState: reserva,
        afterState: {
          ...reserva,
          status: "cancelled",
          cancellation_reason: "Professor afastado",
        },
      },
      catalogo
    );

    expect(acao).toBe("Cancelou");
    expect(detalhe).toContain("motivo: Professor afastado");
  });

  it("usa o estado anterior na exclusão", () => {
    const { acao, detalhe } = descreverEvento(
      {
        action: "delete",
        entity: "bookings",
        beforeState: reserva,
        afterState: null,
      },
      catalogo
    );

    expect(acao).toBe("Excluiu");
    expect(detalhe).toContain("Aula de Engenharia de Software");
  });

  it("não quebra quando o espaço ou o professor não existem mais", () => {
    const { detalhe } = descreverEvento(
      {
        action: "insert",
        entity: "bookings",
        beforeState: null,
        afterState: { ...reserva, room_id: "x", professor_id: "y" },
      },
      catalogo
    );

    expect(detalhe).not.toContain("undefined");
    expect(detalhe).not.toContain("professor ");
  });
});

describe("descrição de eventos de conta", () => {
  const evento = (action: string, afterState: unknown = null) => ({
    action,
    entity: "auth",
    beforeState: null,
    afterState,
  });

  it("nomeia a tentativa de acesso recusada com o e-mail usado", () => {
    expect(
      descreverEvento(evento("login_failed", { email: "a@b.com" }), catalogo)
        .detalhe
    ).toBe("Tentativa de entrada com o e-mail a@b.com");
  });

  it("nomeia o usuário alvo de uma desativação", () => {
    const { acao, detalhe } = descreverEvento(
      {
        ...evento("user_deactivated", { alvo: "conta-1" }),
        entity: "profiles",
      },
      catalogo
    );

    expect(acao).toBe("Desativou usuário");
    expect(detalhe).toBe("Desativou o usuário Carlos Lima");
  });

  it("nomeia a troca de papel, de onde para onde", () => {
    const { acao, detalhe } = descreverEvento(
      {
        action: "user_role_changed",
        entity: "profiles",
        beforeState: { role: "professor" },
        afterState: { role: "student", alvo: "conta-1" },
      },
      catalogo
    );

    expect(acao).toBe("Alterou papel");
    expect(detalhe).toBe("Mudou Carlos Lima de Professor para Aluno");
  });

  it("nomeia quem foi convidado e com qual perfil", () => {
    const { acao, detalhe } = descreverEvento(
      evento("user_invited", { email: "novo@umc.br", role: "professor" }),
      catalogo
    );

    expect(acao).toBe("Convidou usuário");
    expect(detalhe).toBe("Convidou novo@umc.br como Professor");
  });

  it("registra a versão dos termos aceitos", () => {
    expect(
      descreverEvento(evento("terms_accepted", { versao: "2026-09" }), catalogo)
        .detalhe
    ).toBe("Aceitou os termos de uso, versão 2026-09");
  });
});
