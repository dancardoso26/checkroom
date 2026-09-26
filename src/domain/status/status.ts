// O padrão de cores do projeto: verde para o que está em ordem ou terminou bem,
// azul para o que ainda vai acontecer, vermelho para o que foi interrompido.
export type Tom = "sucesso" | "informacao" | "perigo";

export type Status =
  "agendada" | "concluida" | "cancelada" | "ativo" | "inativo" | "convidado";

export const STATUS: Record<Status, { rotulo: string; tom: Tom }> = {
  agendada: { rotulo: "Agendada", tom: "informacao" },
  concluida: { rotulo: "Concluída", tom: "sucesso" },
  cancelada: { rotulo: "Cancelada", tom: "perigo" },
  ativo: { rotulo: "Ativo", tom: "sucesso" },
  inativo: { rotulo: "Inativo", tom: "perigo" },
  convidado: { rotulo: "Convite pendente", tom: "informacao" },
};

// Concluída não é gravada no banco: é a reserva ativa cujo horário já passou.
export function statusDaReserva(
  reserva: { cancelled: boolean; endsAt: Date },
  agora: Date
): Status {
  if (reserva.cancelled) return "cancelada";
  return reserva.endsAt <= agora ? "concluida" : "agendada";
}
