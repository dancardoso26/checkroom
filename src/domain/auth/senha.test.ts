import { describe, expect, it } from "vitest";

import {
  SIMBOLOS_ACEITOS,
  avaliarSenha,
  regrasNaoCumpridas,
  senhaForte,
} from "./senha";

function cumpridas(senha: string): string[] {
  return avaliarSenha(senha)
    .filter((regra) => regra.cumprida)
    .map((regra) => regra.id);
}

describe("avaliarSenha", () => {
  it("lista as cinco regras na ordem em que aparecem na tela", () => {
    expect(avaliarSenha("").map((regra) => regra.id)).toEqual([
      "tamanho",
      "maiuscula",
      "minuscula",
      "numero",
      "simbolo",
    ]);
  });

  it("não marca nenhuma regra para a senha vazia", () => {
    expect(cumpridas("")).toEqual([]);
  });

  it("marca cada regra de forma independente", () => {
    expect(cumpridas("abc")).toEqual(["minuscula"]);
    expect(cumpridas("ABC")).toEqual(["maiuscula"]);
    expect(cumpridas("123")).toEqual(["numero"]);
    expect(cumpridas("!")).toEqual(["simbolo"]);
    expect(cumpridas("12345678")).toEqual(["tamanho", "numero"]);
  });

  it("não conta letras acentuadas nem como letra exigida nem como símbolo, como o Supabase", () => {
    expect(cumpridas("Éç")).toEqual([]);
  });

  it("não conta o espaço como símbolo", () => {
    expect(cumpridas("a b")).not.toContain("simbolo");
  });

  it("conta como símbolo cada caractere da lista do Supabase", () => {
    for (const simbolo of SIMBOLOS_ACEITOS) {
      expect(cumpridas(simbolo)).toEqual(["simbolo"]);
    }
  });

  it("não conta como símbolo o que fica fora da lista do Supabase", () => {
    for (const caractere of ["€", "£", "§", "°", "´", "¨"]) {
      expect(cumpridas(caractere)).not.toContain("simbolo");
    }
  });

  it("exige oito caracteres, não sete", () => {
    expect(cumpridas("Abcde1!")).not.toContain("tamanho");
    expect(cumpridas("Abcdef1!")).toContain("tamanho");
  });
});

describe("senhaForte", () => {
  it("aceita a senha que cumpre todas as regras", () => {
    expect(senhaForte("Checkroom@2026")).toBe(true);
  });

  it("aceita espaços junto das demais regras", () => {
    expect(senhaForte("Sala 3T-12 livre")).toBe(true);
  });

  it("recusa a senha sem símbolo", () => {
    expect(senhaForte("Checkroom2026")).toBe(false);
  });

  it("recusa a senha só de números, mesmo longa", () => {
    expect(senhaForte("1234567890")).toBe(false);
  });

  it("recusa a senha sem maiúscula", () => {
    expect(senhaForte("checkroom@2026")).toBe(false);
  });
});

describe("regrasNaoCumpridas", () => {
  it("devolve o que falta, em minúsculas, para compor a mensagem", () => {
    expect(regrasNaoCumpridas("checkroom")).toEqual([
      "uma letra maiúscula",
      "um número",
      "um símbolo, como ! @ # ou -",
    ]);
  });

  it("devolve vazio quando nada falta", () => {
    expect(regrasNaoCumpridas("Checkroom@2026")).toEqual([]);
  });
});
