import "server-only";

import { PERIODO_LETIVO_VIGENTE } from "@/domain/booking/businessHours";
import { codigoDoPeriodoDe } from "@/lib/repositories/repositorio-do-calendario";
import {
  listClasses,
  type ClassOption,
} from "@/lib/repositories/repositorio-de-turmas";
import { listarCursos } from "@/lib/repositories/repositorio-de-cursos";
import { listProfessors } from "@/lib/repositories/repositorio-de-professores";
import { listResources } from "@/lib/repositories/repositorio-de-recursos";
import { listRooms } from "@/lib/repositories/repositorio-de-espacos";
import {
  listSubjects,
  listTeachingAssignments,
} from "@/lib/repositories/repositorio-de-disciplinas";

import type { Catalogos } from "./formulario/painel-de-reserva";

export async function carregarCatalogos(
  hoje: string,
  {
    comCursos,
    turmas,
  }: { comCursos: boolean; turmas?: Promise<ClassOption[]> }
): Promise<Catalogos> {
  const [rooms, professors, classes, resources, subjects, assignments, cursos] =
    await Promise.all([
      listRooms(),
      listProfessors(),
      turmas ?? listClasses(),
      listResources(),
      listSubjects(),
      codigoDoPeriodoDe(hoje).then((periodo) =>
        listTeachingAssignments(periodo ?? PERIODO_LETIVO_VIGENTE)
      ),
      comCursos ? listarCursos() : Promise.resolve([]),
    ]);

  return {
    rooms,
    professors,
    classes,
    resources,
    subjects,
    assignments,
    cursos,
  };
}
