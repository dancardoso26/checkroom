"use server";

import { z } from "zod";

import {
  avaliarEspacos,
  encontrarConflitosDeHorario,
} from "@/domain/reservas/avaliar-espacos";
import { descreverViolacoes } from "@/domain/reservas/mensagens";
import type {
  ContextoDaReserva,
  PedidoDeReserva,
  ViolacaoDaReserva,
} from "@/domain/reservas/tipos";

import { buscarTurmaParaReserva } from "@/lib/repositories/repositorio-de-turmas";
import { listarEspacos } from "@/lib/repositories/repositorio-de-espacos";
import {
  listarRecursos,
  mapaDeNomesDosRecursos,
} from "@/lib/repositories/repositorio-de-recursos";
import { buscarOcupacoesNoPeriodo } from "@/lib/repositories/repositorio-de-reservas";
import {
  buscarVinculoDocente,
  listarTurmasDoProfessor,
} from "@/lib/repositories/repositorio-de-disciplinas";
import { PERIODO_LETIVO_VIGENTE } from "@/domain/reservas/expediente";
import { combinarDataEHora } from "@/lib/datas";
import { carregarCalendarioDoDia } from "@/lib/repositories/repositorio-do-calendario";
import {
  podeCadastrarPalestra,
  podeReservarPara,
} from "@/domain/auth/permissoes";
import { exigirSessao } from "@/lib/sessao";

const schema = z.object({
  professorId: z.uuid(),
  turmaId: z.uuid(),
  disciplinaId: z.union([z.uuid(), z.literal("")]).transform((v) => v || null),
  tipoDeAtividade: z.enum(["class", "lecture", "exam", "event"]),
  data: z.iso.date(),
  horaDeInicio: z.iso.time(),
  horaDeTermino: z.iso.time(),
  recursoIds: z.array(z.uuid()),
});

export type DadosDaAnalise = z.infer<typeof schema>;

export type VeredictoDoEspaco = {
  espacoId: string;
  compativel: boolean;
  motivos: string[];
};

export type ResultadoDaAnalise =
  | {
      status: "ok";
      mensagensDeHorario: string[];
      espacos: VeredictoDoEspaco[];
    }
  | { status: "invalido"; mensagem: string };

export async function analisarReserva(
  entrada: DadosDaAnalise,
): Promise<ResultadoDaAnalise> {
  const validado = schema.safeParse(entrada);

  if (!validado.success) {
    return {
      status: "invalido",
      mensagem:
        "Preencha turma, professor, data e horário para ver os espaços.",
    };
  }

  const dados = validado.data;

  const sessao = await exigirSessao();
  if (!podeReservarPara(sessao, dados.professorId)) {
    return {
      status: "invalido",
      mensagem: "Você só pode registrar reservas em seu próprio nome.",
    };
  }

  const inicio = combinarDataEHora(dados.data, dados.horaDeInicio);
  const fim = combinarDataEHora(dados.data, dados.horaDeTermino);

  const calendario = await carregarCalendarioDoDia(dados.data);
  const periodo = calendario.periodo?.codigo ?? PERIODO_LETIVO_VIGENTE;

  const [turma, espacos, recursos, vinculo, ocupacoes, turmasDoProfessor] =
    await Promise.all([
      buscarTurmaParaReserva(dados.turmaId),
      listarEspacos(),
      listarRecursos(),
      buscarVinculoDocente({
        professorId: dados.professorId,
        disciplinaId: dados.disciplinaId,
        turmaId: dados.turmaId,
        periodo,
      }),
      buscarOcupacoesNoPeriodo({ inicio, fim }),
      sessao.papel === "professor"
        ? listarTurmasDoProfessor(dados.professorId, periodo)
        : Promise.resolve(null),
    ]);

  const nomesDosRecursos = mapaDeNomesDosRecursos(recursos);

  const pedido: Omit<PedidoDeReserva, "espacoId"> = {
    professorId: dados.professorId,
    turmaId: dados.turmaId,
    disciplinaId: dados.disciplinaId,
    tipoDeAtividade: dados.tipoDeAtividade,
    finalidade: "análise",
    inicio,
    fim,
    recursosExigidos: dados.recursoIds,
  };

  const contexto: Omit<ContextoDaReserva, "espaco"> = {
    turma,
    vinculo,
    ocupacoes,
    agora: new Date(),
    calendario,
    turmasDoProfessor,
  };

  const avaliacoes = avaliarEspacos(pedido, espacos, contexto);
  const conflitos = encontrarConflitosDeHorario(pedido, contexto);

  return {
    status: "ok",
    mensagensDeHorario: descreverViolacoes(conflitos, { nomesDosRecursos }),
    espacos: avaliacoes.map((avaliacao) => ({
      espacoId: avaliacao.espaco.id,
      compativel: avaliacao.compativel,
      motivos: descreverViolacoes(avaliacao.violacoes, { nomesDosRecursos }),
    })),
  };
}

