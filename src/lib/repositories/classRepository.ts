import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import type { ClassSnapshot } from "@/domain/booking/types";

export async function findClassSnapshot(
  classId: string
): Promise<ClassSnapshot | null> {
  const { data, error } = await supabaseServer
    .from("classes")
    .select("id, name, student_count")
    .eq("id", classId)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao carregar a turma ${classId}: ${error.message}`);
  }

  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    studentCount: data.student_count,
  };
}

/** Uma turma como aparece no seletor do formulário. */
export type ClassOption = {
  id: string;
  name: string;
  studentCount: number;
  courseId: string;
  courseName: string;
};

export async function listClasses(): Promise<ClassOption[]> {
  const { data, error } = await supabaseServer
    .from("classes")
    .select("id, name, student_count, course_id, courses(name)")
    .order("name");

  if (error) {
    throw new Error(`Falha ao listar as turmas: ${error.message}`);
  }

  return data.map((turma) => ({
    id: turma.id,
    name: turma.name,
    studentCount: turma.student_count,
    courseId: turma.course_id,
    courseName: turma.courses.name,
  }));
}
