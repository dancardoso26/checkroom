import { describe, expect, it } from "vitest";

import {
  SEMANA,
  h,
} from "./apoio-de-teste";
import {
  mapaDeCalor,
  serieDoPeriodo,
} from "./serie-temporal";

describe("serieDoPeriodo", () => {
  it("devolve um ponto por dia, com zeros nos dias sem registro", () => {
    const serie = serieDoPeriodo(SEMANA, {
      criados: [h("12", "10:00"), h("12", "15:00"), h("14", "09:00")],
      resolvidos: [h("14", "10:00")],
    });

    expect(serie).toHaveLength(7);
    expect(serie[0]).toMatchObject({ rotulo: "12/10", criados: 2, resolvidos: 0 });
    expect(serie[1]).toMatchObject({ criados: 0, resolvidos: 0 });
    expect(serie[2]).toMatchObject({ criados: 1, resolvidos: 1 });
  });

  it("ignora registros fora do período", () => {
    const serie = serieDoPeriodo(SEMANA, { criados: [h("01", "10:00")] });
    expect(serie.every((ponto) => ponto.criados === 0)).toBe(true);
  });

  it("agrupa por mês quando o período passa de dois meses", () => {
    const serie = serieDoPeriodo(
      {
        inicio: new Date("2026-08-01T03:00:00.000Z"),
        fim: new Date("2026-11-01T03:00:00.000Z"),
      },
      { criados: [new Date("2026-09-10T15:00:00.000Z")] }
    );

    expect(serie.map((p) => p.rotulo)).toEqual(["ago/26", "set/26", "out/26"]);
    expect(serie[1].criados).toBe(1);
  });
});

describe("mapaDeCalor", () => {
  it("distribui as horas por dia da semana e por hora do dia", () => {
    const mapa = mapaDeCalor(
      [
        { inicio: h("12", "19:30"), fim: h("12", "21:00") },
        { inicio: h("19", "19:00"), fim: h("19", "20:00") },
      ],
      { inicio: h("12", "00:00"), fim: h("26", "00:00") }
    );

    const segunda = mapa.linhas.find((l) => l.dia === "Seg")!;
    const indice = (hora: number) => mapa.horas.indexOf(hora);

    expect(segunda.valores[indice(19)]).toBe(1.5);
    expect(segunda.valores[indice(20)]).toBe(1);
    expect(mapa.maximo).toBe(1.5);
  });

  it("deixa o domingo de fora quando ninguém usa", () => {
    const mapa = mapaDeCalor([], SEMANA);
    expect(mapa.linhas.map((l) => l.dia)).toEqual([
      "Seg",
      "Ter",
      "Qua",
      "Qui",
      "Sex",
      "Sáb",
    ]);
    expect(mapa.maximo).toBe(0);
  });
});
