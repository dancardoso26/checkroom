import { describe, expect, it } from "vitest";

import { correspondeABusca } from "./busca";

const linha = [
  "25/09/2026, 20:06",
  "Ana Beatriz Moura",
  "dc801270@gmail.com",
  "Cancelou",
  'Reserva "Saúde Coletiva"',
];

describe("busca na trilha de auditoria", () => {
  it("aceita busca vazia", () => {
    expect(correspondeABusca(linha, "  ")).toBe(true);
  });

  it("ignora acento e caixa", () => {
    expect(correspondeABusca(linha, "SAUDE")).toBe(true);
  });

  it("exige todas as palavras, em qualquer campo", () => {
    expect(correspondeABusca(linha, "ana cancelou")).toBe(true);
    expect(correspondeABusca(linha, "ana entrou")).toBe(false);
  });

  it("acha pela data e pelo e-mail", () => {
    expect(correspondeABusca(linha, "25/09")).toBe(true);
    expect(correspondeABusca(linha, "gmail")).toBe(true);
  });
});
