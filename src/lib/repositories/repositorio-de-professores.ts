import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const PROFESSOR_REMOVIDO = "Professor removido";

export type ProfessorOption = {
  id: string;
  name: string;
};

export type ContatoDoProfessor = {
  name: string;
  email: string;
};

export async function findProfessorContact(
  id: string
): Promise<ContatoDoProfessor | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("professors")
    .select("name, email")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  return data;
}

export async function listProfessors(): Promise<ProfessorOption[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("professors")
    .select("id, name")
    .neq("name", PROFESSOR_REMOVIDO)
    .order("name");

  if (error) {
    throw new Error(`Falha ao listar os professores: ${error.message}`);
  }

  return data;
}
