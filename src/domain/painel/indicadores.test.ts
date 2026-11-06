import { describe, expect, it } from "vitest";

import {
  SEMANA,
  chamado,
  h,
  reserva,
} from "./apoio-de-teste";
import {
  chamadosCriadosNoPeriodo,
  chamadosPorSituacao,
  formatarDuracao,
  indicadoresDeChamados,
  indicadoresDePalestras,
  indicadoresDeReservas,
  rankingPorContagem,
  reservasPorTipo,
} from "./indicadores";

describe("chamadosPorSituacao", () => {
  it("cruza situação e prioridade, com o total de cada situação", () => {
    const linhas = chamadosPorSituacao([
      chamado({ prioridade: "high" }),
      chamado({ prioridade: "low" }),
      chamado({ situacao: "resolved", prioridade: "high" }),
    ]);

    expect(linhas.find((l) => l.situacao === "open")).toEqual({
      situacao: "open",
      total: 2,
      high: 1,
      medium: 0,
      low: 1,
    });
    expect(linhas.find((l) => l.situacao === "cancelled")?.total).toBe(0);
  });
});

describe("indicadoresDeReservas", () => {
  it("separa as canceladas e soma as horas reservadas", () => {
    const resultado = indicadoresDeReservas(
      [
        reserva(),
        reserva({ inicio: h("13", "08:00"), fim: h("13", "10:00") }),
        reserva({ cancelada: true }),
        reserva({ cancelada: true }),
      ],
      [],
      SEMANA
    );

    expect(resultado).toMatchObject({
      reservas: 2,
      canceladas: 2,
      taxaDeCancelamento: 0.5,
      horasReservadas: 3,
    });
  });

  it("não divide por zero sem reservas", () => {
    expect(indicadoresDeReservas([], [], SEMANA).taxaDeCancelamento).toBe(0);
  });
});

describe("indicadoresDePalestras", () => {
  const palestra = (vagas: number, inscritos: number) => ({
    id: "p",
    titulo: "IA",
    espacoId: "a",
    inicio: h("15", "19:00"),
    fim: h("15", "21:00"),
    vagas,
    inscritos,
  });

  it("calcula o preenchimento das vagas e conta as lotadas", () => {
    expect(
      indicadoresDePalestras([palestra(50, 20), palestra(10, 10)])
    ).toEqual({ palestras: 2, inscricoes: 30, preenchimento: 0.5, lotadas: 1 });
  });

  it("zera tudo sem palestras", () => {
    expect(indicadoresDePalestras([])).toEqual({
      palestras: 0,
      inscricoes: 0,
      preenchimento: 0,
      lotadas: 0,
    });
  });
});

describe("indicadoresDeChamados", () => {
  it("ignora os chamados criados fora do período e calcula os tempos médios", () => {
    const chamados = [
      chamado({ iniciadoEm: h("12", "12:00"), resolvidoEm: h("12", "16:00"), situacao: "resolved" }),
      chamado({ criadoEm: h("13", "10:00"), iniciadoEm: h("13", "14:00"), situacao: "in_progress" }),
      chamado({ criadoEm: h("14", "10:00") }),
      chamado({ criadoEm: h("05", "10:00"), resolvidoEm: h("13", "10:00"), situacao: "resolved" }),
    ];

    const resultado = indicadoresDeChamados(chamados, SEMANA);

    expect(chamadosCriadosNoPeriodo(chamados, SEMANA)).toHaveLength(3);
    expect(resultado).toEqual({
      criados: 3,
      abertos: 1,
      emAtendimento: 1,
      horasAteAssumir: 3,
      horasAteResolver: 6,
    });
  });

  it("devolve nulo quando nenhum chamado foi assumido ou resolvido", () => {
    const resultado = indicadoresDeChamados([chamado()], SEMANA);
    expect(resultado.horasAteAssumir).toBeNull();
    expect(resultado.horasAteResolver).toBeNull();
  });
});

describe("formatarDuracao", () => {
  it("escolhe minutos, horas ou dias conforme o tamanho", () => {
    expect(formatarDuracao(null)).toBe("-");
    expect(formatarDuracao(0.5)).toBe("30 min");
    expect(formatarDuracao(3)).toBe("3 h");
    expect(formatarDuracao(72)).toBe("3 dias");
  });
});

describe("rankingPorContagem", () => {
  it("ordena do maior para o menor, usa o nome e respeita o limite", () => {
    const nomes = new Map([
      ["a", "Ana"],
      ["b", "Bruno"],
      ["c", "Carla"],
    ]);

    expect(rankingPorContagem(["b", "a", "b", "c", "c", "b", null], nomes, 2)).toEqual([
      { id: "b", nome: "Bruno", total: 3 },
      { id: "c", nome: "Carla", total: 2 },
    ]);
  });

  it("desempata pelo nome", () => {
    const nomes = new Map([
      ["a", "Ana"],
      ["b", "Bruno"],
    ]);
    expect(rankingPorContagem(["b", "a"], nomes).map((i) => i.nome)).toEqual(["Ana", "Bruno"]);
  });
});

describe("reservasPorTipo", () => {
  it("conta só as reservas ativas e esconde os tipos sem uso", () => {
    expect(
      reservasPorTipo([
        reserva(),
        reserva(),
        reserva({ tipo: "exam" }),
        reserva({ tipo: "event", cancelada: true }),
      ])
    ).toEqual([
      { tipo: "Aula", total: 2 },
      { tipo: "Prova", total: 1 },
    ]);
  });
});
