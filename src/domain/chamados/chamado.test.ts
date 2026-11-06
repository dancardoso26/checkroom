import { describe, expect, it } from "vitest";

import type { Ator } from "@/domain/auth/permissoes";

import {
  acoesDisponiveis,
  ordenarFila,
  recusaDoBanco,
  validarAbertura,
  validarTransicao,
  type ChamadoParaTransicao,
} from "./chamado";

const professor: Ator = { profileId: "prof", papel: "professor", professorId: "p1" };
const outroProfessor: Ator = { profileId: "outro", papel: "professor", professorId: "p2" };
const ti: Ator = { profileId: "ti", papel: "it_support", professorId: null };
const admin: Ator = { profileId: "admin", papel: "admin", professorId: null };

const aberto: ChamadoParaTransicao = { situacao: "open", solicitanteId: "prof" };
const emAtendimento: ChamadoParaTransicao = { situacao: "in_progress", solicitanteId: "prof" };
const resolvido: ChamadoParaTransicao = { situacao: "resolved", solicitanteId: "prof" };

describe("validarTransicao", () => {
  it("a TI assume um chamado aberto, que passa a em atendimento", () => {
    expect(validarTransicao(aberto, "assumir", ti)).toEqual({
      ok: true,
      novaSituacao: "in_progress",
    });
  });

  it("a TI resolve com nota um chamado em atendimento", () => {
    expect(validarTransicao(emAtendimento, "resolver", ti, "Cabo trocado")).toEqual({
      ok: true,
      novaSituacao: "resolved",
    });
  });

  it("recusa a resolução sem nota de solução", () => {
    expect(validarTransicao(emAtendimento, "resolver", ti, "   ")).toEqual({
      ok: false,
      recusa: "NOTA_OBRIGATORIA",
    });
  });

  it("recusa resolver um chamado que ninguém assumiu", () => {
    expect(validarTransicao(aberto, "resolver", ti, "x")).toEqual({
      ok: false,
      recusa: "TRANSICAO_INVALIDA",
    });
  });

  it("só a TI atende: professor e administração não assumem", () => {
    expect(validarTransicao(aberto, "assumir", professor)).toMatchObject({ recusa: "SEM_PERMISSAO" });
    expect(validarTransicao(aberto, "assumir", admin)).toMatchObject({ recusa: "SEM_PERMISSAO" });
  });

  it("o solicitante cancela o chamado ainda aberto", () => {
    expect(validarTransicao(aberto, "cancelar", professor)).toEqual({
      ok: true,
      novaSituacao: "cancelled",
    });
  });

  it("ninguém além do solicitante cancela", () => {
    expect(validarTransicao(aberto, "cancelar", outroProfessor)).toMatchObject({
      recusa: "SEM_PERMISSAO",
    });
    expect(validarTransicao(aberto, "cancelar", admin)).toMatchObject({ recusa: "SEM_PERMISSAO" });
  });

  it("não cancela depois que a TI assumiu", () => {
    expect(validarTransicao(emAtendimento, "cancelar", professor)).toMatchObject({
      recusa: "TRANSICAO_INVALIDA",
    });
  });

  it("chamado resolvido não muda mais", () => {
    for (const acao of ["assumir", "resolver", "cancelar"] as const) {
      expect(validarTransicao(resolvido, acao, acao === "cancelar" ? professor : ti, "x").ok).toBe(
        false
      );
    }
  });
});

describe("acoesDisponiveis", () => {
  it("oferece à TI assumir o aberto e resolver o em atendimento", () => {
    expect(acoesDisponiveis(aberto, ti)).toEqual(["assumir"]);
    expect(acoesDisponiveis(emAtendimento, ti)).toEqual(["resolver"]);
  });

  it("oferece ao solicitante só cancelar, e só enquanto aberto", () => {
    expect(acoesDisponiveis(aberto, professor)).toEqual(["cancelar"]);
    expect(acoesDisponiveis(emAtendimento, professor)).toEqual([]);
  });

  it("não oferece nada à administração", () => {
    expect(acoesDisponiveis(aberto, admin)).toEqual([]);
  });
});

describe("recusaDoBanco", () => {
  it("traduz os códigos das funções do banco", () => {
    expect(recusaDoBanco("ok")).toBeNull();
    expect(recusaDoBanco("forbidden")).toBe("SEM_PERMISSAO");
    expect(recusaDoBanco("invalid_transition")).toBe("TRANSICAO_INVALIDA");
    expect(recusaDoBanco("note_required")).toBe("NOTA_OBRIGATORIA");
    expect(recusaDoBanco("not_found")).toBe("NAO_ENCONTRADO");
  });
});

describe("validarAbertura", () => {
  it("recusa descrição vazia", () => {
    expect(
      validarAbertura({ espacoId: "sala", descricao: "  ", prioridade: "medium" }).descricao
    ).toEqual(["Descreva o problema."]);
  });

  it("exige o espaço", () => {
    expect(
      validarAbertura({ espacoId: "", descricao: "Projetor", prioridade: "high" }).espacoId
    ).toBeDefined();
  });

  it("recusa descrição longa demais", () => {
    expect(
      validarAbertura({ espacoId: "sala", descricao: "a".repeat(2001), prioridade: "low" }).descricao
    ).toBeDefined();
  });

  it("aceita uma abertura completa", () => {
    expect(
      validarAbertura({ espacoId: "sala", descricao: "Projetor não liga", prioridade: "high" })
    ).toEqual({});
  });
});

describe("ordenarFila", () => {
  const dia = (d: number) => new Date(`2026-10-${String(d).padStart(2, "0")}T10:00:00-03:00`);

  it("põe pendentes primeiro, por urgência e depois pelo mais antigo", () => {
    const fila = ordenarFila([
      { id: "resolvido", situacao: "resolved" as const, prioridade: "high" as const, abertoEm: dia(1) },
      { id: "baixa", situacao: "open" as const, prioridade: "low" as const, abertoEm: dia(1) },
      { id: "alta-nova", situacao: "open" as const, prioridade: "high" as const, abertoEm: dia(5) },
      { id: "alta-antiga", situacao: "open" as const, prioridade: "high" as const, abertoEm: dia(2) },
      { id: "atendendo", situacao: "in_progress" as const, prioridade: "low" as const, abertoEm: dia(3) },
    ]);

    expect(fila.map((c) => c.id)).toEqual([
      "alta-antiga",
      "alta-nova",
      "baixa",
      "atendendo",
      "resolvido",
    ]);
  });

  it("encerrados do mais recente para o mais antigo", () => {
    const fila = ordenarFila([
      { id: "velho", situacao: "resolved" as const, prioridade: "low" as const, abertoEm: dia(1) },
      { id: "novo", situacao: "resolved" as const, prioridade: "low" as const, abertoEm: dia(9) },
    ]);

    expect(fila.map((c) => c.id)).toEqual(["novo", "velho"]);
  });
});
