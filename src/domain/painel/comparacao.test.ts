import { describe, expect, it } from "vitest";

import {
  compararComAnterior,
} from "./comparacao";

describe("compararComAnterior", () => {
  const percentual = (melhorQuando: "subir" | "descer" | "neutro") => ({
    unidade: "percentual" as const,
    melhorQuando,
  });

  it("calcula a variação percentual e marca como boa quando sobe o que deveria subir", () => {
    expect(compararComAnterior(150, 100, percentual("subir"))).toEqual({
      valor: 50,
      unidade: "percentual",
      tom: "bom",
    });
  });

  it("marca como ruim quando sobe o que deveria descer", () => {
    expect(compararComAnterior(12, 10, percentual("descer"))).toMatchObject({
      valor: 20,
      tom: "ruim",
    });
  });

  it("não escolhe lado quando a métrica é neutra", () => {
    expect(compararComAnterior(5, 10, percentual("neutro"))).toMatchObject({
      valor: -50,
      tom: "neutro",
    });
  });

  it("mede taxas em pontos percentuais", () => {
    expect(
      compararComAnterior(0.35, 0.3, { unidade: "pontos", melhorQuando: "subir" })
    ).toMatchObject({ valor: 5, tom: "bom" });
  });

  it("não calcula quando o período anterior não tem base", () => {
    expect(compararComAnterior(4, 0, percentual("subir")).valor).toBeNull();
    expect(compararComAnterior(0, 0, percentual("subir"))).toMatchObject({
      valor: 0,
      tom: "neutro",
    });
    expect(compararComAnterior(null, 3, percentual("descer")).valor).toBeNull();
    expect(compararComAnterior(3, null, percentual("descer")).valor).toBeNull();
  });
});
