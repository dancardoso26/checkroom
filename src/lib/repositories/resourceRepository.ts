import "server-only";
import { supabaseServer } from "@/lib/supabase/server";

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

export function toResourceNameMap(
  resources: ResourceOption[]
): Record<string, string> {
  return Object.fromEntries(resources.map((r) => [r.id, r.name]));
}
