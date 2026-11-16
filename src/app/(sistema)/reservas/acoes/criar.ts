"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { combinarDataEHora } from "@/lib/datas";

import { validarReserva } from "@/domain/reservas/validar-reserva";
import { descreverViolacoes } from "@/domain/reservas/mensagens";
import type { PedidoDeReserva } from "@/domain/reservas/tipos";

import { buscarEspacoParaReserva } from "@/lib/repositories/repositorio-de-espacos";
import { buscarTurmaParaReserva } from "@/lib/repositories/repositorio-de-turmas";
import {
  listarRecursos,
  mapaDeNomesDosRecursos,
} from "@/lib/repositories/repositorio-de-recursos";
import {
  gravarReserva,
  buscarCandidatosAConflito,
} from "@/lib/repositories/repositorio-de-reservas";
import {
  buscarVinculoDocente,
  listarTurmasDoProfessor,
} from "@/lib/repositories/repositorio-de-disciplinas";
import { PERIODO_LETIVO_VIGENTE } from "@/domain/reservas/expediente";
import { carregarCalendarioDoDia } from "@/lib/repositories/repositorio-do-calendario";
import { exigirSessao } from "@/lib/sessao";
import { notificarProfessor } from "./notificar";
import { podeReservarPara } from "@/domain/auth/permissoes";

const schema = z.object({
  espacoId: z.uuid("Selecione um espaço."),
  professorId: z.uuid("Selecione um professor."),
  turmaId: z.uuid("Selecione uma turma."),
  tipoDeAtividade: z.enum(["class", "exam", "event"], {
    error: "Palestras são cadastradas como palestra, não como reserva.",
  }),
  disciplinaId: z.union([z.uuid(), z.literal("")]).transform((v) => v || null),
  finalidade: z
    .string()
    .trim()
    .min(1, "Informe a finalidade da reserva.")
    .max(200, "A finalidade deve ter no máximo 200 caracteres."),
  data: z.iso.date("Informe a data."),
  horaDeInicio: z.iso.time("Informe o horário de início."),
  horaDeTermino: z.iso.time("Informe o horário de término."),
  recursoIds: z.array(z.uuid()),
});

function texto(valor: FormDataEntryValue | null): string {
  return typeof valor === "string" ? valor : "";
}

export type EstadoDoFormularioDeReserva =
  | { status: "inicial" }
  | { status: "sucesso"; reservaId: string }
  | {
      status: "erro";
      mensagens: string[];
      errosPorCampo: Record<string, string[]>;
      valores: ValoresEnviados;
    };

export type ValoresEnviados = {
  espacoId: string;
  professorId: string;
  turmaId: string;
  tipoDeAtividade: string;
  disciplinaId: string;
  finalidade: string;
  data: string;
  horaDeInicio: string;
  horaDeTermino: string;
  recursoIds: string[];
};

function erro(
  valores: ValoresEnviados,
  mensagens: string[],
  errosPorCampo: Record<string, string[]> = {},
): EstadoDoFormularioDeReserva {
  return { status: "erro", mensagens, errosPorCampo, valores };
}

