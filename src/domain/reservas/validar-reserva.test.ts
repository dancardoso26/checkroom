import { describe, it, expect } from "vitest";
import { validarReserva } from "./validar-reserva";
import type {
  ContextoDaReserva,
  PedidoDeReserva,
  ViolacaoDaReserva,
  TurmaParaReserva,
  OcupacaoExistente,
  EspacoParaReserva,
} from "./tipos";

const SALA_101 = "room-101";
const LABORATORIO = "room-lab";
const PROF_ANA = "prof-ana";
const PROF_CARLOS = "prof-carlos";
const TURMA_SI8 = "class-si8";
const TURMA_ENG2 = "class-eng2";
const RES_PROJETOR = "res-projetor";
const DISCIPLINA_ES = "subject-engenharia-software";
const RES_COMPUTADORES = "res-computadores";

const AGORA = new Date("2026-09-01T12:00:00-03:00");

function segunda(hora: string): Date {
  return new Date(`2026-09-14T${hora}:00-03:00`);
}

function montarEspaco(
  alteracoes: Partial<EspacoParaReserva> = {},
): EspacoParaReserva {
  return {
    id: SALA_101,
    nome: "101",
    predio: "Bloco A",
    capacidade: 45,
    recursoIds: [RES_PROJETOR],
    ...alteracoes,
  };
}

function montarTurma(
  alteracoes: Partial<TurmaParaReserva> = {},
): TurmaParaReserva {
  return {
    id: TURMA_SI8,
    nome: "SI 8º semestre A",
    quantidadeDeAlunos: 42,
    ...alteracoes,
  };
}

function montarPedido(
  alteracoes: Partial<PedidoDeReserva> = {},
): PedidoDeReserva {
  return {
    espacoId: SALA_101,
    professorId: PROF_ANA,
    turmaId: TURMA_SI8,
    disciplinaId: DISCIPLINA_ES,
    tipoDeAtividade: "class" as const,
    finalidade: "Aula de Engenharia de Software",
    inicio: segunda("19:00"),
    fim: segunda("20:40"),
    recursosExigidos: [RES_PROJETOR],
    ...alteracoes,
  };
}

function montarContexto(
  alteracoes: Partial<ContextoDaReserva> = {},
): ContextoDaReserva {
  return {
    espaco: montarEspaco(),
    turma: montarTurma(),
    vinculo: {
      professorId: PROF_ANA,
      disciplinaId: DISCIPLINA_ES,
      turmaId: TURMA_SI8,
      periodo: "2026.2",
    },
    ocupacoes: [],
    agora: AGORA,
    ...alteracoes,
  };
}

function montarOcupacao(
  alteracoes: Partial<OcupacaoExistente> = {},
): OcupacaoExistente {
  return {
    id: "reserva-existente",
    espacoId: SALA_101,
    professorId: PROF_ANA,
    turmaId: TURMA_SI8,
    finalidade: "Aula anterior",
    inicio: segunda("19:00"),
    fim: segunda("20:40"),
    ...alteracoes,
  };
}

function codigosDe(resultado: ReturnType<typeof validarReserva>): string[] {
  return resultado.valida
    ? []
    : resultado.violacoes.map((violacao: ViolacaoDaReserva) => violacao.codigo);
}

