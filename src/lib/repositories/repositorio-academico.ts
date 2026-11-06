import "server-only";

import type {
  Curso,
  Disciplina,
  Professor,
  Turma,
  Vinculo,
} from "@/domain/academico/academico";
import {
  createSupabaseServerClient,
  supabaseAdmin,
} from "@/lib/supabase/server";

import { contagemDeAlunosPorTurma } from "./repositorio-de-turmas";

import {
  classificarErro,
  type ResultadoDaExclusao,
  type ResultadoDaGravacao,
} from "./erros";

export type CadastroAcademico = {
  cursos: Curso[];
  disciplinas: Disciplina[];
  turmas: Turma[];
  professores: Professor[];
  vinculos: Vinculo[];
};

export async function carregarCadastroAcademico(): Promise<CadastroAcademico> {
  const supabase = await createSupabaseServerClient();

  const [cursos, disciplinas, turmas, professores, vinculos, alunos] =
    await Promise.all([
    supabase.from("courses").select("id, name, department").order("name"),
    supabase.from("subjects").select("id, name, course_id").order("name"),
    supabase
      .from("classes")
      .select("id, name, course_id")
      .order("name"),
    supabaseAdmin.from("professors").select("id, name, email").order("name"),
    supabase
      .from("teaching_assignments")
      .select("id, professor_id, subject_id, class_id, term")
      .order("term", { ascending: false }),
    contagemDeAlunosPorTurma(),
  ]);

  for (const { error } of [cursos, disciplinas, turmas, professores, vinculos]) {
    if (error)
      throw new Error(`Falha ao carregar o cadastro acadêmico: ${error.message}`);
  }

  return {
    cursos: cursos.data!.map((c) => ({
      id: c.id,
      nome: c.name,
      departamento: c.department,
    })),
    disciplinas: disciplinas.data!.map((d) => ({
      id: d.id,
      nome: d.name,
      cursoId: d.course_id,
    })),
    turmas: turmas.data!.map((t) => ({
      id: t.id,
      nome: t.name,
      cursoId: t.course_id,
      quantidadeDeAlunos: alunos.get(t.id) ?? 0,
    })),
    professores: professores
      .data!.filter((d) => !d.email.endsWith("@checkroom.invalid"))
      .map((d) => ({ id: d.id, nome: d.name, email: d.email })),
    vinculos: vinculos.data!.map((v) => ({
      id: v.id,
      professorId: v.professor_id,
      disciplinaId: v.subject_id,
      turmaId: v.class_id,
      periodo: v.term,
    })),
  };
}

export type EntidadeAcademica =
  | "courses"
  | "subjects"
  | "classes"
  | "professors"
  | "teaching_assignments";

export async function gravarEntidade<T extends EntidadeAcademica>(
  tabela: T,
  id: string | null,
  valores: Record<string, string | number>
): Promise<ResultadoDaGravacao> {
  const supabase = await createSupabaseServerClient();

  const consulta = supabase.from(tabela as "courses");
  const { data, error } = id
    ? await consulta
        .update(valores as never)
        .eq("id", id)
        .select("id")
    : await consulta.insert(valores as never).select("id");

  if (error) {
    console.error(`Falha ao gravar em ${tabela}:`, error);
    return { ok: false, falha: classificarErro(error) };
  }
  if (data.length === 0) return { ok: false, falha: "nao_encontrado" };

  return { ok: true, id: data[0].id };
}

export async function excluirEntidade(
  tabela: EntidadeAcademica,
  id: string
): Promise<ResultadoDaExclusao> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from(tabela as "courses")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) return { ok: false, falha: classificarErro(error) };
  if (data.length === 0) return { ok: false, falha: "nao_encontrado" };

  return { ok: true };
}
