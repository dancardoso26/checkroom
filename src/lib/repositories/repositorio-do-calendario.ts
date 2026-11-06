import "server-only";

import {
  calendarioDoDia,
  periodoDoDia,
  type Bloqueio,
  type CalendarioDoDia,
  type PeriodoLetivo,
} from "@/domain/calendario/calendario";
import { PERIODO_LETIVO_VIGENTE } from "@/domain/booking/businessHours";
import { toDateInputValue } from "@/lib/datetime";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import {
  classificarErro,
  type ResultadoDaExclusao,
  type ResultadoDaGravacao,
} from "./erros";

export async function listarPeriodos(): Promise<PeriodoLetivo[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("academic_terms")
    .select("id, code, starts_on, ends_on")
    .order("starts_on", { ascending: false });

  if (error) throw new Error(`Falha ao listar os períodos: ${error.message}`);

  return data.map((p) => ({
    id: p.id,
    codigo: p.code,
    inicio: p.starts_on,
    fim: p.ends_on,
  }));
}

export async function listarBloqueios(): Promise<Bloqueio[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("calendar_blocks")
    .select("id, starts_on, ends_on, room_id, reason")
    .order("starts_on", { ascending: false });

  if (error) throw new Error(`Falha ao listar os bloqueios: ${error.message}`);

  return data.map((b) => ({
    id: b.id,
    inicio: b.starts_on,
    fim: b.ends_on,
    espacoId: b.room_id,
    motivo: b.reason,
  }));
}

export async function carregarCalendarioDoDia(dia: string): Promise<CalendarioDoDia> {
  const supabase = await createSupabaseServerClient();

  const [periodos, bloqueios] = await Promise.all([
    supabase
      .from("academic_terms")
      .select("id, code, starts_on, ends_on")
      .lte("starts_on", dia)
      .gte("ends_on", dia),
    supabase
      .from("calendar_blocks")
      .select("id, starts_on, ends_on, room_id, reason")
      .lte("starts_on", dia)
      .gte("ends_on", dia),
  ]);

  if (periodos.error || bloqueios.error) {
    throw new Error("Falha ao consultar o calendário letivo.");
  }

  return calendarioDoDia(
    periodos.data.map((p) => ({ id: p.id, codigo: p.code, inicio: p.starts_on, fim: p.ends_on })),
    bloqueios.data.map((b) => ({
      id: b.id,
      inicio: b.starts_on,
      fim: b.ends_on,
      espacoId: b.room_id,
      motivo: b.reason,
    })),
    dia
  );
}

export async function codigoDoPeriodoDe(dia: string): Promise<string | null> {
  return periodoDoDia(await listarPeriodos(), dia)?.codigo ?? null;
}

export async function periodoLetivoVigente(): Promise<string> {
  return (
    (await codigoDoPeriodoDe(toDateInputValue(new Date()))) ??
    PERIODO_LETIVO_VIGENTE
  );
}

export async function salvarPeriodo(
  dados: Omit<PeriodoLetivo, "id"> & { id: string | null }
): Promise<ResultadoDaGravacao> {
  const supabase = await createSupabaseServerClient();
  const linha = { code: dados.codigo.trim(), starts_on: dados.inicio, ends_on: dados.fim };

  const { data, error } = dados.id
    ? await supabase.from("academic_terms").update(linha).eq("id", dados.id).select("id")
    : await supabase.from("academic_terms").insert(linha).select("id");

  if (error) return { ok: false, falha: classificarErro(error) };
  if (data.length === 0) return { ok: false, falha: "nao_encontrado" };
  return { ok: true, id: data[0].id };
}

export async function salvarBloqueio(
  dados: Omit<Bloqueio, "id"> & { id: string | null }
): Promise<ResultadoDaGravacao> {
  const supabase = await createSupabaseServerClient();
  const linha = {
    starts_on: dados.inicio,
    ends_on: dados.fim,
    room_id: dados.espacoId,
    reason: dados.motivo.trim(),
  };

  const { data, error } = dados.id
    ? await supabase.from("calendar_blocks").update(linha).eq("id", dados.id).select("id")
    : await supabase.from("calendar_blocks").insert(linha).select("id");

  if (error) return { ok: false, falha: classificarErro(error) };
  if (data.length === 0) return { ok: false, falha: "nao_encontrado" };
  return { ok: true, id: data[0].id };
}

export async function excluirDoCalendario(
  tabela: "academic_terms" | "calendar_blocks",
  id: string
): Promise<ResultadoDaExclusao> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from(tabela as "academic_terms")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) return { ok: false, falha: classificarErro(error) };
  if (data.length === 0) return { ok: false, falha: "nao_encontrado" };
  return { ok: true };
}
