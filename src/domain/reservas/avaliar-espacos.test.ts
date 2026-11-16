import { describe, it, expect } from "vitest";
import { avaliarEspacos, encontrarConflitosDeHorario } from "./avaliar-espacos";
import type {
  ContextoDaReserva,
  PedidoDeReserva,
  TurmaParaReserva,
  OcupacaoExistente,
  EspacoParaReserva,
} from "./tipos";

const PROF_ANA = "prof-ana";
const PROF_CARLOS = "prof-carlos";
const TURMA_SI8 = "class-si8";
const TURMA_ENG2 = "class-eng2";
const RES_PROJETOR = "res-projetor";
const RES_COMPUTADORES = "res-computadores";

const AGORA = new Date("2026-09-01T12:00:00-03:00");

function segunda(hora: string): Date {
  return new Date(`2026-09-14T${hora}:00-03:00`);
}

function sala(
  alteracoes: Partial<EspacoParaReserva> & { id: string },
): EspacoParaReserva {
  return {
    nome: alteracoes.id,
    predio: "Bloco A",
    capacidade: 40,
    recursoIds: [],
    ...alteracoes,
  };
}

function montarTurma(
  alteracoes: Partial<TurmaParaReserva> = {},
): TurmaParaReserva {
  return {
    id: TURMA_SI8,
    nome: "SI 8º A",
    quantidadeDeAlunos: 38,
    ...alteracoes,
  };
}

function pedido(
  alteracoes: Partial<Omit<PedidoDeReserva, "espacoId">> = {},
): Omit<PedidoDeReserva, "espacoId"> {
  return {
    professorId: PROF_ANA,
    turmaId: TURMA_SI8,
    disciplinaId: null,
    tipoDeAtividade: "lecture" as const,
    finalidade: "Aula de Banco de Dados II",
    inicio: segunda("19:00"),
    fim: segunda("20:40"),
    recursosExigidos: [],
    ...alteracoes,
  };
}

function contexto(
  alteracoes: Partial<Omit<ContextoDaReserva, "espaco">> = {},
): Omit<ContextoDaReserva, "espaco"> {
  return {
    turma: montarTurma(),
    vinculo: null,
    ocupacoes: [],
    agora: AGORA,
    ...alteracoes,
  };
}

function reservaExistente(
  alteracoes: Partial<OcupacaoExistente> = {},
): OcupacaoExistente {
  return {
    id: "b1",
    espacoId: "lab-01",
    professorId: PROF_CARLOS,
    turmaId: TURMA_ENG2,
    finalidade: "Aula anterior",
    inicio: segunda("19:00"),
    fim: segunda("20:40"),
    ...alteracoes,
  };
}

