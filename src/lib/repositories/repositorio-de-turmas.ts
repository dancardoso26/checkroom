import "server-only";
import {
  createSupabaseServerClient,
  supabaseAdmin,
} from "@/lib/supabase/server";
import type { ClassSnapshot } from "@/domain/booking/types";

export async function findClassSnapshot(
  classId: string,
): Promise<ClassSnapshot | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("classes")
    .select("id, name")
    .eq("id", classId)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao carregar a turma ${classId}: ${error.message}`);
  }

  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    studentCount: (await contagemDeAlunosPorTurma()).get(data.id) ?? 0,
  };
}

export type ClassOption = {
  id: string;
  name: string;
  studentCount: number;
  courseId: string;
  courseName: string;
};

export type TurmaOpcao = {
  id: string;
  nome: string;
  detalhe: string;
  cursoId: string;
};

export async function listarTurmas(): Promise<TurmaOpcao[]> {
  const turmas = await listClasses();

  return turmas.map((turma) => ({
    id: turma.id,
    nome: turma.name,
    detalhe: turma.courseName,
    cursoId: turma.courseId,
  }));
}

export async function listClasses(): Promise<ClassOption[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("classes")
    .select("id, name, course_id, courses(name)")
    .order("name");

  if (error) {
    throw new Error(`Falha ao listar as turmas: ${error.message}`);
  }

  const alunos = await contagemDeAlunosPorTurma();

  return data.map((turma) => ({
    id: turma.id,
    name: turma.name,
    studentCount: alunos.get(turma.id) ?? 0,
    courseId: turma.course_id,
    courseName: turma.courses.name,
  }));
}

export async function contagemDeAlunosPorTurma(): Promise<Map<string, number>> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("class_id")
    .eq("role", "student")
    .is("anonymized_at", null)
    .not("class_id", "is", null);

  if (error) {
    throw new Error(`Falha ao contar os alunos das turmas: ${error.message}`);
  }

  const contagem = new Map<string, number>();
  for (const { class_id } of data) {
    if (class_id) contagem.set(class_id, (contagem.get(class_id) ?? 0) + 1);
  }
  return contagem;
}
