import "server-only";

import type {
  AcaoDoChamado,
  ChamadoParaTransicao,
  DadosDaAbertura,
  Prioridade,
  SituacaoDoChamado,
} from "@/domain/chamados/chamado";
import {
  createSupabaseServerClient,
  supabaseAdmin,
} from "@/lib/supabase/server";

import { classificarErro, type ResultadoDaGravacao } from "./erros";

export type ChamadoItem = {
  id: string;
  espaco: string;
  espacoId: string;
  descricao: string;
  prioridade: Prioridade;
  situacao: SituacaoDoChamado;
  solicitanteId: string;
  solicitanteNome: string;
  responsavelId: string | null;
  responsavelNome: string | null;
  nota: string | null;
  abertoEm: Date;
  iniciadoEm: Date | null;
  resolvidoEm: Date | null;
  canceladoEm: Date | null;
};

async function nomesDosPerfis(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name")
    .in("id", [...new Set(ids)]);

  if (error) throw new Error(`Falha ao carregar os nomes: ${error.message}`);

  return new Map(data.map((p) => [p.id, p.full_name]));
}

export async function listarChamados(): Promise<ChamadoItem[]> {
  const supabase = await createSupabaseServerClient();

  const consulta = supabase
    .from("tickets")
    .select(
      `id, room_id, description, priority, status, requested_by, assigned_to,
       resolution_note, created_at, started_at, resolved_at, cancelled_at,
       rooms(name, building)`,
    )
    .order("created_at", { ascending: false });

  const { data, error } = await consulta;

  if (error) throw new Error(`Falha ao listar os chamados: ${error.message}`);

  const nomes = await nomesDosPerfis(
    data.flatMap((c) =>
      c.assigned_to ? [c.requested_by, c.assigned_to] : [c.requested_by],
    ),
  );

  return data.map((c) => ({
    id: c.id,
    espaco: c.rooms.name,
    espacoId: c.room_id,
    descricao: c.description,
    prioridade: c.priority,
    situacao: c.status,
    solicitanteId: c.requested_by,
    solicitanteNome: nomes.get(c.requested_by) ?? "Usuário removido",
    responsavelId: c.assigned_to,
    responsavelNome: c.assigned_to ? (nomes.get(c.assigned_to) ?? null) : null,
    nota: c.resolution_note,
    abertoEm: new Date(c.created_at),
    iniciadoEm: c.started_at ? new Date(c.started_at) : null,
    resolvidoEm: c.resolved_at ? new Date(c.resolved_at) : null,
    canceladoEm: c.cancelled_at ? new Date(c.cancelled_at) : null,
  }));
}

export async function buscarChamadoParaTransicao(
  id: string,
): Promise<ChamadoParaTransicao | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("tickets")
    .select("status, requested_by, assigned_to")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Falha ao carregar o chamado: ${error.message}`);
  if (!data) return null;

  return {
    situacao: data.status,
    solicitanteId: data.requested_by,
    responsavelId: data.assigned_to,
  };
}

export async function abrirChamado(
  dados: DadosDaAbertura,
  solicitanteId: string,
): Promise<ResultadoDaGravacao> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("tickets")
    .insert({
      room_id: dados.espacoId,
      description: dados.descricao.trim(),
      priority: dados.prioridade,
      requested_by: solicitanteId,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Falha ao abrir o chamado:", error);
    return { ok: false, falha: classificarErro(error) };
  }

  return { ok: true, id: data.id };
}

const FUNCAO_DA_ACAO = {
  assumir: "assumir_chamado",
  devolver: "devolver_chamado",
  resolver: "resolver_chamado",
  cancelar: "cancelar_chamado",
} as const;

export async function transicionarChamado(
  acao: AcaoDoChamado,
  id: string,
  nota: string,
): Promise<string> {
  const supabase = await createSupabaseServerClient();

  const { data, error } =
    acao === "resolver"
      ? await supabase.rpc(FUNCAO_DA_ACAO.resolver, {
          p_chamado: id,
          p_nota: nota,
        })
      : await supabase.rpc(FUNCAO_DA_ACAO[acao], { p_chamado: id });

  if (error) {
    console.error(`Falha ao ${acao} o chamado:`, error);
    return "error";
  }

  return data;
}

export async function excluirChamadoNoBanco(id: string): Promise<string> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc("excluir_chamado", {
    p_chamado: id,
  });

  if (error) {
    console.error("Falha ao excluir o chamado:", error);
    return "error";
  }

  return data;
}

export type DadosDoChamadoParaAviso = {
  solicitanteNome: string;
  solicitanteEmail: string | null;
  espaco: string;
  descricao: string;
  nota: string;
  responsavelNome: string;
  abertoEm: Date;
};

export async function dadosParaAvisoDoChamado(
  id: string,
): Promise<DadosDoChamadoParaAviso | null> {
  const { data, error } = await supabaseAdmin
    .from("tickets")
    .select(
      "description, resolution_note, created_at, requested_by, assigned_to, rooms(name, building)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data || !data.resolution_note) return null;

  const [nomes, conta] = await Promise.all([
    nomesDosPerfis([data.requested_by, data.assigned_to ?? data.requested_by]),
    supabaseAdmin.auth.admin.getUserById(data.requested_by),
  ]);

  return {
    solicitanteNome: nomes.get(data.requested_by) ?? "",
    solicitanteEmail: conta.data.user?.email ?? null,
    espaco: data.rooms.name,
    descricao: data.description,
    nota: data.resolution_note,
    responsavelNome: data.assigned_to
      ? (nomes.get(data.assigned_to) ?? "Equipe de TI")
      : "Equipe de TI",
    abertoEm: new Date(data.created_at),
  };
}
