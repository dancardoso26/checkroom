import { describe, expect, it } from "vitest";

import {
  diaDaSemana,
  diasDaSemana,
  ehChaveValida,
  faixasDoExpediente,
  gradeDoMes,
  inicioDaSemana,
  intervaloArrastado,
  intervaloDoPeriodo,
  lerEscala,
  lerVisao,
  mesmoMes,
  nomeCurtoDoDia,
  periodoVizinho,
  posicionarNoDia,
  somarDias,
  sugerirTermino,
  tituloDoPeriodo,
} from "./calendario";
import { combineDateTime } from "./datetime";

// 28/09/2026 é uma segunda-feira.
const SEGUNDA = "2026-09-28";

function reserva(id: string, dia: string, inicio: string, fim: string) {
  return {
    id,
    startsAt: combineDateTime(dia, inicio),
    endsAt: combineDateTime(dia, fim),
  };
}

describe("leitura da URL", () => {
  it("aceita apenas datas que existem", () => {
    expect(ehChaveValida("2026-09-28")).toBe(true);
    expect(ehChaveValida("2026-02-31")).toBe(false);
    expect(ehChaveValida("28/09/2026")).toBe(false);
    expect(ehChaveValida(undefined)).toBe(false);
  });

  it("cai no calendário semanal quando a URL não diz ou diz algo inválido", () => {
    expect(lerVisao(undefined)).toBe("calendario");
    expect(lerVisao("qualquer")).toBe("calendario");
    expect(lerVisao("tabela")).toBe("tabela");
    // A lista saiu: links antigos para ela abrem no calendário.
    expect(lerVisao("lista")).toBe("calendario");
    expect(lerEscala(undefined)).toBe("semana");
    expect(lerEscala("mes")).toBe("mes");
  });
});

