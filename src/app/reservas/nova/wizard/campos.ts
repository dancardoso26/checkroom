import { combineDateTime } from "@/lib/datetime";

/**
 * O ESTADO DO FORMULÁRIO
 *
 * Um tipo só para os sete campos, compartilhado entre o orquestrador e as
 * etapas. Antes cada etapa declarava a fatia que consumia, e acrescentar um
 * campo obrigava a caçar essas declarações pelo arquivo.
 */
export type CamposDaReserva = {
  professorId: string;
  classId: string;
  purpose: string;
  date: string;
  startTime: string;
  endTime: string;
  roomId: string;
};

export const CAMPOS_VAZIOS = (hoje: string): CamposDaReserva => ({
  professorId: "",
  classId: "",
  purpose: "",
  date: hoje,
  startTime: "",
  endTime: "",
  roomId: "",
});

export function ehPeriodoValido(campos: { date: string; startTime: string; endTime: string }) {
  if (!campos.date || !campos.startTime || !campos.endTime) return false;
  return (
    combineDateTime(campos.date, campos.endTime) >
    combineDateTime(campos.date, campos.startTime)
  );
}

// ---------------------------------------------------------------------------
// Indicador de etapas
// ---------------------------------------------------------------------------
