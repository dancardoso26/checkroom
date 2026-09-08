import "server-only";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * REPOSITÓRIO DE PROFESSORES
 *
 * Existe apenas para alimentar o seletor do formulário nesta etapa. Em 28/09,
 * quando a autenticação entrar, o professor deixa de ser escolhido em uma lista
 * e passa a ser o próprio usuário da sessão: o campo some da tela e este
 * arquivo passa a servir a listagens administrativas.
 */

export type ProfessorOption = {
  id: string;
  name: string;
  email: string;
};

export async function listProfessors(): Promise<ProfessorOption[]> {
  const { data, error } = await supabaseServer
    .from("professors")
    .select("id, name, email")
    .order("name");

  if (error) {
    throw new Error(`Falha ao listar os professores: ${error.message}`);
  }

  return data;
}
