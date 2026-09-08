import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import type { ClassSnapshot } from "@/domain/booking/types";

/**
 * REPOSITÓRIO DE TURMAS
 *
 * Mesmo papel do roomRepository: traduzir linhas do banco para o vocabulário do
 * domínio. O raciocínio completo sobre por que essa camada existe está
 * comentado em roomRepository.ts.
 */

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
    // A tradução de snake_case para camelCase acontece aqui e não vaza para o
    // domínio. É pequena, mas é o tipo de detalhe que, deixado passar, faz o
    // formato do banco aparecer em componentes de tela.
    studentCount: data.student_count,
  };
}

/** Uma turma como aparece no seletor do formulário. */
export type ClassOption = {
  id: string;
  name: string;
  studentCount: number;
  courseName: string;
};

/**
 * Lista as turmas para o formulário.
 *
 * O nome do curso vem junto porque "8º semestre A" existe em vários cursos, e
 * sozinho não identifica a turma para quem está escolhendo.
 */
export async function listClasses(): Promise<ClassOption[]> {
  const { data, error } = await supabaseServer
    .from("classes")
    .select("id, name, student_count, courses(name)")
    .order("name");

  if (error) {
    throw new Error(`Falha ao listar as turmas: ${error.message}`);
  }

  return data.map((turma) => ({
    id: turma.id,
    name: turma.name,
    studentCount: turma.student_count,
    // courses vem como objeto porque course_id é uma chave estrangeira
    // obrigatória: cada turma tem exatamente um curso. Fosse a relação inversa,
    // o PostgREST devolveria um array.
    courseName: turma.courses.name,
  }));
}
