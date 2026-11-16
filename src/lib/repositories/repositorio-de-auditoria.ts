import "server-only";
import type { Catalogo } from "@/domain/auditoria/descricao";
import {
  criarClienteDoServidor,
  clienteAdministrativo,
} from "@/lib/supabase/servidor";

export type ItemDaAuditoria = {
  id: number;
  ocorridoEm: Date;
  nomeDoAutor: string | null;
  emailDoAutor: string | null;
  acao: string;
  entidade: string;
  entidadeId: string | null;
  estadoAnterior: unknown;
  estadoPosterior: unknown;
};

export async function listarRegistrosDaAuditoria(
  limite = 100,
): Promise<ItemDaAuditoria[]> {
  const supabase = await criarClienteDoServidor();
  const emails = await emailsDasContas();

  const { data, error } = await supabase
    .from("audit_logs")
    .select(
      "id, occurred_at, actor_id, action, entity, entity_id, before_state, after_state, profiles(full_name)",
    )
    .order("occurred_at", { ascending: false })
    .limit(limite);

  if (error) {
    throw new Error(`Falha ao carregar a auditoria: ${error.message}`);
  }

  return data.map((linha) => ({
    id: linha.id,
    ocorridoEm: new Date(linha.occurred_at),
    nomeDoAutor: linha.profiles?.full_name ?? null,
    emailDoAutor: emails.get(linha.actor_id ?? "") ?? null,
    acao: linha.action,
    entidade: linha.entity,
    entidadeId: linha.entity_id,
    estadoAnterior: linha.before_state,
    estadoPosterior: linha.after_state,
  }));
}

async function emailsDasContas(): Promise<Map<string, string>> {
  const { data, error } = await clienteAdministrativo.auth.admin.listUsers({
    perPage: 1000,
  });
  if (error) throw new Error(`Falha ao carregar as contas: ${error.message}`);

  return new Map(data.users.map((u) => [u.id, u.email ?? ""]));
}

export async function carregarCatalogoDeAuditoria(): Promise<Catalogo> {
  const supabase = await criarClienteDoServidor();

  const consultas = await Promise.all([
    supabase.from("rooms").select("id, name, building"),
    supabase.from("professors").select("id, name"),
    supabase.from("profiles").select("id, full_name"),
    supabase.from("resources").select("id, name"),
    supabase.from("subjects").select("id, name"),
    supabase.from("classes").select("id, name"),
    supabase.from("lectures").select("id, title"),
  ]);

  for (const { error } of consultas) {
    if (error)
      throw new Error(`Falha ao carregar o catálogo: ${error.message}`);
  }

  const [
    espacos,
    professores,
    perfis,
    recursos,
    disciplinas,
    turmas,
    palestras,
  ] = consultas;

  return {
    espacos: new Map((espacos.data ?? []).map((e) => [e.id, e.name])),
    professores: new Map((professores.data ?? []).map((p) => [p.id, p.name])),
    contas: new Map((perfis.data ?? []).map((p) => [p.id, p.full_name])),
    recursos: new Map((recursos.data ?? []).map((r) => [r.id, r.name])),
    disciplinas: new Map((disciplinas.data ?? []).map((d) => [d.id, d.name])),
    turmas: new Map((turmas.data ?? []).map((t) => [t.id, t.name])),
    palestras: new Map((palestras.data ?? []).map((p) => [p.id, p.title])),
  };
}