export async function criarReserva(
  _estadoAnterior: EstadoDoFormularioDeReserva,
  dadosDoFormulario: FormData,
): Promise<EstadoDoFormularioDeReserva> {
  const valores: ValoresEnviados = {
    espacoId: texto(dadosDoFormulario.get("espacoId")),
    professorId: texto(dadosDoFormulario.get("professorId")),
    turmaId: texto(dadosDoFormulario.get("turmaId")),
    tipoDeAtividade: texto(dadosDoFormulario.get("tipoDeAtividade")),
    disciplinaId: texto(dadosDoFormulario.get("disciplinaId")),
    finalidade: texto(dadosDoFormulario.get("finalidade")),
    data: texto(dadosDoFormulario.get("data")),
    horaDeInicio: texto(dadosDoFormulario.get("horaDeInicio")),
    horaDeTermino: texto(dadosDoFormulario.get("horaDeTermino")),
    recursoIds: dadosDoFormulario.getAll("recursoIds").map(texto),
  };

  const validado = schema.safeParse(valores);

  if (!validado.success) {
    return erro(valores, [], z.flattenError(validado.error).fieldErrors);
  }

  const entrada = validado.data;
  const sessao = await exigirSessao();

  if (!podeReservarPara(sessao, entrada.professorId)) {
    return erro(valores, [
      "Você só pode registrar reservas em seu próprio nome.",
    ]);
  }

  const pedido: PedidoDeReserva = {
    espacoId: entrada.espacoId,
    professorId: entrada.professorId,
    turmaId: entrada.turmaId,
    tipoDeAtividade: entrada.tipoDeAtividade,
    disciplinaId: entrada.disciplinaId,
    finalidade: entrada.finalidade,
    inicio: combinarDataEHora(entrada.data, entrada.horaDeInicio),
    fim: combinarDataEHora(entrada.data, entrada.horaDeTermino),
    recursosExigidos: entrada.recursoIds,
  };

  const calendario = await carregarCalendarioDoDia(entrada.data);
  const periodo = calendario.periodo?.codigo ?? PERIODO_LETIVO_VIGENTE;

  const [
    espaco,
    turma,
    ocupacoesEmConflito,
    recursos,
    vinculo,
    turmasDoProfessor,
  ] = await Promise.all([
    buscarEspacoParaReserva(pedido.espacoId),
    buscarTurmaParaReserva(pedido.turmaId),
    buscarCandidatosAConflito(pedido),
    listarRecursos(),
    buscarVinculoDocente({
      professorId: pedido.professorId,
      disciplinaId: pedido.disciplinaId,
      turmaId: pedido.turmaId,
      periodo,
    }),
    sessao.papel === "professor"
      ? listarTurmasDoProfessor(pedido.professorId, periodo)
      : Promise.resolve(null),
  ]);

  const nomesDosRecursos = mapaDeNomesDosRecursos(recursos);

  const agora = new Date();

  const veredito = validarReserva(pedido, {
    espaco,
    turma,
    vinculo,
    ocupacoes: ocupacoesEmConflito,
    agora,
    calendario,
    turmasDoProfessor,
  });

  if (!veredito.valida) {
    return erro(
      valores,
      descreverViolacoes(veredito.violacoes, { nomesDosRecursos }),
    );
  }

  const resultado = await gravarReserva({
    espacoId: pedido.espacoId,
    professorId: pedido.professorId,
    turmaId: pedido.turmaId,
    tipoDeAtividade: pedido.tipoDeAtividade,
    disciplinaId: pedido.disciplinaId,
    finalidade: pedido.finalidade,
    inicio: pedido.inicio,
    fim: pedido.fim,
    recursoIds: [...new Set(pedido.recursosExigidos)],
    criadaPor: sessao.profileId,
  });

  if (resultado.status === "conflito") {
    const conflitosAtuais = await buscarCandidatosAConflito(pedido);

    const revalidacao = validarReserva(pedido, {
      espaco,
      turma,
      vinculo,
      ocupacoes: conflitosAtuais,
      agora,
      calendario,
      turmasDoProfessor,
    });

    if (!revalidacao.valida) {
      return erro(
        valores,
        descreverViolacoes(revalidacao.violacoes, { nomesDosRecursos }),
      );
    }

    return erro(valores, [
      "Outra reserva foi criada ao mesmo tempo e ocupou este horário. Tente enviar novamente.",
    ]);
  }

  if (resultado.status === "erro") {
    return erro(valores, [resultado.mensagem]);
  }

  await notificarProfessor(resultado.reservaId, "nova", sessao.nome);

  revalidatePath("/reservas");

  return { status: "sucesso", reservaId: resultado.reservaId };
}
