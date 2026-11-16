import { describe, it, expect } from "vitest";
import { descreverViolacao, descreverViolacoes } from "./mensagens";
import type { OcupacaoExistente } from "./tipos";

const conflito: OcupacaoExistente = {
  id: "b1",
  espacoId: "room-101",
  professorId: "prof-ana",
  turmaId: "class-si8",
  finalidade: "Prova final",
  inicio: new Date("2026-09-14T19:00:00-03:00"),
  fim: new Date("2026-09-14T20:40:00-03:00"),
};

describe("descreverViolacao", () => {
  it("exibe o horário no fuso de Brasília, e não em UTC", () => {
    const texto = descreverViolacao({ codigo: "CONFLITO_DE_ESPACO", conflito });

    expect(texto).toContain("14/09");
    expect(texto).toContain("19:00");
    expect(texto).toContain("20:40");
  });

  it("cita a finalidade da reserva que causou o conflito", () => {
    const texto = descreverViolacao({ codigo: "CONFLITO_DE_ESPACO", conflito });

    expect(texto).toContain("Prova final");
  });

  it("não cita a finalidade de uma reserva que a pessoa não pode ver", () => {
    const oculto = { ...conflito, finalidade: null };

    for (const codigo of [
      "CONFLITO_DE_ESPACO",
      "CONFLITO_DE_PROFESSOR",
      "CONFLITO_DE_TURMA",
    ] as const) {
      const texto = descreverViolacao({ codigo, conflito: oculto });

      expect(texto).not.toContain("Prova final");
      expect(texto).not.toContain("null");
      expect(texto).toContain("19:00");
    }
  });

  it("distingue conflito de professor de conflito de turma", () => {
    const doProfessor = descreverViolacao({
      codigo: "CONFLITO_DE_PROFESSOR",
      conflito,
    });
    const daTurma = descreverViolacao({
      codigo: "CONFLITO_DE_TURMA",
      conflito,
    });

    expect(doProfessor).not.toBe(daTurma);
    expect(doProfessor).toMatch(/professor/i);
    expect(daTurma).toMatch(/turma/i);
  });

  it("mostra os dois números na recusa por capacidade", () => {
    const texto = descreverViolacao({
      codigo: "CAPACIDADE_INSUFICIENTE",
      capacidade: 30,
      quantidadeDeAlunos: 55,
    });

    expect(texto).toContain("30");
    expect(texto).toContain("55");
  });

  it("traduz os ids de recurso quando recebe o dicionário", () => {
    const texto = descreverViolacao(
      { codigo: "RECURSOS_FALTANTES", recursosFaltantes: ["res-1", "res-2"] },
      { nomesDosRecursos: { "res-1": "Projetor", "res-2": "Computadores" } },
    );

    expect(texto).toContain("Projetor");
    expect(texto).toContain("Computadores");
  });

  it("cai para o id quando o dicionário não traz o nome", () => {
    const texto = descreverViolacao({
      codigo: "RECURSOS_FALTANTES",
      recursosFaltantes: ["res-desconhecido"],
    });

    expect(texto).toContain("res-desconhecido");
  });

  it("concorda o texto com a quantidade de recursos faltantes", () => {
    const um = descreverViolacao(
      { codigo: "RECURSOS_FALTANTES", recursosFaltantes: ["a"] },
      { nomesDosRecursos: { a: "Projetor" } },
    );
    const dois = descreverViolacao(
      { codigo: "RECURSOS_FALTANTES", recursosFaltantes: ["a", "b"] },
      { nomesDosRecursos: { a: "Projetor", b: "Computadores" } },
    );

    expect(um).toContain("o recurso exigido");
    expect(dois).toContain("os recursos exigidos");
  });
});

describe("descreverViolacoes", () => {
  it("traduz a lista inteira preservando a ordem", () => {
    const textos = descreverViolacoes([
      { codigo: "PERIODO_INVALIDO" },
      { codigo: "FINALIDADE_VAZIA" },
    ]);

    expect(textos).toHaveLength(2);
    expect(textos[0]).toMatch(/término/i);
    expect(textos[1]).toMatch(/finalidade/i);
  });
});
