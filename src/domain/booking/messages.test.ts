import { describe, it, expect } from "vitest";
import { describeViolation, describeViolations } from "./messages";
import type { ExistingBooking } from "./types";

const conflito: ExistingBooking = {
  id: "b1",
  roomId: "room-101",
  professorId: "prof-ana",
  classId: "class-si8",
  purpose: "Defesa de TCC",
  // 19:00 no horário de Brasília, ou 22:00 UTC. A diferença entre os dois é
  // justamente o que o teste de fuso abaixo verifica.
  startsAt: new Date("2026-09-14T19:00:00-03:00"),
  endsAt: new Date("2026-09-14T20:40:00-03:00"),
};

describe("describeViolation", () => {
  it("exibe o horário no fuso de Brasília, e não em UTC", () => {
    const texto = describeViolation({ code: "ROOM_CONFLICT", conflict: conflito });

    expect(texto).toContain("14/09");
    expect(texto).toContain("19:00");
    expect(texto).toContain("20:40");
  });

  it("cita a finalidade da reserva que causou o conflito", () => {
    // É o dado que permite ao professor saber com quem negociar o horário, em
    // vez de apenas descobrir que está ocupado.
    const texto = describeViolation({ code: "ROOM_CONFLICT", conflict: conflito });

    expect(texto).toContain("Defesa de TCC");
  });

  it("distingue conflito de professor de conflito de turma", () => {
    const doProfessor = describeViolation({
      code: "PROFESSOR_CONFLICT",
      conflict: conflito,
    });
    const daTurma = describeViolation({
      code: "CLASS_CONFLICT",
      conflict: conflito,
    });

    expect(doProfessor).not.toBe(daTurma);
    expect(doProfessor).toMatch(/professor/i);
    expect(daTurma).toMatch(/turma/i);
  });

  it("mostra os dois números na recusa por capacidade", () => {
    // Dizer apenas "capacidade insuficiente" obriga o usuário a ir conferir os
    // dois valores em outro lugar da tela.
    const texto = describeViolation({
      code: "INSUFFICIENT_CAPACITY",
      capacity: 30,
      studentCount: 55,
    });

    expect(texto).toContain("30");
    expect(texto).toContain("55");
  });

  it("traduz os ids de recurso quando recebe o dicionário", () => {
    const texto = describeViolation(
      { code: "MISSING_RESOURCES", missingResourceIds: ["res-1", "res-2"] },
      { resourceNames: { "res-1": "Projetor", "res-2": "Computadores" } }
    );

    expect(texto).toContain("Projetor");
    expect(texto).toContain("Computadores");
  });

  it("cai para o id quando o dicionário não traz o nome", () => {
    // Uma mensagem de erro não pode falhar por falta de um dado acessório. O id
    // é feio, mas ainda permite investigar o que aconteceu.
    const texto = describeViolation({
      code: "MISSING_RESOURCES",
      missingResourceIds: ["res-desconhecido"],
    });

    expect(texto).toContain("res-desconhecido");
  });

  it("concorda o texto com a quantidade de recursos faltantes", () => {
    const um = describeViolation(
      { code: "MISSING_RESOURCES", missingResourceIds: ["a"] },
      { resourceNames: { a: "Projetor" } }
    );
    const dois = describeViolation(
      { code: "MISSING_RESOURCES", missingResourceIds: ["a", "b"] },
      { resourceNames: { a: "Projetor", b: "Computadores" } }
    );

    expect(um).toContain("o recurso exigido");
    expect(dois).toContain("os recursos exigidos");
  });
});

describe("describeViolations", () => {
  it("traduz a lista inteira preservando a ordem", () => {
    // A ordem importa: validateBooking devolve as violações da mais estrutural
    // para a mais específica, e a tela exibe nessa sequência.
    const textos = describeViolations([
      { code: "INVALID_PERIOD" },
      { code: "EMPTY_PURPOSE" },
    ]);

    expect(textos).toHaveLength(2);
    expect(textos[0]).toMatch(/término/i);
    expect(textos[1]).toMatch(/finalidade/i);
  });
});
