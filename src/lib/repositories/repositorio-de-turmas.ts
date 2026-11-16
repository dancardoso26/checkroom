import "server-only";
import {
  criarClienteDoServidor,
  clienteAdministrativo,
} from "@/lib/supabase/servidor";
import type { TurmaParaReserva } from "@/domain/reservas/tipos";

export async function buscarTurmaParaReserva(
  turmaId: string,
): Promise<TurmaParaReserva | null> {
  const supabase = await criarClienteDoServidor();

  const { data, error } = await supabase
    .from("classes")
    .select("id, name")
    .eq("id", turmaId)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao carregar a turma ${turmaId}: ${error.message}`);
  }

  if (!data) return null;

  return {
    id: data.id,
    nome: data.name,
    quantidadeDeAlunos: (await contagemDeAlunosPorTurma()).get(data.id) ?? 0,
  };
}

export type OpcaoDeTurma = {
  id: string;
  nome: string;
  quantidadeDeAlunos: number;
  cursoId: string;
  nomeDoCurso: string;
};

export type TurmaOpcao = {
  id: string;
  nome: string;
  detalhe: string;
  cursoId: string;
};

export async function listarTurmas(): Promise<TurmaOpcao[]> {
  const turmas = await listarTurmasComCurso();

  return turmas.map((turma) => ({
    id: turma.id,
    nome: turma.nome,
    detalhe: turma.nomeDoCurso,
    cursoId: turma.cursoId,
  }));
}

export async function listarTurmasComCurso(): Promise<OpcaoDeTurma[]> {
  const supabase = await criarClienteDoServidor();

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
    nome: turma.name,
    quantidadeDeAlunos: alunos.get(turma.id) ?? 0,
    cursoId: turma.course_id,
    nomeDoCurso: turma.courses.name,
  }));
}

export async function contagemDeAlunosPorTurma(): Promise<Map<string, number>> {
  const { data, error } = await clienteAdministrativo
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
