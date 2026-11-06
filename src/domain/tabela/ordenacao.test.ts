import { describe, expect, it } from "vitest";

import { ordenarPor, proximaOrdem } from "./ordenacao";

const colunas = {
  nome: (item: { nome: string | null }) => item.nome,
};

describe("ordenarPor", () => {
  const itens = [{ nome: "Sala 10" }, { nome: null }, { nome: "Sala 2" }];

  it("mantém a ordem original sem ordenação", () => {
    expect(ordenarPor(itens, null, colunas)).toEqual(itens);
  });

  it("ordena números dentro do texto e deixa vazios no fim", () => {
    const asc = ordenarPor(itens, { coluna: "nome", sentido: "asc" }, colunas);
    expect(asc.map((i) => i.nome)).toEqual(["Sala 2", "Sala 10", null]);

    const desc = ordenarPor(
      itens,
      { coluna: "nome", sentido: "desc" },
      colunas,
    );
    expect(desc.map((i) => i.nome)).toEqual(["Sala 10", "Sala 2", null]);
  });
});

describe("proximaOrdem", () => {
  it("alterna ascendente, descendente e volta ao padrão", () => {
    const asc = proximaOrdem(null, "nome");
    expect(asc).toEqual({ coluna: "nome", sentido: "asc" });

    const desc = proximaOrdem(asc, "nome");
    expect(desc).toEqual({ coluna: "nome", sentido: "desc" });

    expect(proximaOrdem(desc, "nome")).toBeNull();
    expect(proximaOrdem(desc, "outra")).toEqual({
      coluna: "outra",
      sentido: "asc",
    });
  });
});