describe("aritmética de dias", () => {
  it("atravessa mês e ano", () => {
    expect(somarDias("2026-09-30", 1)).toBe("2026-10-01");
    expect(somarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(somarDias("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("começa a semana na segunda", () => {
    expect(diaDaSemana(SEGUNDA)).toBe(0);
    expect(diaDaSemana("2026-10-04")).toBe(6);
    expect(inicioDaSemana("2026-10-01")).toBe(SEGUNDA);
    expect(inicioDaSemana("2026-10-04")).toBe(SEGUNDA);
  });

  it("devolve os sete dias da semana", () => {
    const dias = diasDaSemana("2026-10-01");

    expect(dias).toHaveLength(7);
    expect(dias[0]).toBe(SEGUNDA);
    expect(dias[6]).toBe("2026-10-04");
  });

  it("nomeia os dias sem o ponto da abreviação", () => {
    expect(nomeCurtoDoDia(SEGUNDA)).toBe("seg");
  });
});

describe("grade do mês", () => {
  it("fecha em semanas completas, de segunda a domingo", () => {
    const grade = gradeDoMes("2026-09-15");

    expect(grade.length % 7).toBe(0);
    expect(grade[0]).toBe("2026-08-31");
    expect(grade[grade.length - 1]).toBe("2026-10-04");
  });

  it("distingue os dias de borda", () => {
    expect(mesmoMes("2026-08-31", "2026-09-15")).toBe(false);
    expect(mesmoMes("2026-09-01", "2026-09-15")).toBe(true);
  });
});

describe("intervalo consultado", () => {
  it("cobre o dia inteiro no horário de Brasília", () => {
    const { inicio, fim } = intervaloDoPeriodo("dia", SEGUNDA);

    expect(inicio.toISOString()).toBe("2026-09-28T03:00:00.000Z");
    expect(fim.toISOString()).toBe("2026-09-29T03:00:00.000Z");
  });

  it("cobre a semana de segunda a domingo", () => {
    const { inicio, fim } = intervaloDoPeriodo("semana", "2026-10-01");

    expect(inicio).toEqual(combineDateTime(SEGUNDA, "00:00"));
    expect(fim).toEqual(combineDateTime("2026-10-05", "00:00"));
  });

  // O mês consulta a grade inteira: os dias de borda também mostram reservas.
  it("cobre a grade do mês, incluindo os dias de borda", () => {
    const { inicio, fim } = intervaloDoPeriodo("mes", "2026-09-15");

    expect(inicio).toEqual(combineDateTime("2026-08-31", "00:00"));
    expect(fim).toEqual(combineDateTime("2026-10-05", "00:00"));
  });
});

describe("navegação", () => {
  it("anda um dia, uma semana ou um mês", () => {
    expect(periodoVizinho("dia", SEGUNDA, 1)).toBe("2026-09-29");
    expect(periodoVizinho("semana", SEGUNDA, -1)).toBe("2026-09-21");
    expect(periodoVizinho("mes", SEGUNDA, 1)).toBe("2026-10-01");
  });

  it("não pula fevereiro saindo de 31 de janeiro", () => {
    expect(periodoVizinho("mes", "2026-01-31", 1)).toBe("2026-02-01");
  });
});

describe("título do período", () => {
  it("escreve o dia por extenso", () => {
    expect(tituloDoPeriodo("dia", SEGUNDA)).toBe(
      "segunda-feira, 28 de setembro de 2026"
    );
  });

  it("junta o mês quando a semana cruza a virada", () => {
    expect(tituloDoPeriodo("semana", SEGUNDA)).toBe(
      "28 de setembro a 4 de outubro de 2026"
    );
    expect(tituloDoPeriodo("semana", "2026-09-15")).toBe(
      "14 a 20 de setembro de 2026"
    );
  });

  it("repete o ano quando a semana cruza o réveillon", () => {
    expect(tituloDoPeriodo("semana", "2026-12-31")).toBe(
      "28 de dezembro de 2026 a 3 de janeiro de 2027"
    );
  });

  it("nomeia o mês", () => {
    expect(tituloDoPeriodo("mes", SEGUNDA)).toBe("setembro de 2026");
  });
});

describe("faixas e término sugerido", () => {
  it("divide o expediente em faixas de 30 minutos", () => {
    const faixas = faixasDoExpediente();

    expect(faixas[0]).toBe("07:00");
    expect(faixas[faixas.length - 1]).toBe("21:30");
    expect(faixas).toHaveLength(30);
  });

  it("sugere duas aulas de duração, sem passar do fechamento", () => {
    expect(sugerirTermino("19:00")).toBe("20:40");
    expect(sugerirTermino("21:00")).toBe("22:00");
  });
});

describe("posição na grade", () => {
  it("mede a partir da abertura", () => {
    const [posicao] = posicionarNoDia(
      [reserva("a", SEGUNDA, "19:00", "20:40")],
      SEGUNDA
    );

    expect(posicao.topo).toBe(12 * 60);
    expect(posicao.altura).toBe(100);
    expect(posicao.colunas).toBe(1);
  });

  it("ignora reservas de outros dias", () => {
    expect(
      posicionarNoDia([reserva("a", "2026-09-29", "19:00", "20:00")], SEGUNDA)
    ).toHaveLength(0);
  });

  it("divide a largura entre reservas simultâneas", () => {
    const posicoes = posicionarNoDia(
      [
        reserva("a", SEGUNDA, "19:00", "20:40"),
        reserva("b", SEGUNDA, "19:00", "20:40"),
      ],
      SEGUNDA
    );

    expect(posicoes.map((p) => p.coluna).sort()).toEqual([0, 1]);
    expect(posicoes.every((p) => p.colunas === 2)).toBe(true);
  });

  // Encostar não é sobrepor: 19:00-20:00 e 20:00-21:00 ocupam a largura toda.
  it("não divide reservas que apenas se encostam", () => {
    const posicoes = posicionarNoDia(
      [
        reserva("a", SEGUNDA, "19:00", "20:00"),
        reserva("b", SEGUNDA, "20:00", "21:00"),
      ],
      SEGUNDA
    );

    expect(posicoes.every((p) => p.colunas === 1 && p.coluna === 0)).toBe(true);
  });

  it("reaproveita a coluna liberada dentro do mesmo grupo", () => {
    const posicoes = posicionarNoDia(
      [
        reserva("longa", SEGUNDA, "08:00", "12:00"),
        reserva("cedo", SEGUNDA, "08:00", "09:00"),
        reserva("tarde", SEGUNDA, "10:00", "11:00"),
      ],
      SEGUNDA
    );

    const coluna = (id: string) => posicoes.find((p) => p.item.id === id)!.coluna;

    expect(coluna("longa")).toBe(0);
    expect(coluna("cedo")).toBe(1);
    expect(coluna("tarde")).toBe(1);
    expect(posicoes.every((p) => p.colunas === 2)).toBe(true);
  });

  it("dá altura mínima a reservas muito curtas, para continuarem clicáveis", () => {
    const [posicao] = posicionarNoDia(
      [reserva("a", SEGUNDA, "19:00", "19:05")],
      SEGUNDA
    );

    expect(posicao.altura).toBe(15);
  });
});

describe("intervalo arrastado", () => {
  const h = (hora: number, minuto = 0) => hora * 60 + minuto;

  it("encaixa em 15 minutos, arredondando para fora", () => {
    expect(intervaloArrastado(h(19, 5), h(20, 35))).toEqual({
      inicio: "19:00",
      fim: "20:45",
    });
  });

  it("aceita arrastar de baixo para cima", () => {
    expect(intervaloArrastado(h(21), h(19, 10))).toEqual({
      inicio: "19:00",
      fim: "21:00",
    });
  });

  it("garante pelo menos um passo de duração", () => {
    expect(intervaloArrastado(h(19), h(19))).toEqual({ inicio: "19:00", fim: "19:15" });
  });

  it("não sai do expediente", () => {
    expect(intervaloArrastado(h(6), h(8))).toEqual({ inicio: "07:00", fim: "08:00" });
    expect(intervaloArrastado(h(21, 50), h(23))).toEqual({ inicio: "21:45", fim: "22:00" });
  });
});
