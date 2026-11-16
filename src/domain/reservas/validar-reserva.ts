import { chaveDoDiaLocal, minutosDoDiaLocal } from "@/lib/datas";
import {
  ABERTURA,
  ABERTURA_EM_MINUTOS,
  FECHAMENTO,
  FECHAMENTO_EM_MINUTOS,
  PERIODO_LETIVO_VIGENTE,
} from "./expediente";
import type {
  ContextoDaReserva,
  PedidoDeReserva,
  ResultadoDaValidacao,
  ViolacaoDaReserva,
  OcupacaoExistente,
} from "./tipos";

export function seSobrepoem(
  a: { inicio: Date; fim: Date },
  b: { inicio: Date; fim: Date },
): boolean {
  return a.inicio < b.fim && a.fim > b.inicio;
}

export function dentroDoExpediente(pedido: {
  inicio: Date;
  fim: Date;
}): boolean {
  if (chaveDoDiaLocal(pedido.inicio) !== chaveDoDiaLocal(pedido.fim)) {
    return false;
  }

  const inicio = minutosDoDiaLocal(pedido.inicio);
  const fim = minutosDoDiaLocal(pedido.fim);

  return inicio >= ABERTURA_EM_MINUTOS && fim <= FECHAMENTO_EM_MINUTOS;
}

export function validarReserva(
  pedido: PedidoDeReserva,
  contexto: ContextoDaReserva,
): ResultadoDaValidacao {
  const violacoes: ViolacaoDaReserva[] = [];

  const periodoValido = pedido.fim > pedido.inicio;

  if (!periodoValido) {
    violacoes.push({ codigo: "PERIODO_INVALIDO" });
  }

  if (pedido.finalidade.trim().length === 0) {
    violacoes.push({ codigo: "FINALIDADE_VAZIA" });
  }

  if (contexto.espaco === null) {
    violacoes.push({ codigo: "ESPACO_NAO_ENCONTRADO" });
  }

  if (contexto.turma === null) {
    violacoes.push({ codigo: "TURMA_NAO_ENCONTRADA" });
  }

  if (pedido.inicio < contexto.agora) {
    violacoes.push({ codigo: "INICIO_NO_PASSADO" });
  }

  if (periodoValido && !dentroDoExpediente(pedido)) {
    violacoes.push({
      codigo: "FORA_DO_EXPEDIENTE",
      abertura: ABERTURA,
      fechamento: FECHAMENTO,
    });
  }

  const calendario = contexto.calendario;

  if (calendario) {
    if (calendario.periodo === null) {
      violacoes.push({ codigo: "FORA_DO_PERIODO_LETIVO" });
    }

    for (const bloqueio of calendario.bloqueios) {
      if (bloqueio.espacoId === null) {
        violacoes.push({ codigo: "DATA_BLOQUEADA", motivo: bloqueio.motivo });
      }
    }
  }

  if (!periodoValido || contexto.espaco === null || contexto.turma === null) {
    return { valida: false, violacoes };
  }

  const espaco = contexto.espaco;
  const turma = contexto.turma;

  let conflitoDeEspaco: OcupacaoExistente | undefined;
  let conflitoDeProfessor: OcupacaoExistente | undefined;
  let conflitoDeTurma: OcupacaoExistente | undefined;

  for (const ocupacao of contexto.ocupacoes) {
    if (!seSobrepoem(pedido, ocupacao)) continue;

    if (!conflitoDeEspaco && ocupacao.espacoId === pedido.espacoId) {
      conflitoDeEspaco = ocupacao;
    }

    if (!conflitoDeProfessor && ocupacao.professorId === pedido.professorId) {
      conflitoDeProfessor = ocupacao;
    }

    if (!conflitoDeTurma && ocupacao.turmaId === pedido.turmaId) {
      conflitoDeTurma = ocupacao;
    }
  }

  if (conflitoDeEspaco) {
    violacoes.push({
      codigo: "CONFLITO_DE_ESPACO",
      conflito: conflitoDeEspaco,
    });
  }

  const bloqueioDoEspaco = calendario?.bloqueios.find(
    (bloqueio) => bloqueio.espacoId === pedido.espacoId,
  );

  if (bloqueioDoEspaco) {
    violacoes.push({
      codigo: "ESPACO_BLOQUEADO",
      motivo: bloqueioDoEspaco.motivo,
    });
  }

  if (conflitoDeProfessor) {
    violacoes.push({
      codigo: "CONFLITO_DE_PROFESSOR",
      conflito: conflitoDeProfessor,
    });
  }

  if (conflitoDeTurma) {
    violacoes.push({ codigo: "CONFLITO_DE_TURMA", conflito: conflitoDeTurma });
  }

  if (
    pedido.tipoDeAtividade !== "class" &&
    contexto.turmasDoProfessor &&
    !contexto.turmasDoProfessor.includes(pedido.turmaId)
  ) {
    violacoes.push({ codigo: "TURMA_SEM_VINCULO" });
  }

  if (pedido.tipoDeAtividade === "class") {
    if (pedido.disciplinaId === null) {
      violacoes.push({ codigo: "DISCIPLINA_OBRIGATORIA" });
    } else if (contexto.vinculo === null) {
      violacoes.push({
        codigo: "SEM_VINCULO_DOCENTE",
        periodo: calendario?.periodo?.codigo ?? PERIODO_LETIVO_VIGENTE,
      });
    }
  }

  if (turma.quantidadeDeAlunos > espaco.capacidade) {
    violacoes.push({
      codigo: "CAPACIDADE_INSUFICIENTE",
      capacidade: espaco.capacidade,
      quantidadeDeAlunos: turma.quantidadeDeAlunos,
    });
  }

  const oferecidos = new Set(espaco.recursoIds);

  const recursosFaltantes = [...new Set(pedido.recursosExigidos)].filter(
    (recursoId) => !oferecidos.has(recursoId),
  );

  if (recursosFaltantes.length > 0) {
    violacoes.push({ codigo: "RECURSOS_FALTANTES", recursosFaltantes });
  }

  if (violacoes.length > 0) {
    return { valida: false, violacoes };
  }

  return { valida: true };
}