describe("validarReserva", () => {
  describe("pedido válido", () => {
    it("aceita uma reserva sem conflito e compatível com o espaço", () => {
      const resultado = validarReserva(montarPedido(), montarContexto());

      expect(resultado).toEqual({ valida: true });
    });

    it("aceita reservas simultâneas quando não compartilham espaço, professor nem turma", () => {
      const outraReserva = montarOcupacao({
        espacoId: LABORATORIO,
        professorId: PROF_CARLOS,
        turmaId: TURMA_ENG2,
      });

      const resultado = validarReserva(
        montarPedido(),
        montarContexto({ ocupacoes: [outraReserva] }),
      );

      expect(resultado).toEqual({ valida: true });
    });
  });

  describe("conflito triplo", () => {
    it("recusa quando o espaço já está ocupado", () => {
      const ocupada = montarOcupacao({
        professorId: PROF_CARLOS,
        turmaId: TURMA_ENG2,
      });

      const resultado = validarReserva(
        montarPedido(),
        montarContexto({ ocupacoes: [ocupada] }),
      );

      expect(codigosDe(resultado)).toEqual(["CONFLITO_DE_ESPACO"]);
    });

    it("recusa quando o professor já tem compromisso, mesmo em outro espaço", () => {
      const ocupado = montarOcupacao({
        espacoId: LABORATORIO,
        turmaId: TURMA_ENG2,
      });

      const resultado = validarReserva(
        montarPedido(),
        montarContexto({ ocupacoes: [ocupado] }),
      );

      expect(codigosDe(resultado)).toEqual(["CONFLITO_DE_PROFESSOR"]);
    });

    it("recusa quando a turma já tem aula, mesmo em outro espaço", () => {
      const ocupada = montarOcupacao({
        espacoId: LABORATORIO,
        professorId: PROF_CARLOS,
      });

      const resultado = validarReserva(
        montarPedido(),
        montarContexto({ ocupacoes: [ocupada] }),
      );

      expect(codigosDe(resultado)).toEqual(["CONFLITO_DE_TURMA"]);
    });

    it("reporta os três motivos quando a reserva existente compartilha tudo", () => {
      const resultado = validarReserva(
        montarPedido(),
        montarContexto({ ocupacoes: [montarOcupacao()] }),
      );

      expect(codigosDe(resultado)).toEqual([
        "CONFLITO_DE_ESPACO",
        "CONFLITO_DE_PROFESSOR",
        "CONFLITO_DE_TURMA",
      ]);
    });

    it("reporta cada categoria uma única vez, ainda que várias reservas conflitem", () => {
      const primeira = montarOcupacao({
        id: "b1",
        professorId: PROF_CARLOS,
        turmaId: TURMA_ENG2,
      });
      const segundaReserva = montarOcupacao({
        id: "b2",
        professorId: PROF_CARLOS,
        turmaId: TURMA_ENG2,
        inicio: segunda("20:00"),
        fim: segunda("21:30"),
      });

      const resultado = validarReserva(
        montarPedido(),
        montarContexto({ ocupacoes: [primeira, segundaReserva] }),
      );

      expect(codigosDe(resultado)).toEqual(["CONFLITO_DE_ESPACO"]);
    });

    it("aponta qual reserva causou o conflito", () => {
      const ocupada = montarOcupacao({
        id: "b-alvo",
        finalidade: "Prova de recuperação",
        professorId: PROF_CARLOS,
        turmaId: TURMA_ENG2,
      });

      const resultado = validarReserva(
        montarPedido(),
        montarContexto({ ocupacoes: [ocupada] }),
      );

      expect(resultado.valida).toBe(false);
      if (resultado.valida) return;

      const violacao = resultado.violacoes[0];
      expect(violacao).toMatchObject({
        codigo: "CONFLITO_DE_ESPACO",
        conflito: { id: "b-alvo", finalidade: "Prova de recuperação" },
      });
    });
  });

  describe("limites do intervalo", () => {
    it("aceita uma reserva que começa exatamente quando a anterior termina", () => {
      const anterior = montarOcupacao({
        inicio: segunda("17:20"),
        fim: segunda("19:00"),
      });

      const resultado = validarReserva(
        montarPedido(),
        montarContexto({ ocupacoes: [anterior] }),
      );

      expect(resultado).toEqual({ valida: true });
    });

    it("aceita uma reserva que termina exatamente quando a próxima começa", () => {
      const posterior = montarOcupacao({
        inicio: segunda("20:40"),
        fim: segunda("22:20"),
      });

      const resultado = validarReserva(
        montarPedido(),
        montarContexto({ ocupacoes: [posterior] }),
      );

      expect(resultado).toEqual({ valida: true });
    });

    it("recusa quando a sobreposição é de um único minuto", () => {
      const anterior = montarOcupacao({
        inicio: segunda("17:20"),
        fim: segunda("19:01"),
      });

      const resultado = validarReserva(
        montarPedido(),
        montarContexto({ ocupacoes: [anterior] }),
      );

      expect(codigosDe(resultado)).toContain("CONFLITO_DE_ESPACO");
    });

    it("recusa quando a reserva existente está inteiramente contida no pedido", () => {
      const contida = montarOcupacao({
        inicio: segunda("19:30"),
        fim: segunda("20:00"),
      });

      const resultado = validarReserva(
        montarPedido(),
        montarContexto({ ocupacoes: [contida] }),
      );

      expect(codigosDe(resultado)).toContain("CONFLITO_DE_ESPACO");
    });

    it("ignora reservas que não tocam o período, mesmo se vierem na consulta", () => {
      const distante = montarOcupacao({
        inicio: segunda("07:00"),
        fim: segunda("08:40"),
      });

      const resultado = validarReserva(
        montarPedido(),
        montarContexto({ ocupacoes: [distante] }),
      );

      expect(resultado).toEqual({ valida: true });
    });
  });

  describe("compatibilidade entre turma e espaço", () => {
    it("recusa quando a turma é maior que a capacidade do espaço", () => {
      const resultado = validarReserva(
        montarPedido(),
        montarContexto({
          espaco: montarEspaco({ capacidade: 30 }),
          turma: montarTurma({ quantidadeDeAlunos: 55 }),
        }),
      );

      expect(codigosDe(resultado)).toEqual(["CAPACIDADE_INSUFICIENTE"]);
    });

    it("aceita quando a turma ocupa exatamente a capacidade", () => {
      const resultado = validarReserva(
        montarPedido(),
        montarContexto({
          espaco: montarEspaco({ capacidade: 42 }),
          turma: montarTurma({ quantidadeDeAlunos: 42 }),
        }),
      );

      expect(resultado).toEqual({ valida: true });
    });

    it("recusa quando o espaço não oferece um recurso exigido", () => {
      const resultado = validarReserva(
        montarPedido({ recursosExigidos: [RES_PROJETOR, RES_COMPUTADORES] }),
        montarContexto({
          espaco: montarEspaco({ recursoIds: [RES_PROJETOR] }),
        }),
      );

      expect(resultado.valida).toBe(false);
      if (resultado.valida) return;

      expect(resultado.violacoes[0]).toEqual({
        codigo: "RECURSOS_FALTANTES",
        recursosFaltantes: [RES_COMPUTADORES],
      });
    });

    it("aceita quando o espaço oferece mais recursos do que o exigido", () => {
      const resultado = validarReserva(
        montarPedido({ recursosExigidos: [RES_PROJETOR] }),
        montarContexto({
          espaco: montarEspaco({
            recursoIds: [RES_PROJETOR, RES_COMPUTADORES],
          }),
        }),
      );

      expect(resultado).toEqual({ valida: true });
    });

    it("aceita quando a reserva não exige recurso nenhum", () => {
      const resultado = validarReserva(
        montarPedido({ recursosExigidos: [] }),
        montarContexto({ espaco: montarEspaco({ recursoIds: [] }) }),
      );

      expect(resultado).toEqual({ valida: true });
    });

    it("não repete um recurso enviado duas vezes pelo formulário", () => {
      const resultado = validarReserva(
        montarPedido({
          recursosExigidos: [RES_COMPUTADORES, RES_COMPUTADORES],
        }),
        montarContexto({ espaco: montarEspaco({ recursoIds: [] }) }),
      );

      expect(resultado.valida).toBe(false);
      if (resultado.valida) return;

      expect(resultado.violacoes[0]).toEqual({
        codigo: "RECURSOS_FALTANTES",
        recursosFaltantes: [RES_COMPUTADORES],
      });
    });
  });

  describe("verificações estruturais", () => {
    it("recusa quando o término é anterior ao início", () => {
      const resultado = validarReserva(
        montarPedido({
          inicio: segunda("20:40"),
          fim: segunda("19:00"),
        }),
        montarContexto(),
      );

      expect(codigosDe(resultado)).toContain("PERIODO_INVALIDO");
    });

    it("recusa quando início e término são iguais", () => {
      const resultado = validarReserva(
        montarPedido({
          inicio: segunda("19:00"),
          fim: segunda("19:00"),
        }),
        montarContexto(),
      );

      expect(codigosDe(resultado)).toContain("PERIODO_INVALIDO");
    });

    it("não avalia conflitos quando o período é inválido", () => {
      const resultado = validarReserva(
        montarPedido({
          inicio: segunda("20:40"),
          fim: segunda("19:00"),
        }),
        montarContexto({ ocupacoes: [montarOcupacao()] }),
      );

      expect(codigosDe(resultado)).toEqual(["PERIODO_INVALIDO"]);
    });

    it("recusa quando a finalidade vem vazia", () => {
      const resultado = validarReserva(
        montarPedido({ finalidade: "   " }),
        montarContexto(),
      );

      expect(codigosDe(resultado)).toEqual(["FINALIDADE_VAZIA"]);
    });

    it("recusa quando o espaço não existe mais", () => {
      const resultado = validarReserva(
        montarPedido(),
        montarContexto({ espaco: null }),
      );

      expect(codigosDe(resultado)).toEqual(["ESPACO_NAO_ENCONTRADO"]);
    });

    it("recusa quando a turma não existe mais", () => {
      const resultado = validarReserva(
        montarPedido(),
        montarContexto({ turma: null }),
      );

      expect(codigosDe(resultado)).toEqual(["TURMA_NAO_ENCONTRADA"]);
    });

    it("recusa um início antes da abertura", () => {
      const resultado = validarReserva(
        montarPedido({ inicio: segunda("06:30"), fim: segunda("08:00") }),
        montarContexto(),
      );

      expect(codigosDe(resultado)).toContain("FORA_DO_EXPEDIENTE");
    });

    it("recusa um término depois do fechamento", () => {
      const resultado = validarReserva(
        montarPedido({ inicio: segunda("21:00"), fim: segunda("22:30") }),
        montarContexto(),
      );

      expect(codigosDe(resultado)).toContain("FORA_DO_EXPEDIENTE");
    });

    it("aceita o período que ocupa exatamente a abertura e o fechamento", () => {
      const resultado = validarReserva(
        montarPedido({ inicio: segunda("07:00"), fim: segunda("22:00") }),
        montarContexto(),
      );

      expect(resultado).toEqual({ valida: true });
    });

    it("recusa uma reserva que atravessa a virada do dia", () => {
      const resultado = validarReserva(
        montarPedido({
          inicio: segunda("21:00"),
          fim: new Date("2026-09-15T08:00:00-03:00"),
        }),
        montarContexto(),
      );

      expect(codigosDe(resultado)).toContain("FORA_DO_EXPEDIENTE");
    });

    it("não reporta expediente quando o período está invertido", () => {
      const resultado = validarReserva(
        montarPedido({ inicio: segunda("20:00"), fim: segunda("19:00") }),
        montarContexto(),
      );

      expect(codigosDe(resultado)).toEqual(["PERIODO_INVALIDO"]);
    });

    it("recusa um horário que já passou", () => {
      const resultado = validarReserva(
        montarPedido(),
        montarContexto({ agora: new Date("2026-09-20T12:00:00-03:00") }),
      );

      expect(codigosDe(resultado)).toContain("INICIO_NO_PASSADO");
    });
  });

  describe("vínculo acadêmico", () => {
    it("recusa quando o professor não leciona a disciplina para a turma", () => {
      const resultado = validarReserva(
        montarPedido(),
        montarContexto({ vinculo: null }),
      );

      expect(codigosDe(resultado)).toEqual(["SEM_VINCULO_DOCENTE"]);
    });

    it("informa o período letivo na violação", () => {
      const resultado = validarReserva(
        montarPedido(),
        montarContexto({ vinculo: null }),
      );

      expect(resultado.valida).toBe(false);
      if (resultado.valida) return;

      expect(resultado.violacoes[0]).toMatchObject({
        codigo: "SEM_VINCULO_DOCENTE",
        periodo: expect.stringMatching(/^\d{4}\.\d$/),
      });
    });

    it("recusa prova do professor numa turma em que ele não leciona", () => {
      const resultado = validarReserva(
        montarPedido({
          tipoDeAtividade: "exam",
          disciplinaId: null,
          finalidade: "Prova de recuperação",
        }),
        montarContexto({ vinculo: null, turmasDoProfessor: [TURMA_ENG2] }),
      );

      expect(codigosDe(resultado)).toEqual(["TURMA_SEM_VINCULO"]);
    });

    it("aceita prova do professor numa turma em que ele leciona", () => {
      const resultado = validarReserva(
        montarPedido({
          tipoDeAtividade: "exam",
          disciplinaId: null,
          finalidade: "Prova de recuperação",
        }),
        montarContexto({ vinculo: null, turmasDoProfessor: [TURMA_SI8] }),
      );

      expect(resultado).toEqual({ valida: true });
    });

    it("aceita prova sem disciplina nem vínculo", () => {
      const resultado = validarReserva(
        montarPedido({
          tipoDeAtividade: "exam",
          disciplinaId: null,
          finalidade: "Prova de recuperação",
        }),
        montarContexto({ vinculo: null }),
      );

      expect(resultado).toEqual({ valida: true });
    });

    it("exige disciplina quando a atividade é aula", () => {
      const resultado = validarReserva(
        montarPedido({ disciplinaId: null }),
        montarContexto({ vinculo: null }),
      );

      expect(codigosDe(resultado)).toEqual(["DISCIPLINA_OBRIGATORIA"]);
    });

    it("não exige vínculo em palestra, prova nem evento", () => {
      for (const tipo of ["lecture", "exam", "event"] as const) {
        const resultado = validarReserva(
          montarPedido({ tipoDeAtividade: tipo, disciplinaId: null }),
          montarContexto({ vinculo: null }),
        );

        expect(resultado, `tipo ${tipo}`).toEqual({ valida: true });
      }
    });

    it("aceita quando o vínculo existe", () => {
      const resultado = validarReserva(montarPedido(), montarContexto());

      expect(resultado).toEqual({ valida: true });
    });
  });

  describe("acúmulo de violações", () => {
    it("reporta todos os problemas de uma vez, e não apenas o primeiro", () => {
      const ocupada = montarOcupacao({
        professorId: PROF_CARLOS,
        turmaId: TURMA_ENG2,
      });

      const resultado = validarReserva(
        montarPedido({ recursosExigidos: [RES_COMPUTADORES] }),
        montarContexto({
          espaco: montarEspaco({ capacidade: 20, recursoIds: [] }),
          turma: montarTurma({ quantidadeDeAlunos: 55 }),
          ocupacoes: [ocupada],
        }),
      );

      expect(codigosDe(resultado)).toEqual([
        "CONFLITO_DE_ESPACO",
        "CAPACIDADE_INSUFICIENTE",
        "RECURSOS_FALTANTES",
      ]);
    });
  });
});

