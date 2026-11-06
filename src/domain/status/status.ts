export type Tom = "sucesso" | "informacao" | "perigo" | "atencao" | "neutro";

export type Status =
  | "agendada"
  | "concluida"
  | "cancelada"
  | "ativo"
  | "inativo"
  | "convidado"
  | "aberto"
  | "em_atendimento"
  | "resolvido"
  | "chamado_cancelado"
  | "prioridade_alta"
  | "prioridade_media"
  | "prioridade_baixa"
  | "inscrito"
  | "vagas_abertas"
  | "lotada"
  | "encerrada";

export const STATUS: Record<Status, { rotulo: string; tom: Tom }> = {
  agendada: { rotulo: "Agendada", tom: "informacao" },
  concluida: { rotulo: "Concluída", tom: "sucesso" },
  cancelada: { rotulo: "Cancelada", tom: "perigo" },
  ativo: { rotulo: "Ativo", tom: "sucesso" },
  inativo: { rotulo: "Inativo", tom: "perigo" },
  convidado: { rotulo: "Convite pendente", tom: "informacao" },
  aberto: { rotulo: "Aberto", tom: "informacao" },
  em_atendimento: { rotulo: "Em atendimento", tom: "atencao" },
  resolvido: { rotulo: "Resolvido", tom: "sucesso" },
  chamado_cancelado: { rotulo: "Cancelado", tom: "neutro" },
  prioridade_alta: { rotulo: "Alta", tom: "perigo" },
  prioridade_media: { rotulo: "Média", tom: "atencao" },
  prioridade_baixa: { rotulo: "Baixa", tom: "neutro" },
  inscrito: { rotulo: "Inscrito", tom: "sucesso" },
  vagas_abertas: { rotulo: "Inscrições abertas", tom: "informacao" },
  lotada: { rotulo: "Lotada", tom: "perigo" },
  encerrada: { rotulo: "Encerrada", tom: "neutro" },
};

export function statusDaReserva(
  reserva: { cancelled: boolean; endsAt: Date },
  agora: Date
): Status {
  if (reserva.cancelled) return "cancelada";
  return reserva.endsAt <= agora ? "concluida" : "agendada";
}
