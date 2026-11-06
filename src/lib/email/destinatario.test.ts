import { describe, expect, it } from "vitest";

import { podeReceber } from "./destinatario";

describe("quem pode receber e-mail", () => {
  it("aceita endereços reais, inclusive com alias", () => {
    expect(podeReceber("dc801270@gmail.com")).toBe(true);
    expect(podeReceber("dc801270+carlos@gmail.com")).toBe(true);
    expect(podeReceber("coordenacao@umc.br")).toBe(true);
  });

  it("recusa os domínios fictícios do seed", () => {
    expect(podeReceber("carlos.lima@exemplo.edu.br")).toBe(false);
    expect(podeReceber("alguem@example.com")).toBe(false);
  });

  it("recusa as contas de teste do desenvolvimento", () => {
    for (const email of ["adm", "professor", "aluno", "suporte"]) {
      expect(podeReceber(`${email}@umc.br`)).toBe(false);
    }
  });

  it("recusa terminações reservadas para teste", () => {
    expect(podeReceber("removido-123@checkroom.invalid")).toBe(false);
    expect(podeReceber("a@site.test")).toBe(false);
  });

  it("não confunde domínio que só termina parecido", () => {
    expect(podeReceber("a@meuexemplo.edu.br")).toBe(true);
  });

  it("recusa endereço vazio ou malformado", () => {
    expect(podeReceber("")).toBe(false);
    expect(podeReceber(null)).toBe(false);
    expect(podeReceber("sem-arroba")).toBe(false);
  });
});
