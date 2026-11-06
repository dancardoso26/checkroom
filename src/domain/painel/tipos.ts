import type { Prioridade, SituacaoDoChamado } from "@/domain/chamados/chamado";

export type OcupacaoBruta = { espacoId: string; inicio: Date; fim: Date };

export type TipoDeAtividade = "class" | "lecture" | "exam" | "event";

export type ReservaDoPainel = OcupacaoBruta & {
  cancelada: boolean;
  professorId: string;
  turmaId: string;
  tipo: TipoDeAtividade;
};

export type ChamadoDoPainel = {
  situacao: SituacaoDoChamado;
  prioridade: Prioridade;
  espacoId: string;
  criadoEm: Date;
  iniciadoEm: Date | null;
  resolvidoEm: Date | null;
};

export type InscricaoDoPainel = { feitaEm: Date; cursoId: string | null };

export type PalestraDoPainel = OcupacaoBruta & {
  id: string;
  titulo: string;
  vagas: number;
  inscritos: number;
};
