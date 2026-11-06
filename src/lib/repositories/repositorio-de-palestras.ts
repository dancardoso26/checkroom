import "server-only";

import type { DadosDaPalestra, Ocupacao } from "@/domain/palestras/palestra";
import type { ExistingBooking } from "@/domain/booking/types";
import type { BookingListItem } from "./repositorio-de-reservas";
import {
  createSupabaseServerClient,
  supabaseAdmin,
} from "@/lib/supabase/server";

import { classificarErro, type ResultadoDaExclusao } from "./erros";

export type PalestraItem = {
  id: string;
  titulo: string;
  palestrante: string;
  espaco: string;
  espacoId: string;
  inicio: Date;
  fim: Date;
  vagas: number;
  inscritos: number;
  cursoIds: string[];
  cursos: string[];
};

async function contarInscritos(ids: string[]): Promise<Map<string, number>> {
  if (ids.length === 0) return new Map();

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("inscritos_por_palestra", {
    p_palestras: ids,
  });

  if (error) throw new Error(`Falha ao contar os inscritos: ${error.message}`);

  return new Map(data.map((linha) => [linha.lecture_id, linha.inscritos]));
}

export async function listarPalestras(filtro: {
  aPartirDe: Date | null;
}): Promise<PalestraItem[]> {
  const supabase = await createSupabaseServerClient();

  let consulta = supabase
    .from("lectures")
    .select(
      `id, title, speaker, room_id, starts_at, ends_at, seats,
       rooms(name, building),
       lecture_courses(course_id, courses(name))`,
    )
    .order("starts_at");

  if (filtro.aPartirDe) {
    consulta = consulta.gt("ends_at", filtro.aPartirDe.toISOString());
  }

  const { data, error } = await consulta;

  if (error) throw new Error(`Falha ao listar as palestras: ${error.message}`);

  const inscritos = await contarInscritos(data.map((p) => p.id));

  return data.map((p) => ({
    id: p.id,
    titulo: p.title,
    palestrante: p.speaker,
    espaco: p.rooms.name,
    espacoId: p.room_id,
    inicio: new Date(p.starts_at),
    fim: new Date(p.ends_at),
    vagas: p.seats,
    inscritos: inscritos.get(p.id) ?? 0,
    cursoIds: p.lecture_courses.map((c) => c.course_id),
    cursos: p.lecture_courses.map((c) => c.courses.name).sort(),
  }));
}

export async function minhasInscricoes(
  profileId: string,
): Promise<Set<string>> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("lecture_enrollments")
    .select("lecture_id")
    .eq("profile_id", profileId);

  if (error) throw new Error(`Falha ao listar as inscrições: ${error.message}`);

  return new Set(data.map((linha) => linha.lecture_id));
}

export async function ocupacoesDoEspaco(
  espacoId: string,
  inicio: Date,
  fim: Date,
): Promise<Ocupacao[]> {
  const supabase = await createSupabaseServerClient();

  const [reservas, palestras] = await Promise.all([
    supabase
      .from("bookings")
      .select("purpose, starts_at, ends_at")
      .eq("room_id", espacoId)
      .eq("status", "active")
      .lt("starts_at", fim.toISOString())
      .gt("ends_at", inicio.toISOString()),
    supabase
      .from("lectures")
      .select("title, starts_at, ends_at")
      .eq("room_id", espacoId)
      .lt("starts_at", fim.toISOString())
      .gt("ends_at", inicio.toISOString()),
  ]);

  if (reservas.error || palestras.error) {
    throw new Error("Falha ao verificar a ocupação do espaço.");
  }

  return [
    ...reservas.data.map((r) => ({
      inicio: new Date(r.starts_at),
      fim: new Date(r.ends_at),
      descricao: r.purpose,
    })),
    ...palestras.data.map((p) => ({
      inicio: new Date(p.starts_at),
      fim: new Date(p.ends_at),
      descricao: `Palestra: ${p.title}`,
    })),
  ];
}

export async function palestrasComoOcupacao(params: {
  inicio: Date;
  fim: Date;
  espacoId?: string;
}): Promise<ExistingBooking[]> {
  const supabase = await createSupabaseServerClient();

  let consulta = supabase
    .from("lectures")
    .select("id, room_id, title, starts_at, ends_at")
    .lt("starts_at", params.fim.toISOString())
    .gt("ends_at", params.inicio.toISOString());

  if (params.espacoId) consulta = consulta.eq("room_id", params.espacoId);

  const { data, error } = await consulta;

  if (error)
    throw new Error(`Falha ao consultar as palestras: ${error.message}`);

  return data.map((p) => ({
    id: `palestra:${p.id}`,
    roomId: p.room_id,
    professorId: "",
    classId: "",
    purpose: `Palestra: ${p.title}`,
    startsAt: new Date(p.starts_at),
    endsAt: new Date(p.ends_at),
  }));
}

export type ResultadoDoCadastro =
  | { ok: true; id: string }
  | {
      ok: false;
      falha: "conflito" | "vagas" | "sem_curso" | "espaco" | "erro";
    };

export async function cadastrarPalestra(
  dados: DadosDaPalestra,
): Promise<ResultadoDoCadastro> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc("cadastrar_palestra", {
    p_titulo: dados.titulo,
    p_palestrante: dados.palestrante,
    p_room_id: dados.espacoId,
    p_inicio: dados.inicio.toISOString(),
    p_fim: dados.fim.toISOString(),
    p_vagas: dados.vagas,
    p_cursos: dados.cursoIds,
  });

  if (error) {
    if (error.code === "23P01") return { ok: false, falha: "conflito" };
    if (/lecture_seats_exceed_capacity/.test(error.message)) {
      return { ok: false, falha: "vagas" };
    }
    if (/lecture_course_required/.test(error.message)) {
      return { ok: false, falha: "sem_curso" };
    }
    if (error.code === "23503") return { ok: false, falha: "espaco" };

    console.error("Falha ao cadastrar a palestra:", error);
    return { ok: false, falha: "erro" };
  }

  return { ok: true, id: data };
}

