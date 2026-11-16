import "server-only";
import { criarClienteDoServidor } from "@/lib/supabase/servidor";
import type { VinculoDocente } from "@/domain/reservas/tipos";

export type OpcaoDeDisciplina = {
  id: string;
  nome: string;
  cursoId: string;
};

export async function listarDisciplinas(): Promise<OpcaoDeDisciplina[]> {
  const supabase = await criarClienteDoServidor();

  const { data, error } = await supabase
    .from("subjects")
    .select("id, name, course_id")
    .order("name");

  if (error) {
    throw new Error(`Falha ao listar as disciplinas: ${error.message}`);
  }

  return data.map((s) => ({ id: s.id, nome: s.name, cursoId: s.course_id }));
}

export type OpcaoDeVinculo = {
  professorId: string;
  disciplinaId: string;
  turmaId: string;
};

export type ParDeDocencia = { professorId: string; turmaId: string };

export async function listarParesDeDocencia(): Promise<ParDeDocencia[]> {
  const supabase = await criarClienteDoServidor();

  const { data, error } = await supabase
    .from("teaching_assignments")
    .select("professor_id, class_id");

  if (error) {
    throw new Error(`Falha ao consultar os vínculos: ${error.message}`);
  }

  const vistos = new Set<string>();
  const pares: ParDeDocencia[] = [];
  for (const linha of data) {
    const chave = `${linha.professor_id}:${linha.class_id}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    pares.push({ professorId: linha.professor_id, turmaId: linha.class_id });
  }
  return pares;
}

export async function listarVinculosDoPeriodo(
  periodo: string,
): Promise<OpcaoDeVinculo[]> {
  const supabase = await criarClienteDoServidor();

  const { data, error } = await supabase
    .from("teaching_assignments")
    .select("professor_id, subject_id, class_id")
    .eq("term", periodo);

  if (error) {
    throw new Error(`Falha ao consultar as atribuições: ${error.message}`);
  }

  return data.map((linha) => ({
    professorId: linha.professor_id,
    disciplinaId: linha.subject_id,
    turmaId: linha.class_id,
  }));
}

export async function buscarVinculoDocente(parametros: {
  professorId: string;
  disciplinaId: string | null;
  turmaId: string;
  periodo: string;
}): Promise<VinculoDocente | null> {
  const supabase = await criarClienteDoServidor();

  if (parametros.disciplinaId === null) return null;

  const { data, error } = await supabase
    .from("teaching_assignments")
    .select("professor_id, subject_id, class_id, term")
    .eq("professor_id", parametros.professorId)
    .eq("subject_id", parametros.disciplinaId)
    .eq("class_id", parametros.turmaId)
    .eq("term", parametros.periodo)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Falha ao verificar o vínculo de professor: ${error.message}`,
    );
  }

  if (!data) return null;

  return {
    professorId: data.professor_id,
    disciplinaId: data.subject_id,
    turmaId: data.class_id,
    periodo: data.term,
  };
}

export async function listarTurmasDoProfessor(
  professorId: string,
  periodo: string,
): Promise<string[]> {
  const supabase = await criarClienteDoServidor();

  const { data, error } = await supabase
    .from("teaching_assignments")
    .select("class_id")
    .eq("professor_id", professorId)
    .eq("term", periodo);

  if (error) {
    throw new Error(
      `Falha ao consultar as turmas do professor: ${error.message}`,
    );
  }

  return [...new Set(data.map((linha) => linha.class_id))];
}
