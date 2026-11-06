import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DadosDoRecurso } from "@/domain/espacos/espaco";
import {
  classificarErro,
  type ResultadoDaExclusao,
  type ResultadoDaGravacao,
} from "./erros";

export type ResourceOption = {
  id: string;
  name: string;
};

export async function listResources(): Promise<ResourceOption[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("resources")
    .select("id, name")
    .order("name");

  if (error) {
    throw new Error(`Falha ao listar os recursos: ${error.message}`);
  }

  return data;
}

export function toResourceNameMap(
  resources: ResourceOption[]
): Record<string, string> {
  return Object.fromEntries(resources.map((r) => [r.id, r.name]));
}

export type RecursoGerenciado = {
  id: string;
  nome: string;
  espacos: number;
};

export async function listarRecursosParaGestao(): Promise<RecursoGerenciado[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("resources")
    .select("id, name, room_resources(count)")
    .order("name");

  if (error) throw new Error(`Falha ao listar os recursos: ${error.message}`);

  return data.map((r) => ({
    id: r.id,
    nome: r.name,
    espacos: r.room_resources[0]?.count ?? 0,
  }));
}

export async function salvarRecurso(
  dados: DadosDoRecurso
): Promise<ResultadoDaGravacao> {
  const supabase = await createSupabaseServerClient();
  const nome = dados.nome.trim();

  const { data, error } = dados.id
    ? await supabase
        .from("resources")
        .update({ name: nome })
        .eq("id", dados.id)
        .select("id")
    : await supabase.from("resources").insert({ name: nome }).select("id");

  if (error) return { ok: false, falha: classificarErro(error) };
  if (data.length === 0) return { ok: false, falha: "nao_encontrado" };

  return { ok: true, id: data[0].id };
}

export async function excluirRecurso(id: string): Promise<ResultadoDaExclusao> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("resources")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) return { ok: false, falha: classificarErro(error) };
  if (data.length === 0) return { ok: false, falha: "nao_encontrado" };

  return { ok: true };
}