export async function excluirPalestra(
  id: string,
): Promise<ResultadoDaExclusao> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("lectures")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) return { ok: false, falha: classificarErro(error) };
  if (data.length === 0) return { ok: false, falha: "nao_encontrado" };

  return { ok: true };
}

export async function inscrever(palestraId: string): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("inscrever_em_palestra", {
    p_palestra: palestraId,
  });

  if (error) {
    console.error("Falha ao inscrever:", error);
    return "error";
  }
  return data;
}

export async function cancelarInscricao(palestraId: string): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("cancelar_inscricao", {
    p_palestra: palestraId,
  });

  if (error) {
    console.error("Falha ao cancelar a inscrição:", error);
    return "error";
  }
  return data;
}

export async function emailsDosAlunos(cursoIds: string[]): Promise<string[]> {
  const [perfis, contas] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("role", "student")
      .is("anonymized_at", null)
      .in("course_id", cursoIds),
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  if (perfis.error || contas.error) {
    console.error(
      "Falha ao listar os alunos para o aviso:",
      perfis.error ?? contas.error,
    );
    return [];
  }

  const alunos = new Set(perfis.data.map((p) => p.id));
  const agora = Date.now();

  return contas.data.users
    .filter((u) => alunos.has(u.id))
    .filter((u) => !u.banned_until || Date.parse(u.banned_until) <= agora)
    .flatMap((u) => (u.email ? [u.email] : []));
}

export async function palestrasNaAgenda(
  inicio: Date,
  fim: Date,
  escopo: { cursoId: string | null } | null = null,
): Promise<BookingListItem[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("lectures")
    .select(
      "id, title, speaker, room_id, starts_at, ends_at, rooms(name, building), lecture_courses(course_id, courses(name))",
    )
    .lt("starts_at", fim.toISOString())
    .gt("ends_at", inicio.toISOString())
    .order("starts_at");

  if (error) throw new Error(`Falha ao listar as palestras: ${error.message}`);

  const visiveis = escopo
    ? data.filter((p) =>
        p.lecture_courses.some((c) => c.course_id === escopo.cursoId),
      )
    : data;

  const inscritas = new Set<string>();
  if (escopo && visiveis.length > 0) {
    const { data: minhas, error: erroDasInscricoes } = await supabase
      .from("lecture_enrollments")
      .select("lecture_id")
      .in(
        "lecture_id",
        visiveis.map((p) => p.id),
      );

    if (erroDasInscricoes) {
      throw new Error(
        `Falha ao listar as inscrições: ${erroDasInscricoes.message}`,
      );
    }
    for (const { lecture_id } of minhas) inscritas.add(lecture_id);
  }

  const agora = new Date();

  return visiveis.map((p) => ({
    id: `palestra:${p.id}`,
    purpose: p.title,
    activityType: "lecture" as const,
    startsAt: new Date(p.starts_at),
    endsAt: new Date(p.ends_at),
    roomId: p.room_id,
    roomName: p.rooms.name,
    building: p.rooms.building,
    professorName: p.speaker,
    className: p.lecture_courses
      .map((c) => c.courses.name)
      .sort()
      .join(", "),
    subjectName: null,
    resourceNames: [],
    cancelled: false,
    cancellationReason: null,
    createdBy: "",
    professorId: "",
    ehPalestra: true,
    inscrito:
      escopo !== null && inscritas.has(p.id) && new Date(p.starts_at) > agora,
    inscricaoAberta:
      escopo !== null && !inscritas.has(p.id) && new Date(p.starts_at) > agora,
  }));
}

export type InscritoDaPalestra = {
  nome: string;
  email: string | null;
  curso: string | null;
  inscritoEm: string;
};

export async function listarInscritos(
  palestraId: string,
): Promise<InscritoDaPalestra[]> {
  const { data: inscricoes, error } = await supabaseAdmin
    .from("lecture_enrollments")
    .select("profile_id, enrolled_at")
    .eq("lecture_id", palestraId)
    .order("enrolled_at", { ascending: true });

  if (error) throw error;
  if (inscricoes.length === 0) return [];

  const ids = inscricoes.map((i) => i.profile_id);

  const [perfis, cursos, contas] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("id, full_name, course_id")
      .in("id", ids),
    supabaseAdmin.from("courses").select("id, name"),
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  if (perfis.error) throw perfis.error;
  if (cursos.error) throw cursos.error;
  if (contas.error) throw contas.error;

  const perfilPorId = new Map(perfis.data.map((p) => [p.id, p]));
  const cursoPorId = new Map(cursos.data.map((c) => [c.id, c.name]));
  const emailPorId = new Map(
    contas.data.users.map((u) => [u.id, u.email ?? null]),
  );

  return inscricoes.map((inscricao) => {
    const perfil = perfilPorId.get(inscricao.profile_id);
    return {
      nome: perfil?.full_name ?? "Usuário removido",
      email: emailPorId.get(inscricao.profile_id) ?? null,
      curso: perfil?.course_id
        ? (cursoPorId.get(perfil.course_id) ?? null)
        : null,
      inscritoEm: inscricao.enrolled_at,
    };
  });
}
