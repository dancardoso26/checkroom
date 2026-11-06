import "server-only";

import type { Prioridade, SituacaoDoChamado } from "@/domain/chamados/chamado";
import type { Periodo } from "@/domain/painel/periodo";
import type { ChamadoDoPainel, InscricaoDoPainel, PalestraDoPainel, ReservaDoPainel } from "@/domain/painel/tipos";
import { createSupabaseServerClient, supabaseAdmin } from "@/lib/supabase/server";

export type EspacoDoPainel = { id: string; nome: string; predio: number };

export type ChamadoDaFila = {
  id: string;
  descricao: string;
  espaco: string;
  prioridade: Prioridade;
  situacao: SituacaoDoChamado;
  criadoEm: Date;
};

export type DadosDoPainel = {
  espacos: EspacoDoPainel[];
  reservas: ReservaDoPainel[];
  chamados: ChamadoDoPainel[];
  palestras: PalestraDoPainel[];
  inscricoes: InscricaoDoPainel[];
  fila: ChamadoDaFila[];
  professores: Map<string, string>;
  turmas: Map<string, { nome: string; cursoId: string }>;
  cursos: Map<string, string>;
};

export async function carregarDadosDoPainel(
  periodo: Periodo
): Promise<DadosDoPainel> {
  const supabase = await createSupabaseServerClient();
  const de = periodo.inicio.toISOString();
  const ate = periodo.fim.toISOString();

  const [
    espacos,
    reservas,
    chamados,
    fila,
    palestras,
    inscricoes,
    professores,
    turmas,
    cursos,
  ] = await Promise.all([
    supabase
      .from("rooms")
      .select("id, name, building_number")
      .order("building_number")
      .order("floor")
      .order("room_number"),
    supabase
      .from("bookings")
      .select(
        "room_id, starts_at, ends_at, status, professor_id, class_id, activity_type"
      )
      .gte("starts_at", de)
      .lt("starts_at", ate),
    supabase
      .from("tickets")
      .select(
        "room_id, status, priority, created_at, started_at, resolved_at"
      )
      .or(
        `and(created_at.gte.${de},created_at.lt.${ate}),and(resolved_at.gte.${de},resolved_at.lt.${ate})`
      ),
    supabase
      .from("tickets")
      .select("id, description, priority, status, created_at, rooms(name)")
      .in("status", ["open", "in_progress"])
      .order("created_at")
      .limit(5),
    supabase
      .from("lectures")
      .select("id, title, room_id, starts_at, ends_at, seats")
      .gte("starts_at", de)
      .lt("starts_at", ate)
      .order("starts_at"),
    supabaseAdmin
      .from("lecture_enrollments")
      .select("enrolled_at, profiles(course_id)")
      .gte("enrolled_at", de)
      .lt("enrolled_at", ate),
    supabase.from("professors").select("id, name"),
    supabase.from("classes").select("id, name, course_id"),
    supabase.from("courses").select("id, name"),
  ]);

  for (const { error } of [
    espacos,
    reservas,
    chamados,
    fila,
    palestras,
    inscricoes,
    professores,
    turmas,
    cursos,
  ]) {
    if (error) throw new Error(`Falha ao carregar o painel: ${error.message}`);
  }

  const ids = palestras.data!.map((p) => p.id);
  const inscritos = new Map<string, number>();

  if (ids.length > 0) {
    const { data, error } = await supabase.rpc("inscritos_por_palestra", {
      p_palestras: ids,
    });
    if (error) throw new Error(`Falha ao contar os inscritos: ${error.message}`);
    for (const linha of data) inscritos.set(linha.lecture_id, linha.inscritos);
  }

  return {
    espacos: espacos.data!.map((e) => ({
      id: e.id,
      nome: e.name,
      predio: e.building_number,
    })),
    reservas: reservas.data!.map((r) => ({
      espacoId: r.room_id,
      inicio: new Date(r.starts_at),
      fim: new Date(r.ends_at),
      cancelada: r.status === "cancelled",
      professorId: r.professor_id,
      turmaId: r.class_id,
      tipo: r.activity_type,
    })),
    chamados: chamados.data!.map((c) => ({
      situacao: c.status,
      prioridade: c.priority,
      espacoId: c.room_id,
      criadoEm: new Date(c.created_at),
      iniciadoEm: c.started_at ? new Date(c.started_at) : null,
      resolvidoEm: c.resolved_at ? new Date(c.resolved_at) : null,
    })),
    fila: fila.data!.map((c) => ({
      id: c.id,
      descricao: c.description,
      espaco: c.rooms?.name ?? "Espaço removido",
      prioridade: c.priority,
      situacao: c.status,
      criadoEm: new Date(c.created_at),
    })),
    palestras: palestras.data!.map((p) => ({
      id: p.id,
      titulo: p.title,
      espacoId: p.room_id,
      inicio: new Date(p.starts_at),
      fim: new Date(p.ends_at),
      vagas: p.seats,
      inscritos: inscritos.get(p.id) ?? 0,
    })),
    inscricoes: inscricoes.data!.map((i) => ({
      feitaEm: new Date(i.enrolled_at),
      cursoId: i.profiles?.course_id ?? null,
    })),
    professores: new Map(professores.data!.map((p) => [p.id, p.name])),
    turmas: new Map(
      turmas.data!.map((t) => [t.id, { nome: t.name, cursoId: t.course_id }])
    ),
    cursos: new Map(cursos.data!.map((c) => [c.id, c.name])),
  };
}
