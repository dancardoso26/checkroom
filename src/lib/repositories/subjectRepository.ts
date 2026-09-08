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

/** Um vínculo, no formato que o formulário usa para filtrar as disciplinas. */
export type TeachingAssignmentOption = {
  professorId: string;
  subjectId: string;
  classId: string;
};

/**
 * Todos os vínculos do período letivo.
 *
 * A lista inteira vai para o formulário em vez de uma consulta a cada troca de
 * professor ou turma. São poucos registros, e o filtro no cliente responde no
 * mesmo instante em que a pessoa escolhe, sem ida ao servidor.
 *
 * É o que permite mostrar apenas as disciplinas possíveis: em vez de oferecer o
 * catálogo inteiro e recusar depois, a combinação errada deixa de existir.
 */
export async function listTeachingAssignments(
  term: string
): Promise<TeachingAssignmentOption[]> {
  const { data, error } = await supabaseServer
    .from("teaching_assignments")
    .select("professor_id, subject_id, class_id")
    .eq("term", term);

  if (error) {
    throw new Error(`Falha ao consultar as atribuições: ${error.message}`);
  }

  return data.map((linha) => ({
    professorId: linha.professor_id,
    subjectId: linha.subject_id,
    classId: linha.class_id,
  }));
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
