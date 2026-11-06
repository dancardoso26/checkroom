import { describe, expect, it } from "vitest";

import { descreverEvento, type Catalogo } from "./descricao";

const catalogo: Catalogo = {
  espacos: new Map([["sala-1", "1T-01"]]),
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
      'Reserva "Aula de Engenharia de Software", 1T-01, 28/09/2026, 19:00 às 20:40, professor Ana Beatriz Moura'
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

describe("descrição dos cadastros, chamados e palestras", () => {
  const completo: Catalogo = {
    ...catalogo,
    recursos: new Map([
      ["r1", "Projetor"],
      ["r2", "Microscópio"],
    ]),
    disciplinas: new Map([["d1", "Banco de Dados II"]]),
    turmas: new Map([["t1", "SI 8º semestre A"]]),
    palestras: new Map([["l1", "IA na saúde"]]),
  };

  it("nomeia o espaço cadastrado", () => {
    expect(
      descreverEvento(
        {
          action: "insert",
          entity: "rooms",
          beforeState: null,
          afterState: { name: "3T-12", building: "Prédio 3" },
        },
        completo
      )
    ).toEqual({ acao: "Cadastrou", detalhe: "Espaço 3T-12" });
  });

  it("lista os recursos antes e depois da troca", () => {
    const { detalhe } = descreverEvento(
      {
        action: "room_resources_changed",
        entity: "rooms",
        entityId: "sala-1",
        beforeState: { resource_ids: ["r1"] },
        afterState: { resource_ids: ["r1", "r2"] },
      },
      completo
    );

    expect(detalhe).toBe(
      "Recursos de 1T-01: de Projetor para Projetor, Microscópio"
    );
  });

  it("descreve o vínculo de professor pelos nomes", () => {
    const { detalhe } = descreverEvento(
      {
        action: "delete",
        entity: "teaching_assignments",
        beforeState: {
          professor_id: "prof-1",
          subject_id: "d1",
          class_id: "t1",
          term: "2026.2",
        },
        afterState: null,
      },
      completo
    );

    expect(detalhe).toBe(
      "Vínculo de professor: Ana Beatriz Moura, Banco de Dados II, SI 8º semestre A, período 2026.2"
    );
  });

  it("distingue abrir, assumir e resolver um chamado", () => {
    const aberto = { room_id: "sala-1", description: "Projetor não liga", priority: "high", status: "open" };

    expect(
      descreverEvento({ action: "insert", entity: "tickets", beforeState: null, afterState: aberto }, completo)
    ).toEqual({
      acao: "Abriu chamado",
      detalhe: "Chamado em 1T-01, prioridade alta: Projetor não liga",
    });

    expect(
      descreverEvento(
        {
          action: "update",
          entity: "tickets",
          beforeState: aberto,
          afterState: { ...aberto, status: "in_progress" },
        },
        completo
      ).acao
    ).toBe("Assumiu chamado");

    const resolvido = descreverEvento(
      {
        action: "update",
        entity: "tickets",
        beforeState: { ...aberto, status: "in_progress" },
        afterState: { ...aberto, status: "resolved", resolution_note: "Cabo trocado" },
      },
      completo
    );

    expect(resolvido.acao).toBe("Resolveu chamado");
    expect(resolvido.detalhe).toContain("Solução: Cabo trocado");
  });

  it("descreve inscrição e cancelamento pela palestra", () => {
    expect(
      descreverEvento(
        { action: "insert", entity: "lecture_enrollments", beforeState: null, afterState: { lecture_id: "l1" } },
        completo
      )
    ).toEqual({ acao: "Inscreveu-se", detalhe: 'Inscrição na palestra "IA na saúde"' });

    expect(
      descreverEvento(
        { action: "delete", entity: "lecture_enrollments", beforeState: { lecture_id: "l1" }, afterState: null },
        completo
      ).acao
    ).toBe("Cancelou inscrição");
  });

  it("diferencia a troca só de curso da troca de papel", () => {
    expect(
      descreverEvento(
        {
          action: "user_role_changed",
          entity: "profiles",
          beforeState: { role: "student", course_id: "c1" },
          afterState: { role: "student", course_id: "c2", alvo: "conta-1" },
        },
        completo
      ).detalhe
    ).toBe("Alterou o curso de Carlos Lima");
  });
});
