import { describe, it, expect } from "vitest";
import {
  combinarDataEHora,
  formatarData,
  formatarDataPorExtenso,
  formatarPeriodo,
  formatarDataEHora,
  formatarDataCurtaComHora,
  formatarHora,
  formatarIntervaloDeHoras,
  chaveDoDiaLocal,
  minutosDoDiaLocal,
  valorDoCampoDeData,
} from "./datas";

const SEGUNDA_19H = new Date("2026-09-14T19:00:00-03:00");

describe("formatação", () => {
  it("exibe a data no formato brasileiro", () => {
    expect(formatarData(SEGUNDA_19H)).toBe("14/09/2026");
  });

  it("exibe a data por extenso, com o dia da semana", () => {
    expect(formatarDataPorExtenso(SEGUNDA_19H)).toContain("segunda-feira");
    expect(formatarDataPorExtenso(SEGUNDA_19H)).toContain("setembro");
  });

  it("exibe a hora no fuso de Brasília, e não em UTC", () => {
    expect(formatarHora(SEGUNDA_19H)).toBe("19:00");
  });

  it("combina data curta e hora", () => {
    expect(formatarDataCurtaComHora(SEGUNDA_19H)).toBe("14/09, 19:00");
    expect(formatarDataEHora(SEGUNDA_19H)).toBe("14/09/2026, 19:00");
  });

  it("descreve um período completo", () => {
    const fim = new Date("2026-09-14T20:40:00-03:00");
    expect(formatarPeriodo(SEGUNDA_19H, fim)).toBe("14/09, 19:00 às 20:40");
    expect(formatarIntervaloDeHoras(SEGUNDA_19H, fim)).toBe("19:00 às 20:40");
  });
});

describe("combinarDataEHora", () => {
  it("interpreta os campos do formulário no fuso de Brasília", () => {
    const instante = combinarDataEHora("2026-09-14", "19:00");

    expect(instante.toISOString()).toBe("2026-09-14T22:00:00.000Z");
  });

  it("aceita a hora com e sem segundos", () => {
    expect(combinarDataEHora("2026-09-14", "19:00").getTime()).toBe(
      combinarDataEHora("2026-09-14", "19:00:00").getTime(),
    );
  });
});

describe("minutosDoDiaLocal", () => {
  it("conta os minutos desde a meia-noite no fuso da instituição", () => {
    expect(minutosDoDiaLocal(SEGUNDA_19H)).toBe(19 * 60);
  });

  it("não usa o fuso do ambiente", () => {
    const instante = new Date("2026-09-14T23:00:00Z");
    expect(minutosDoDiaLocal(instante)).toBe(20 * 60);
  });

  it("responde corretamente nas bordas do expediente", () => {
    expect(minutosDoDiaLocal(new Date("2026-09-14T07:00:00-03:00"))).toBe(420);
    expect(minutosDoDiaLocal(new Date("2026-09-14T22:00:00-03:00"))).toBe(1320);
  });
});

describe("chaveDoDiaLocal", () => {
  it("identifica o dia do calendário no fuso da instituição", () => {
    expect(chaveDoDiaLocal(SEGUNDA_19H)).toBe("2026-09-14");
  });

  it("mantém o dia correto em horário noturno", () => {
    const noite = new Date("2026-09-14T21:00:00-03:00");

    expect(noite.toISOString()).toContain("2026-09-15");
    expect(chaveDoDiaLocal(noite)).toBe("2026-09-14");
  });

  it("distingue dois instantes em dias diferentes", () => {
    const terca = new Date("2026-09-15T08:00:00-03:00");
    expect(chaveDoDiaLocal(SEGUNDA_19H)).not.toBe(chaveDoDiaLocal(terca));
  });
});

describe("valorDoCampoDeData", () => {
  it("produz o formato que o campo de data espera", () => {
    expect(valorDoCampoDeData(SEGUNDA_19H)).toBe("2026-09-14");
  });

  it("não adianta o dia em horário noturno", () => {
    const noite = new Date("2026-09-14T21:30:00-03:00");
    expect(valorDoCampoDeData(noite)).toBe("2026-09-14");
  });
});
