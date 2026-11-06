import type { Periodo } from "./periodo";
import type { ChamadoDoPainel, ReservaDoPainel } from "./tipos";

export const h = (dia: string, hora: string) => new Date(`2026-10-${dia}T${hora}:00-03:00`);

export const SEMANA: Periodo = { inicio: h("12", "00:00"), fim: h("19", "00:00") };

export const chamado = (parcial: Partial<ChamadoDoPainel> = {}): ChamadoDoPainel => ({
  situacao: "open",
  prioridade: "low",
  espacoId: "a",
  criadoEm: h("12", "10:00"),
  iniciadoEm: null,
  resolvidoEm: null,
  ...parcial,
});

export const reserva = (parcial: Partial<ReservaDoPainel> = {}): ReservaDoPainel => ({
  espacoId: "a",
  inicio: h("12", "19:00"),
  fim: h("12", "20:00"),
  cancelada: false,
  professorId: "p1",
  turmaId: "t1",
  tipo: "class",
  ...parcial,
});
