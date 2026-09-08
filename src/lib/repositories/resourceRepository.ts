import "server-only";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * REPOSITÓRIO DE RECURSOS
 *
 * O catálogo de equipamentos: projetor, lousa digital, computadores.
 */

export type ResourceOption = {
  id: string;
  name: string;
};

export async function listResources(): Promise<ResourceOption[]> {
  const { data, error } = await supabaseServer
    .from("resources")
    .select("id, name")
    .order("name");

  if (error) {
    throw new Error(`Falha ao listar os recursos: ${error.message}`);
  }

  return data;
}

/**
 * Dicionário de id para nome.
 *
 * A regra de negócio devolve ids na violação MISSING_RESOURCES, porque a
 * comparação precisa ser exata. A mensagem exibida precisa de nomes. Este mapa
 * é o que a função describeViolation recebe para fazer a ponte entre os dois.
 *
 * Object.fromEntries em vez de um laço com acumulador: a intenção, que é virar
 * uma lista de pares em um objeto, fica dita em vez de reconstruída por quem lê.
 */
export function toResourceNameMap(
  resources: ResourceOption[]
): Record<string, string> {
  return Object.fromEntries(resources.map((r) => [r.id, r.name]));
}