describe("avaliarEspacos", () => {
  it("separa os espaços que servem dos que não servem", () => {
    const salas = [
      sala({ id: "pequena", capacidade: 20 }),
      sala({ id: "serve", capacidade: 40 }),
    ];

    const resultado = avaliarEspacos(pedido(), salas, contexto());

    expect(resultado.map((a) => [a.espaco.id, a.compativel])).toEqual([
      ["serve", true],
      ["pequena", false],
    ]);
  });

  it("explica por que cada espaço incompatível foi descartado", () => {
    const salas = [
      sala({ id: "sem-projetor", capacidade: 40, recursoIds: [] }),
      sala({ id: "pequena", capacidade: 10, recursoIds: [RES_PROJETOR] }),
    ];

    const resultado = avaliarEspacos(
      pedido({ recursosExigidos: [RES_PROJETOR] }),
      salas,
      contexto(),
    );

    const porId = Object.fromEntries(
      resultado.map((a) => [a.espaco.id, a.violacoes.map((v) => v.codigo)]),
    );

    expect(porId["sem-projetor"]).toEqual(["RECURSOS_FALTANTES"]);
    expect(porId["pequena"]).toEqual(["CAPACIDADE_INSUFICIENTE"]);
  });

  it("marca como ocupado apenas o espaço que tem reserva no horário", () => {
    const salas = [sala({ id: "lab-01" }), sala({ id: "lab-02" })];

    const resultado = avaliarEspacos(
      pedido(),
      salas,
      contexto({ ocupacoes: [reservaExistente({ espacoId: "lab-01" })] }),
    );

    const porId = Object.fromEntries(
      resultado.map((a) => [a.espaco.id, a.violacoes.map((v) => v.codigo)]),
    );

    expect(porId["lab-01"]).toEqual(["CONFLITO_DE_ESPACO"]);
    expect(porId["lab-02"]).toEqual([]);
  });

  it("não repete conflito de professor em cada espaço da lista", () => {
    const salas = [sala({ id: "lab-01" }), sala({ id: "lab-02" })];

    const resultado = avaliarEspacos(
      pedido(),
      salas,
      contexto({
        ocupacoes: [
          reservaExistente({ espacoId: "outro", professorId: PROF_ANA }),
        ],
      }),
    );

    for (const avaliacao of resultado) {
      expect(avaliacao.violacoes).toEqual([]);
      expect(avaliacao.compativel).toBe(false);
    }
  });

  it("sugere o espaço mais justo antes do maior", () => {
    const salas = [
      sala({ id: "auditorio", capacidade: 120 }),
      sala({ id: "lab", capacidade: 40 }),
      sala({ id: "sala-media", capacidade: 60 }),
    ];

    const resultado = avaliarEspacos(pedido(), salas, contexto());

    expect(resultado.map((a) => a.espaco.id)).toEqual([
      "lab",
      "sala-media",
      "auditorio",
    ]);
  });

  it("devolve lista vazia quando não há espaço cadastrado", () => {
    expect(avaliarEspacos(pedido(), [], contexto())).toEqual([]);
  });

  it("considera todos incompatíveis quando o período é inválido", () => {
    const resultado = avaliarEspacos(
      pedido({ inicio: segunda("20:40"), fim: segunda("19:00") }),
      [sala({ id: "lab" })],
      contexto(),
    );

    expect(resultado[0].compativel).toBe(false);
  });
});

describe("encontrarConflitosDeHorario", () => {
  it("encontra o conflito de professor, que independe do espaço", () => {
    const violacoes = encontrarConflitosDeHorario(
      pedido(),
      contexto({
        ocupacoes: [
          reservaExistente({ espacoId: "outro", professorId: PROF_ANA }),
        ],
      }),
    );

    expect(violacoes.map((v) => v.codigo)).toEqual(["CONFLITO_DE_PROFESSOR"]);
  });

  it("encontra o conflito de turma", () => {
    const violacoes = encontrarConflitosDeHorario(
      pedido(),
      contexto({
        ocupacoes: [
          reservaExistente({ espacoId: "outro", turmaId: TURMA_SI8 }),
        ],
      }),
    );

    expect(violacoes.map((v) => v.codigo)).toEqual(["CONFLITO_DE_TURMA"]);
  });

  it("ignora capacidade e recursos, que são assunto de cada espaço", () => {
    const violacoes = encontrarConflitosDeHorario(
      pedido({ recursosExigidos: [RES_COMPUTADORES] }),
      contexto({ turma: montarTurma({ quantidadeDeAlunos: 5000 }) }),
    );

    expect(violacoes).toEqual([]);
  });

  it("devolve o período inválido, que também independe do espaço", () => {
    const violacoes = encontrarConflitosDeHorario(
      pedido({ inicio: segunda("20:40"), fim: segunda("19:00") }),
      contexto(),
    );

    expect(violacoes.map((v) => v.codigo)).toEqual(["PERIODO_INVALIDO"]);
  });

  it("não devolve nada quando o horário está livre", () => {
    expect(encontrarConflitosDeHorario(pedido(), contexto())).toEqual([]);
  });
});
