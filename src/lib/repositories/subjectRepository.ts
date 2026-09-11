import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import type { TeachingAssignmentSnapshot } from "@/domain/booking/types";

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
