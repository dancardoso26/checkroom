import "server-only";
import {
  criarClienteDoServidor,
  clienteAdministrativo,
} from "@/lib/supabase/servidor";

export const PROFESSOR_REMOVIDO = "Professor removido";

export type ProfessorParaSelecao = {
  id: string;
  nome: string;
};

export type ContatoDoProfessor = {
  nome: string;
  email: string;
};

export async function buscarContatoDoProfessor(
  id: string,
): Promise<ContatoDoProfessor | null> {
  const { data, error } = await clienteAdministrativo
    .from("professors")
    .select("name, email")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  return { nome: data.name, email: data.email };
}

export async function listarProfessores(): Promise<ProfessorParaSelecao[]> {
  const supabase = await criarClienteDoServidor();

  const { data, error } = await supabase
    .from("professors")
    .select("id, name")
    .neq("name", PROFESSOR_REMOVIDO)
    .order("name");

  if (error) {
    throw new Error(`Falha ao listar os professores: ${error.message}`);
  }

  return data.map((professor) => ({ id: professor.id, nome: professor.name }));
}
