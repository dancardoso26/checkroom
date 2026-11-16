import "server-only";

import { PERIODO_LETIVO_VIGENTE } from "@/domain/reservas/expediente";
import { codigoDoPeriodoDe } from "@/lib/repositories/repositorio-do-calendario";
import {
  listarTurmasComCurso,
  type OpcaoDeTurma,
} from "@/lib/repositories/repositorio-de-turmas";
import { listarCursos } from "@/lib/repositories/repositorio-de-cursos";
import { listarProfessores } from "@/lib/repositories/repositorio-de-professores";
import { listarRecursos } from "@/lib/repositories/repositorio-de-recursos";
import { listarEspacos } from "@/lib/repositories/repositorio-de-espacos";
import {
  listarDisciplinas,
  listarVinculosDoPeriodo,
} from "@/lib/repositories/repositorio-de-disciplinas";

import type { Catalogos } from "./formulario/painel-de-reserva";

export async function carregarCatalogos(
  hoje: string,
  {
    comCursos,
    turmasCarregando,
  }: { comCursos: boolean; turmasCarregando?: Promise<OpcaoDeTurma[]> },
): Promise<Catalogos> {
  const [
    espacos,
    professores,
    turmas,
    recursos,
    disciplinas,
    vinculos,
    cursos,
  ] = await Promise.all([
    listarEspacos(),
    listarProfessores(),
    turmasCarregando ?? listarTurmasComCurso(),
    listarRecursos(),
    listarDisciplinas(),
    codigoDoPeriodoDe(hoje).then((periodo) =>
      listarVinculosDoPeriodo(periodo ?? PERIODO_LETIVO_VIGENTE),
    ),
    comCursos ? listarCursos() : Promise.resolve([]),
  ]);

  return {
    espacos,
    professores,
    turmas,
    recursos,
    disciplinas,
    vinculos,
    cursos,
  };
}