const schemaDaPalestra = z.object({
  data: z.iso.date(),
  horaDeInicio: z.iso.time(),
  horaDeTermino: z.iso.time(),
  vagas: z.number().int().positive(),
  recursoIds: z.array(z.uuid()),
});

export type DadosDaAnaliseDaPalestra = z.infer<typeof schemaDaPalestra>;

const PUBLICO_DA_PALESTRA = "__palestra__";

export async function analisarPalestra(
  entrada: DadosDaAnaliseDaPalestra,
): Promise<ResultadoDaAnalise> {
  const validado = schemaDaPalestra.safeParse(entrada);

  if (!validado.success) {
    return {
      status: "invalido",
      mensagem: "Preencha data, horário e vagas para ver os espaços.",
    };
  }

  const sessao = await exigirSessao();
  if (!podeCadastrarPalestra(sessao)) {
    return {
      status: "invalido",
      mensagem: "Apenas a administração cadastra palestras.",
    };
  }

  const dados = validado.data;
  const inicio = combinarDataEHora(dados.data, dados.horaDeInicio);
  const fim = combinarDataEHora(dados.data, dados.horaDeTermino);

  const [calendario, espacos, recursos, ocupacoes] = await Promise.all([
    carregarCalendarioDoDia(dados.data),
    listarEspacos(),
    listarRecursos(),
    buscarOcupacoesNoPeriodo({ inicio, fim }),
  ]);

  const nomesDosRecursos = mapaDeNomesDosRecursos(recursos);

  const descrever = (violacoes: ViolacaoDaReserva[]) =>
    violacoes.map((v) =>
      v.codigo === "CAPACIDADE_INSUFICIENTE"
        ? `O espaço comporta ${v.capacidade} pessoas e a palestra tem ${v.quantidadeDeAlunos} vagas.`
        : descreverViolacoes([v], { nomesDosRecursos })[0],
    );

  const pedido: Omit<PedidoDeReserva, "espacoId"> = {
    professorId: PUBLICO_DA_PALESTRA,
    turmaId: PUBLICO_DA_PALESTRA,
    disciplinaId: null,
    tipoDeAtividade: "lecture",
    finalidade: "análise",
    inicio,
    fim,
    recursosExigidos: dados.recursoIds,
  };

  const contexto: Omit<ContextoDaReserva, "espaco"> = {
    turma: {
      id: PUBLICO_DA_PALESTRA,
      nome: "Palestra",
      quantidadeDeAlunos: dados.vagas,
    },
    vinculo: null,
    ocupacoes,
    agora: new Date(),
    calendario,
  };

  return {
    status: "ok",
    mensagensDeHorario: descrever(
      encontrarConflitosDeHorario(pedido, contexto),
    ),
    espacos: avaliarEspacos(pedido, espacos, contexto).map((avaliacao) => ({
      espacoId: avaliacao.espaco.id,
      compativel: avaliacao.compativel,
      motivos: descrever(avaliacao.violacoes),
    })),
  };
}
