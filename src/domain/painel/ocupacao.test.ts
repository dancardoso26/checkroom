import { describe, expect, it } from "vitest";

import {
  SEMANA,
  h,
} from "./apoio-de-teste";
import {
  espacosOciosos,
  ocupacaoPorEspaco,
  taxaMediaDeOcupacao,
} from "./ocupacao";

describe("ocupacaoPorEspaco", () => {
  const espacos = [
    { id: "a", nome: "1T-01" },
    { id: "b", nome: "21-04" },
  ];

  it("soma as horas de cada espaço e calcula a taxa sobre o expediente", () => {
    const ocupacao = ocupacaoPorEspaco(
      espacos,
      [
        { espacoId: "a", inicio: h("12", "19:00"), fim: h("12", "21:00") },
        { espacoId: "a", inicio: h("13", "08:00"), fim: h("13", "09:00") },
        { espacoId: "b", inicio: h("14", "19:00"), fim: h("14", "20:00") },
      ],
      SEMANA
    );

    expect(ocupacao[0]).toEqual({
      espacoId: "a",
      nome: "1T-01",
      horas: 3,
      taxa: 3 / (6 * 15),
    });
    expect(ocupacao[1].horas).toBe(1);
  });

  it("conta só a parte da ocupação que cai dentro do período", () => {
    const [a] = ocupacaoPorEspaco(
      espacos.slice(0, 1),
      [{ espacoId: "a", inicio: h("11", "23:00"), fim: h("12", "01:00") }],
      SEMANA
    );

    expect(a.horas).toBe(1);
  });

  it("mantém espaços sem uso, com zero", () => {
    const ocupacao = ocupacaoPorEspaco(espacos, [], SEMANA);
    expect(ocupacao.map((o) => o.horas)).toEqual([0, 0]);
    expect(taxaMediaDeOcupacao(ocupacao)).toBe(0);
  });
});

describe("espacosOciosos", () => {
  it("lista só os espaços abaixo de 5% de ocupação", () => {
    const ociosos = espacosOciosos([
      { espacoId: "a", nome: "A", horas: 20, taxa: 0.2 },
      { espacoId: "b", nome: "B", horas: 1, taxa: 0.01 },
      { espacoId: "c", nome: "C", horas: 0, taxa: 0 },
    ]);

    expect(ociosos.map((o) => o.nome)).toEqual(["C", "B"]);
  });
});
