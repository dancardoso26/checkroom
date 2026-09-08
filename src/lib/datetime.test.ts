import { describe, it, expect } from "vitest";
import {
  combineDateTime,
  formatDate,
  formatFullDate,
  formatPeriod,
  formatShortDateTime,
  formatTime,
  formatTimeRange,
  localDayKey,
  localMinutesOfDay,
  toDateInputValue,
} from "./datetime";

/**
 * TESTES DE DATA E HORA
 *
 * Estas funções pareciam triviais e produziram dois defeitos reais durante o
 * desenvolvimento: uma reserva das 19h gravada como 16h, e uma verificação de
 * expediente que respondia "meia-noite do dia seguinte" no servidor.
 *
 * A causa dos dois é a mesma. O JavaScript resolve datas no fuso da máquina que
 * executa, e as máquinas são diferentes: o notebook está em Brasília, o servidor
 * da Vercel está em UTC. Um teste que não fixa o fuso passa em um lugar e falha
 * no outro.
 *
 * Por isso todas as entradas abaixo trazem o deslocamento explícito, e as
 * asserções verificam o resultado no fuso de São Paulo, que é o da instituição.
 */

/** 14/09/2026, uma segunda-feira, às 19h em Brasília. */
const SEGUNDA_19H = new Date("2026-09-14T19:00:00-03:00");

describe("formatação", () => {
  it("exibe a data no formato brasileiro", () => {
    expect(formatDate(SEGUNDA_19H)).toBe("14/09/2026");
  });

  it("exibe a data por extenso, com o dia da semana", () => {
    expect(formatFullDate(SEGUNDA_19H)).toContain("segunda-feira");
    expect(formatFullDate(SEGUNDA_19H)).toContain("setembro");
  });

  it("exibe a hora no fuso de Brasília, e não em UTC", () => {
    // O mesmo instante é 22h em UTC. Se esta asserção quebrar, a formatação
    // voltou a seguir o fuso do ambiente.
    expect(formatTime(SEGUNDA_19H)).toBe("19:00");
  });

  it("combina data curta e hora", () => {
    expect(formatShortDateTime(SEGUNDA_19H)).toBe("14/09, 19:00");
  });

  it("descreve um período completo", () => {
    const fim = new Date("2026-09-14T20:40:00-03:00");
    expect(formatPeriod(SEGUNDA_19H, fim)).toBe("14/09, 19:00 às 20:40");
    expect(formatTimeRange(SEGUNDA_19H, fim)).toBe("19:00 às 20:40");
  });
});

describe("combineDateTime", () => {
  it("interpreta os campos do formulário no fuso de Brasília", () => {
    const instante = combineDateTime("2026-09-14", "19:00");

    // 19h em Brasília são 22h em UTC. É esta conversão que impede a aula
    // noturna de ser gravada três horas mais cedo.
    expect(instante.toISOString()).toBe("2026-09-14T22:00:00.000Z");
  });

  it("aceita a hora com e sem segundos", () => {
    // Navegadores diferentes preenchem o campo de hora de formas diferentes.
    expect(combineDateTime("2026-09-14", "19:00").getTime()).toBe(
      combineDateTime("2026-09-14", "19:00:00").getTime()
    );
  });
});

describe("localMinutesOfDay", () => {
  it("conta os minutos desde a meia-noite no fuso da instituição", () => {
    expect(localMinutesOfDay(SEGUNDA_19H)).toBe(19 * 60);
  });

  it("não usa o fuso do ambiente", () => {
    // 23h em UTC são 20h em Brasília. Se esta função lesse o relógio local da
    // máquina, o resultado seria 1380 em um servidor UTC.
    const instante = new Date("2026-09-14T23:00:00Z");
    expect(localMinutesOfDay(instante)).toBe(20 * 60);
  });

  it("responde corretamente nas bordas do expediente", () => {
    expect(localMinutesOfDay(new Date("2026-09-14T07:00:00-03:00"))).toBe(420);
    expect(localMinutesOfDay(new Date("2026-09-14T22:00:00-03:00"))).toBe(1320);
  });
});

describe("localDayKey", () => {
  it("identifica o dia do calendário no fuso da instituição", () => {
    expect(localDayKey(SEGUNDA_19H)).toBe("2026-09-14");
  });

  it("mantém o dia correto em horário noturno", () => {
    // 21h de 14/09 em Brasília já são 00h de 15/09 em UTC. É exatamente o caso
    // que fazia a verificação de expediente recusar uma reserva válida.
    const noite = new Date("2026-09-14T21:00:00-03:00");

    expect(noite.toISOString()).toContain("2026-09-15");
    expect(localDayKey(noite)).toBe("2026-09-14");
  });

  it("distingue dois instantes em dias diferentes", () => {
    const terca = new Date("2026-09-15T08:00:00-03:00");
    expect(localDayKey(SEGUNDA_19H)).not.toBe(localDayKey(terca));
  });
});

describe("toDateInputValue", () => {
  it("produz o formato que o campo de data espera", () => {
    expect(toDateInputValue(SEGUNDA_19H)).toBe("2026-09-14");
  });

  it("não adianta o dia em horário noturno", () => {
    // toISOString devolveria 15/09 para este instante. O campo de data marcaria
    // o dia seguinte, e o professor reservaria para a data errada.
    const noite = new Date("2026-09-14T21:30:00-03:00");
    expect(toDateInputValue(noite)).toBe("2026-09-14");
  });
});