describe("calendário letivo", () => {
  const LETIVO = { periodo: { codigo: "2026.2" }, bloqueios: [] };

  function codigos(contexto: Partial<ContextoDaReserva>) {
    const resultado = validarReserva(montarPedido(), montarContexto(contexto));
    return resultado.valida ? [] : resultado.violacoes.map((v) => v.codigo);
  }

  it("aceita a reserva dentro do período letivo e sem bloqueio", () => {
    expect(codigos({ calendario: LETIVO })).toEqual([]);
  });

  it("recusa data fora de qualquer período letivo", () => {
    expect(codigos({ calendario: { periodo: null, bloqueios: [] } })).toEqual([
      "FORA_DO_PERIODO_LETIVO",
    ]);
  });

  it("recusa data com feriado, que vale para todos os espaços", () => {
    expect(
      codigos({
        calendario: {
          ...LETIVO,
          bloqueios: [{ espacoId: null, motivo: "Finados" }],
        },
      }),
    ).toEqual(["DATA_BLOQUEADA"]);
  });

  it("o bloqueio de um espaço recusa só aquele espaço", () => {
    const bloqueioDoLab = { espacoId: LABORATORIO, motivo: "Manutenção" };

    expect(
      codigos({ calendario: { ...LETIVO, bloqueios: [bloqueioDoLab] } }),
    ).toEqual([]);
    expect(
      codigos({
        espaco: montarEspaco({ id: LABORATORIO }),
        calendario: { ...LETIVO, bloqueios: [bloqueioDoLab] },
      }),
    ).toEqual([]);

    const resultado = validarReserva(
      montarPedido({ espacoId: LABORATORIO }),
      montarContexto({
        espaco: montarEspaco({ id: LABORATORIO }),
        calendario: { ...LETIVO, bloqueios: [bloqueioDoLab] },
      }),
    );
    expect(resultado.valida ? [] : resultado.violacoes).toEqual([
      { codigo: "ESPACO_BLOQUEADO", motivo: "Manutenção" },
    ]);
  });

  it("procura o vínculo de professor no período da data", () => {
    const resultado = validarReserva(
      montarPedido(),
      montarContexto({
        vinculo: null,
        calendario: { periodo: { codigo: "2027.1" }, bloqueios: [] },
      }),
    );

    expect(resultado.valida ? [] : resultado.violacoes).toContainEqual({
      codigo: "SEM_VINCULO_DOCENTE",
      periodo: "2027.1",
    });
  });
});
