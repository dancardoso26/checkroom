import type { CalendarioDoDia } from "@/domain/calendario/calendario";

export type TipoDeAtividade = "class" | "lecture" | "exam" | "event";

export type PedidoDeReserva = {
  espacoId: string;
  professorId: string;
  turmaId: string;

  tipoDeAtividade: TipoDeAtividade;

  disciplinaId: string | null;

  finalidade: string;
  inicio: Date;
  fim: Date;

  recursosExigidos: string[];
};

export type EspacoParaReserva = {
  id: string;
  nome: string;
  predio: string;
  capacidade: number;
  recursoIds: string[];
};

export type VinculoDocente = {
  professorId: string;
  disciplinaId: string;
  turmaId: string;
  periodo: string;
};

export type TurmaParaReserva = {
  id: string;
  nome: string;
  quantidadeDeAlunos: number;
};

export type OcupacaoExistente = {
  id: string;
  espacoId: string;
  professorId: string;
  turmaId: string;
  finalidade: string | null;
  inicio: Date;
  fim: Date;
};

export type ContextoDaReserva = {
  espaco: EspacoParaReserva | null;

  turma: TurmaParaReserva | null;

  vinculo: VinculoDocente | null;

  ocupacoes: OcupacaoExistente[];

  agora: Date;

  calendario?: CalendarioDoDia;

  turmasDoProfessor?: string[] | null;
};

export type ViolacaoDaReserva =
  | { codigo: "PERIODO_INVALIDO" }
  | { codigo: "ESPACO_NAO_ENCONTRADO" }
  | { codigo: "TURMA_NAO_ENCONTRADA" }
  | { codigo: "FINALIDADE_VAZIA" }
  | { codigo: "INICIO_NO_PASSADO" }
  | { codigo: "FORA_DO_EXPEDIENTE"; abertura: string; fechamento: string }
  | { codigo: "CONFLITO_DE_ESPACO"; conflito: OcupacaoExistente }
  | { codigo: "CONFLITO_DE_PROFESSOR"; conflito: OcupacaoExistente }
  | { codigo: "CONFLITO_DE_TURMA"; conflito: OcupacaoExistente }
  | { codigo: "SEM_VINCULO_DOCENTE"; periodo: string }
  | { codigo: "TURMA_SEM_VINCULO" }
  | { codigo: "DISCIPLINA_OBRIGATORIA" }
  | {
      codigo: "CAPACIDADE_INSUFICIENTE";
      capacidade: number;
      quantidadeDeAlunos: number;
    }
  | { codigo: "RECURSOS_FALTANTES"; recursosFaltantes: string[] }
  | { codigo: "FORA_DO_PERIODO_LETIVO" }
  | { codigo: "DATA_BLOQUEADA"; motivo: string }
  | { codigo: "ESPACO_BLOQUEADO"; motivo: string };

export type ResultadoDaValidacao =
  { valida: true } | { valida: false; violacoes: ViolacaoDaReserva[] };
