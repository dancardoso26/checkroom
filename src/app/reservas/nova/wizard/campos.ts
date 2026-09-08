import { combineDateTime } from "@/lib/datetime";
import type { ActivityType } from "@/domain/booking/types";

/**
 * O ESTADO DO FORMULÁRIO
 *
 * Um tipo só para os sete campos, compartilhado entre o orquestrador e as
 * etapas. Antes cada etapa declarava a fatia que consumia, e acrescentar um
 * campo obrigava a caçar essas declarações pelo arquivo.
 */
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

// ---------------------------------------------------------------------------
// Indicador de etapas
// ---------------------------------------------------------------------------

/**
 * O rótulo de cada tipo, em um lugar só.
 *
 * O formulário, o resumo lateral e a tela de confirmação exibem o mesmo texto, e
 * repeti-lo em três arquivos garantiria que um dia divergissem.
 */
export const ROTULO_DA_ATIVIDADE: Record<ActivityType, string> = {
  class: "Aula",
  lecture: "Palestra",
  exam: "Prova",
  defense: "Defesa",
  event: "Evento",
};

/**
 * Como o campo de texto livre se chama em cada tipo de atividade.
 *
 * "Finalidade" servia para tudo e não descrevia nada: em uma palestra o que se
 * espera ali é o título, e em uma defesa, o trabalho e o autor. O rótulo genérico
 * transferia para quem preenche a tarefa de adivinhar o que escrever.
 *
 * O exemplo acompanha pelo mesmo motivo, e corrige um defeito: o placeholder
 * anterior distinguia apenas aula das demais, então uma palestra sugeria
 * "Defesa de TCC".
 */
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
