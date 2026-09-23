import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProfessorOption = {
  id: string;
  name: string;
  email: string;
};

export async function listProfessors(): Promise<ProfessorOption[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("professors")
    .select("id, name, email")
    .order("name");

  if (error) {
    throw new Error(`Falha ao listar os professores: ${error.message}`);
  }

  return data;
}
