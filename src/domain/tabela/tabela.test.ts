import { describe, expect, it } from "vitest";

import { alternarOrdenacao, lerTabela, paginar, TABELA_PADRAO } from "./tabela";

describe("lerTabela", () => {
  it("usa o padrão quando a URL não diz nada", () => {
    expect(lerTabela({})).toEqual(TABELA_PADRAO);
  });

  it("aceita valores válidos", () => {
    expect(
      lerTabela({ pagina: "3", ordenar: "espaco", sentido: "asc" })
    ).toEqual({
      pagina: 3,
      ordenar: "espaco",
      sentido: "asc",
      porPagina: 25,
    });
  });

  it("recusa página, coluna e sentido inválidos", () => {
    expect(lerTabela({ pagina: "-2", ordenar: "senha", sentido: "x" })).toEqual(
      TABELA_PADRAO
    );
    expect(lerTabela({ pagina: "1.5" }).pagina).toBe(1);
    expect(lerTabela({ porPagina: "100000" }).porPagina).toBe(25);
    expect(lerTabela({ porPagina: "50" }).porPagina).toBe(50);
  });
});

describe("alternarOrdenacao", () => {
  it("inverte o sentido ao clicar de novo na mesma coluna", () => {
    expect(alternarOrdenacao(TABELA_PADRAO, "data").sentido).toBe("asc");
  });

  it("começa textos de A a Z e volta para a primeira página", () => {
    const estado = alternarOrdenacao(
      { ...TABELA_PADRAO, pagina: 4 },
      "professor"
    );

    expect(estado).toEqual({
      ...TABELA_PADRAO,
      ordenar: "professor",
      sentido: "asc",
    });
  });

  it("começa a data pelas mais recentes", () => {
    const estado = alternarOrdenacao(
      { ...TABELA_PADRAO, ordenar: "turma", sentido: "asc" },
      "data"
    );

    expect(estado.sentido).toBe("desc");
  });
});

describe("paginar", () => {
  it("calcula o intervalo pedido ao banco", () => {
    expect(paginar(45, 2, 20)).toEqual({
      pagina: 2,
      totalDePaginas: 3,
      de: 20,
      ate: 39,
      temAnterior: true,
      temSeguinte: true,
    });
  });

  it("traz uma página além do fim para a última", () => {
    expect(paginar(45, 9, 20).pagina).toBe(3);
  });

  it("tem sempre ao menos uma página, mesmo sem reservas", () => {
    const vazia = paginar(0, 1, 20);

    expect(vazia.totalDePaginas).toBe(1);
    expect(vazia.temAnterior).toBe(false);
    expect(vazia.temSeguinte).toBe(false);
  });

  it("não aceita página zero ou negativa", () => {
    expect(paginar(45, 0, 20).pagina).toBe(1);
    expect(paginar(45, -3, 20).pagina).toBe(1);
  });
});
