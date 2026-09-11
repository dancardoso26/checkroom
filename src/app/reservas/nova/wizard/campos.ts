import { combineDateTime } from "@/lib/datetime";
import type { ActivityType } from "@/domain/booking/types";

export type CamposDaReserva = {
  activityType: ActivityType;
  professorId: string;
  classId: string;
  subjectId: string;
  purpose: string;
  date: string;
  startTime: string;
  endTime: string;
  roomId: string;
};

export const CAMPOS_VAZIOS = (hoje: string): CamposDaReserva => ({
  // Aula é o caso mais comum, e começar por ele poupa um clique na maioria das
  // reservas.
  activityType: "class",
  professorId: "",
  classId: "",
  subjectId: "",
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

export const ROTULO_DA_ATIVIDADE: Record<ActivityType, string> = {
  class: "Aula",
  lecture: "Palestra",
  exam: "Prova",
  defense: "Defesa",
  event: "Evento",
};

export const CAMPO_FINALIDADE: Record<
  ActivityType,
  { rotulo: string; exemplo: string }
> = {
  class: { rotulo: "Tema da aula", exemplo: "Modelagem de dados relacional" },
  lecture: {
    rotulo: "Título da palestra",
    exemplo: "Tendências em inteligência artificial",
  },
  exam: { rotulo: "Avaliação", exemplo: "Prova bimestral" },
  defense: {
    rotulo: "Trabalho e autor",
    exemplo: "Defesa de TCC de Ana Souza",
  },
  event: {
    rotulo: "Nome do evento",
    exemplo: "Semana de Sistemas de Informação",
  },
};
