import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import type { TeachingAssignmentSnapshot } from "@/domain/booking/types";

/**
 * Disciplinas e o vínculo docente.
 *
 * O vínculo é o que responde se a professora leciona aquela disciplina para
 * aquela turma no período, e é a consulta que torna o modelo exclusivo de
 * educação.
 */

export type SubjectOption = {
  id: string;
  name: string;
  courseId: string;
};

export async function listSubjects(): Promise<SubjectOption[]> {
  const { data, error } = await supabaseServer
    .from("subjects")
    .select("id, name, course_id")
    .order("name");

  if (error) {
    throw new Error(`Falha ao listar as disciplinas: ${error.message}`);
  }

  return data.map((s) => ({ id: s.id, name: s.name, courseId: s.course_id }));
}

/**
 * As disciplinas que um professor leciona para uma turma no período.
 *
 * Alimenta o formulário: em vez de oferecer o catálogo inteiro e recusar depois,
 * a tela mostra apenas as disciplinas que aquela combinação permite.
 */
export async function listSubjectsTaughtBy(params: {
  professorId: string;
  classId: string;
  term: string;
}): Promise<string[]> {
  const { data, error } = await supabaseServer
    .from("teaching_assignments")
    .select("subject_id")
    .eq("professor_id", params.professorId)
    .eq("class_id", params.classId)
    .eq("term", params.term);

  if (error) {
    throw new Error(`Falha ao consultar as atribuições: ${error.message}`);
  }

  return data.map((linha) => linha.subject_id);
}

/**
 * O vínculo específico, ou nulo quando não existe.
 *
 * Devolve nulo também quando o pedido não informa disciplina: sem disciplina não
 * há vínculo a procurar, e a regra distingue os dois casos pelo subjectId.
 */
export async function findTeachingAssignment(params: {
  professorId: string;
  subjectId: string | null;
  classId: string;
  term: string;
}): Promise<TeachingAssignmentSnapshot | null> {
  if (params.subjectId === null) return null;

  const { data, error } = await supabaseServer
    .from("teaching_assignments")
    .select("professor_id, subject_id, class_id, term")
    .eq("professor_id", params.professorId)
    .eq("subject_id", params.subjectId)
    .eq("class_id", params.classId)
    .eq("term", params.term)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao verificar o vínculo docente: ${error.message}`);
  }

  if (!data) return null;

  return {
    professorId: data.professor_id,
    subjectId: data.subject_id,
    classId: data.class_id,
    term: data.term,
  };
}
