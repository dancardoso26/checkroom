import { ABERTURA, FECHAMENTO } from "@/domain/booking/businessHours";
import { dentroDoExpediente, overlaps } from "@/domain/booking/validateBooking";
import type { ErrosPorCampo } from "@/domain/formulario/validacao";

export type DadosDaPalestra = {
  titulo: string;
  palestrante: string;
  espacoId: string;
  inicio: Date;
  fim: Date;
  vagas: number;
  cursoIds: string[];
};

export type Ocupacao = { inicio: Date; fim: Date; descricao: string };

export type ContextoDaPalestra = {
  capacidadeDoEspaco: number | null;
  ocupacoes: Ocupacao[];
  agora: Date;
  bloqueios?: { espacoId: string | null; motivo: string }[];
};

export function validarPalestra(
  dados: DadosDaPalestra,
  contexto: ContextoDaPalestra
): ErrosPorCampo {
  const erros: ErrosPorCampo = {};

  if (dados.titulo.trim() === "") erros.titulo = ["Informe o tema da palestra."];
  if (dados.palestrante.trim() === "") {
    erros.palestrante = ["Informe o nome do palestrante."];
  }

  if (dados.cursoIds.length === 0) {
    erros.cursoIds = ["Selecione ao menos um curso de destino."];
  }

  const periodoValido = dados.fim > dados.inicio;

  if (!periodoValido) {
    erros.fim = ["O término deve ser depois do início."];
  } else if (!dentroDoExpediente({ startsAt: dados.inicio, endsAt: dados.fim })) {
    erros.inicio = [
      `A palestra deve acontecer num mesmo dia, entre ${ABERTURA} e ${FECHAMENTO}.`,
    ];
  }

  if (dados.inicio < contexto.agora) {
    erros.inicio = ["A palestra deve começar no futuro."];
  }

  if (contexto.capacidadeDoEspaco === null) {
    erros.espacoId = ["Selecione o espaço."];
  } else if (!Number.isInteger(dados.vagas) || dados.vagas <= 0) {
    erros.vagas = ["Informe um número inteiro de vagas maior que zero."];
  } else if (dados.vagas > contexto.capacidadeDoEspaco) {
    erros.vagas = [
      `O espaço comporta ${contexto.capacidadeDoEspaco} pessoas; as vagas não podem passar disso.`,
    ];
  }

  if (periodoValido && contexto.capacidadeDoEspaco !== null) {
    const conflito = contexto.ocupacoes.find((o) =>
      overlaps(
        { startsAt: dados.inicio, endsAt: dados.fim },
        { startsAt: o.inicio, endsAt: o.fim }
      )
    );

    if (conflito) {
      erros.espacoId = [
        `O espaço já está ocupado neste horário por "${conflito.descricao}".`,
      ];
    }
  }

  const bloqueio = contexto.bloqueios?.find(
    (b) => b.espacoId === null || b.espacoId === dados.espacoId
  );

  if (bloqueio) {
    const mensagem =
      bloqueio.espacoId === null
        ? `A instituição não funciona nesta data: ${bloqueio.motivo}.`
        : `O espaço está bloqueado nesta data: ${bloqueio.motivo}.`;
    erros[bloqueio.espacoId === null ? "data" : "espacoId"] = [mensagem];
  }

  return erros;
}

export type RecusaDaInscricao =
  | "NAO_E_ALUNO"
  | "CURSO_NAO_ATENDIDO"
  | "JA_INSCRITO"
  | "CONFLITO_DE_HORARIO"
  | "SEM_VAGAS"
  | "JA_INICIADA";

export type PalestraParaInscricao = {
  inicio: Date;
  vagas: number;
  inscritos: number;
  cursoIds: string[];
};

export function validarInscricao(
  palestra: PalestraParaInscricao,
  aluno: { cursoId: string | null; jaInscrito: boolean },
  agora: Date
): RecusaDaInscricao | null {
  if (aluno.cursoId === null || !palestra.cursoIds.includes(aluno.cursoId)) {
    return "CURSO_NAO_ATENDIDO";
  }
  if (palestra.inicio <= agora) return "JA_INICIADA";
  if (aluno.jaInscrito) return "JA_INSCRITO";
  if (palestra.inscritos >= palestra.vagas) return "SEM_VAGAS";

  return null;
}

export const MENSAGEM_DA_INSCRICAO: Record<RecusaDaInscricao, string> = {
  NAO_E_ALUNO: "Apenas alunos se inscrevem em palestras.",
  CURSO_NAO_ATENDIDO: "Esta palestra não é dirigida ao seu curso.",
  JA_INSCRITO: "Você já está inscrito nesta palestra.",
  CONFLITO_DE_HORARIO:
    "Você já está inscrito em outra palestra neste horário. Cancele a outra inscrição para se inscrever nesta.",
  SEM_VAGAS: "Não há mais vagas nesta palestra.",
  JA_INICIADA: "A palestra já começou; as inscrições estão encerradas.",
};

export function recusaDaInscricaoNoBanco(
  codigo: string
): RecusaDaInscricao | "ERRO" | null {
  switch (codigo) {
    case "enrolled":
      return null;
    case "not_student":
      return "NAO_E_ALUNO";
    case "course_not_allowed":
      return "CURSO_NAO_ATENDIDO";
    case "already_enrolled":
      return "JA_INSCRITO";
    case "time_conflict":
      return "CONFLITO_DE_HORARIO";
    case "full":
      return "SEM_VAGAS";
    case "started":
      return "JA_INICIADA";
    default:
      return "ERRO";
  }
}

export type SituacaoParaOAluno =
  | "inscrito"
  | "disponivel"
  | "lotada"
  | "encerrada"
  | "fora_do_curso";

export function situacaoParaOAluno(
  palestra: PalestraParaInscricao,
  aluno: { cursoId: string | null; jaInscrito: boolean },
  agora: Date
): SituacaoParaOAluno {
  if (aluno.jaInscrito) return "inscrito";

  switch (validarInscricao(palestra, aluno, agora)) {
    case null:
      return "disponivel";
    case "SEM_VAGAS":
      return "lotada";
    case "JA_INICIADA":
      return "encerrada";
    default:
      return "fora_do_curso";
  }
}

export function vagasRestantes(palestra: { vagas: number; inscritos: number }): number {
  return Math.max(0, palestra.vagas - palestra.inscritos);
}
