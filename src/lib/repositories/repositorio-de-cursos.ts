import "server-only";
import { criarClienteDoServidor } from "@/lib/supabase/servidor";

export type CursoOpcao = { id: string; nome: string; departamento: string };

export async function listarCursos(): Promise<CursoOpcao[]> {
  const supabase = await criarClienteDoServidor();

  const { data, error } = await supabase
    .from("courses")
    .select("id, name, department")
    .order("name");

  if (error) throw new Error(`Falha ao listar os cursos: ${error.message}`);

  return data.map((c) => ({
    id: c.id,
    nome: c.name,
    departamento: c.department,
  }));
}
