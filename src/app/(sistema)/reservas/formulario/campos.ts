import { combinarDataEHora } from "@/lib/datas";
import type { TipoDeAtividade } from "@/domain/reservas/tipos";

export type CamposDaReserva = {
  tipoDeAtividade: TipoDeAtividade;
  professorId: string;
  turmaId: string;
  disciplinaId: string;
  finalidade: string;
  data: string;
  horaDeInicio: string;
  horaDeTermino: string;
  espacoId: string;
};

export const CAMPOS_VAZIOS = (hoje: string): CamposDaReserva => ({
  tipoDeAtividade: "class",
  professorId: "",
  turmaId: "",
  disciplinaId: "",
  finalidade: "",
  data: hoje,
  horaDeInicio: "",
  horaDeTermino: "",
  espacoId: "",
});

export function ehPeriodoValido(campos: {
  data: string;
  horaDeInicio: string;
  horaDeTermino: string;
}) {
  if (!campos.data || !campos.horaDeInicio || !campos.horaDeTermino)
    return false;
  return (
    combinarDataEHora(campos.data, campos.horaDeTermino) >
    combinarDataEHora(campos.data, campos.horaDeInicio)
  );
}

export const ROTULO_DA_ATIVIDADE: Record<TipoDeAtividade, string> = {
  class: "Aula",
  lecture: "Palestra",
  exam: "Prova",
  event: "Evento",
};
