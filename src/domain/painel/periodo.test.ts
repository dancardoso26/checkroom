import { describe, expect, it } from "vitest";

import {
  SEMANA,
  h,
} from "./apoio-de-teste";
import {
  diasDoPeriodo,
  diasLetivos,
  lerPeriodo,
  periodoAnterior,
} from "./periodo";

describe("diasLetivos", () => {
  it("conta segunda a sábado e deixa o domingo de fora", () => {
    expect(diasLetivos(SEMANA)).toBe(6);
  });

  it("conta um único dia", () => {
    expect(diasLetivos({ inicio: h("14", "00:00"), fim: h("15", "00:00") })).toBe(1);
  });
});

describe("lerPeriodo", () => {
  it("usa o mês corrente quando a URL não traz datas", () => {
    const { de, ate, periodo } = lerPeriodo(undefined, undefined, "2026-02-10");
    expect([de, ate]).toEqual(["2026-02-01", "2026-02-28"]);
    expect(periodo.fim.toISOString()).toBe("2026-03-01T03:00:00.000Z");
  });

  it("inverte datas trocadas e ignora formatos inválidos", () => {
    expect(lerPeriodo("2026-10-20", "2026-10-10", "2026-10-12").de).toBe("2026-10-10");
    expect(lerPeriodo("ontem", undefined, "2026-10-12").de).toBe("2026-10-01");
  });
});

describe("periodoAnterior", () => {
  it("usa o mês anterior quando o período é de meses inteiros", () => {
    const anterior = periodoAnterior({
      inicio: new Date("2026-11-01T03:00:00.000Z"),
      fim: new Date("2026-12-01T03:00:00.000Z"),
    });

    expect(anterior.inicio.toISOString()).toBe("2026-10-01T03:00:00.000Z");
    expect(anterior.fim.toISOString()).toBe("2026-11-01T03:00:00.000Z");
  });

  it("recua vários meses quando o período tem vários meses", () => {
    const anterior = periodoAnterior({
      inicio: new Date("2026-08-01T03:00:00.000Z"),
      fim: new Date("2026-11-01T03:00:00.000Z"),
    });

    expect(anterior.inicio.toISOString()).toBe("2026-05-01T03:00:00.000Z");
    expect(anterior.fim.toISOString()).toBe("2026-08-01T03:00:00.000Z");
  });

  it("atravessa a virada do ano", () => {
    const anterior = periodoAnterior({
      inicio: new Date("2026-01-01T03:00:00.000Z"),
      fim: new Date("2026-02-01T03:00:00.000Z"),
    });

    expect(anterior.inicio.toISOString()).toBe("2025-12-01T03:00:00.000Z");
  });

  it("usa a mesma duração quando o período não fecha meses", () => {
    const anterior = periodoAnterior(SEMANA);

    expect(anterior.fim).toEqual(SEMANA.inicio);
    expect(anterior.inicio).toEqual(h("05", "00:00"));
  });
});

describe("diasDoPeriodo", () => {
  it("devolve o primeiro e o último dia, no fuso local", () => {
    expect(diasDoPeriodo(SEMANA)).toEqual({ de: "2026-10-12", ate: "2026-10-18" });
  });
});
