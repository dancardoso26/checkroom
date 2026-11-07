import "server-only";
import {
  createSupabaseServerClient,
  supabaseAdmin,
} from "@/lib/supabase/server";
import type { ActivityType, ExistingBooking } from "@/domain/booking/types";
import { correspondeABusca } from "@/domain/tabela/busca";
import { formatPeriod } from "@/lib/datetime";
import { condicaoDeStatus, FILTROS_PADRAO, type Filtros } from "@/domain/agenda/filtros-da-agenda";
import { palestrasComoOcupacao } from "./repositorio-de-palestras";
import type { Ordenacao, Sentido } from "@/domain/tabela/tabela";

function toDate(valor: string): Date {
  return new Date(valor);
}

export async function findConflictCandidates(params: {
  roomId: string;
  professorId: string;
  classId: string;
  startsAt: Date;
  endsAt: Date;
}): Promise<ExistingBooking[]> {
  const supabase = await createSupabaseServerClient();

  const query = supabase
    .from("bookings")
    .select("id, room_id, professor_id, class_id, purpose, starts_at, ends_at")
    .or(
      `room_id.eq.${params.roomId},professor_id.eq.${params.professorId},class_id.eq.${params.classId}`,
    )
    .eq("status", "active")
    .lt("starts_at", params.endsAt.toISOString())
    .gt("ends_at", params.startsAt.toISOString());

  const [{ data, error }, palestras] = await Promise.all([
    query,
    palestrasComoOcupacao({
      inicio: params.startsAt,
      fim: params.endsAt,
      espacoId: params.roomId,
    }),
  ]);

  if (error) {
    throw new Error(`Falha ao verificar conflitos: ${error.message}`);
  }

  const reservas: ExistingBooking[] = data.map((linha) => ({
    id: linha.id,
    roomId: linha.room_id,
    professorId: linha.professor_id,
    classId: linha.class_id,
    purpose: linha.purpose,
    startsAt: toDate(linha.starts_at),
    endsAt: toDate(linha.ends_at),
  }));

  return [...reservas, ...palestras];
}

export async function findBookingsInPeriod(params: {
  startsAt: Date;
  endsAt: Date;
}): Promise<ExistingBooking[]> {
  const supabase = await createSupabaseServerClient();

  const [{ data, error }, palestras] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        "id, room_id, professor_id, class_id, purpose, starts_at, ends_at",
      )
      .eq("status", "active")
      .lt("starts_at", params.endsAt.toISOString())
      .gt("ends_at", params.startsAt.toISOString()),
    palestrasComoOcupacao({ inicio: params.startsAt, fim: params.endsAt }),
  ]);

  if (error) {
    throw new Error(`Falha ao consultar a agenda: ${error.message}`);
  }

  const reservas: ExistingBooking[] = data.map((linha) => ({
    id: linha.id,
    roomId: linha.room_id,
    professorId: linha.professor_id,
    classId: linha.class_id,
    purpose: linha.purpose,
    startsAt: toDate(linha.starts_at),
    endsAt: toDate(linha.ends_at),
  }));

  return [...reservas, ...palestras];
}

export type CreateBookingOutcome =
  | { status: "created"; bookingId: string }
  | {
      status: "conflict";
      code: "ROOM_CONFLICT" | "PROFESSOR_CONFLICT" | "CLASS_CONFLICT";
    }
  | { status: "error"; message: string };

const CONSTRAINT_TO_VIOLATION = {
  bookings_no_room_overlap: "ROOM_CONFLICT",
  bookings_no_professor_overlap: "PROFESSOR_CONFLICT",
  bookings_no_class_overlap: "CLASS_CONFLICT",
  booking_lecture_overlap: "ROOM_CONFLICT",
} as const;

export async function findBookingOwnership(
  bookingId: string,
): Promise<{ createdBy: string; professorId: string } | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("bookings")
    .select("created_by, professor_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao carregar a reserva: ${error.message}`);
  }

  if (!data) return null;

  return { createdBy: data.created_by, professorId: data.professor_id };
}

export type DadosParaNotificacao = {
  professorNome: string;
  professorEmail: string;
  finalidade: string;
  espaco: string;
  turma: string;
  startsAt: Date;
  endsAt: Date;
  motivo: string | null;
  ativa: boolean;
};

export async function findBookingNotificationData(
  bookingId: string,
): Promise<DadosParaNotificacao | null> {
  const supabase = supabaseAdmin;

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `purpose, starts_at, ends_at, cancellation_reason, status,
       rooms(name, building),
       professors(name, email),
       classes(name)`,
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    professorNome: data.professors.name,
    professorEmail: data.professors.email,
    finalidade: data.purpose,
    espaco: data.rooms.name,
    turma: data.classes.name,
    startsAt: new Date(data.starts_at),
    endsAt: new Date(data.ends_at),
    motivo: data.cancellation_reason,
    ativa: data.status === "active",
  };
}

export async function createBooking(input: {
  roomId: string;
  professorId: string;
  classId: string;
  activityType: ActivityType;
  subjectId: string | null;
  purpose: string;
  startsAt: Date;
  endsAt: Date;
  resourceIds: string[];
  createdBy: string;
}): Promise<CreateBookingOutcome> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc("create_booking", {
    p_room_id: input.roomId,
    p_professor_id: input.professorId,
    p_class_id: input.classId,
    p_activity_type: input.activityType,
    p_subject_id: input.subjectId ?? undefined,
    p_purpose: input.purpose.trim(),
    p_starts_at: input.startsAt.toISOString(),
    p_ends_at: input.endsAt.toISOString(),
    p_resource_ids: input.resourceIds,
    p_created_by: input.createdBy,
  });

  if (!error) {
    return { status: "created", bookingId: data };
  }

  if (error.code === "23P01") {
    const texto = `${error.message} ${error.details ?? ""}`;

    for (const [constraint, code] of Object.entries(CONSTRAINT_TO_VIOLATION)) {
      if (texto.includes(constraint)) {
        return { status: "conflict", code };
      }
    }

    return {
      status: "error",
      message: "A reserva conflita com outra já existente.",
    };
  }

  if (error.code === "23514") {
    return {
      status: "error",
      message: "O período informado é inválido.",
    };
  }

  if (error.code === "23503") {
    return {
      status: "error",
      message:
        "Espaço, professor ou turma não existe mais. Recarregue a página e tente de novo.",
    };
  }

  console.error("Falha inesperada ao gravar reserva:", error);

  return {
    status: "error",
    message:
      "Não foi possível gravar a reserva. Tente novamente em alguns instantes.",
  };
}

export type BookingListItem = {
  id: string;
  purpose: string;
  activityType: ActivityType;
  startsAt: Date;
  endsAt: Date;
  roomId: string;
  roomName: string;
  building: string;
  professorName: string;
  className: string;
  subjectName: string | null;
  resourceNames: string[];
  cancelled: boolean;
  cancellationReason: string | null;
  createdBy: string;
  professorId: string;
  gerenciavel?: boolean;
  ehPalestra?: boolean;
  inscricaoAberta?: boolean;
  inscrito?: boolean;
};

const LIMITE_DA_BUSCA = 2000;

export function reservaCorrespondeABusca(
  reserva: BookingListItem,
  busca: string,
): boolean {
  return correspondeABusca(
    [
      reserva.purpose,
      reserva.roomName,
      reserva.building,
      reserva.professorName,
      reserva.className,
      reserva.subjectName,
      formatPeriod(reserva.startsAt, reserva.endsAt),
      ...reserva.resourceNames,
    ],
    busca,
  );
}

const SELECT_DA_LISTAGEM =
  `id, purpose, activity_type, starts_at, ends_at, status, cancellation_reason,
       room_id, created_by, professor_id,
       rooms(name, building),
       professors(name),
       classes(name),
       subjects(name),
       booking_resources(resources(name))` as const;

type LinhaDaListagem = {
  id: string;
  purpose: string;
  activity_type: ActivityType;
  starts_at: string;
  ends_at: string;
  status: string;
  cancellation_reason: string | null;
  room_id: string;
  created_by: string;
  professor_id: string;
  rooms: { name: string; building: string };
  professors: { name: string };
  classes: { name: string };
  subjects: { name: string } | null;
  booking_resources: { resources: { name: string } }[];
};

function paraItemDaListagem(linha: LinhaDaListagem): BookingListItem {
  return {
    id: linha.id,
    purpose: linha.purpose,
    activityType: linha.activity_type,
    startsAt: toDate(linha.starts_at),
    endsAt: toDate(linha.ends_at),
    roomId: linha.room_id,
    roomName: linha.rooms.name,
    building: linha.rooms.building,
    professorName: linha.professors.name,
    className: linha.classes.name,
    subjectName: linha.subjects?.name ?? null,
    resourceNames: linha.booking_resources.map(
      (vinculo) => vinculo.resources.name,
    ),
    cancelled: linha.status === "cancelled",
    cancellationReason: linha.cancellation_reason,
    createdBy: linha.created_by,
    professorId: linha.professor_id,
  };
}

export type EscopoDoAluno = { cursoId: string | null; turmaIds: string[] };

function aplicarFiltros<
  Q extends {
    eq(coluna: string, valor: string): Q;
    in(coluna: string, valores: string[]): Q;
    or(condicao: string): Q;
  },
>(
  query: Q,
  filtros: Filtros,
  escopo: EscopoDoAluno | null,
  distinguirConcluidas: boolean,
): Q {
  let filtrada = query;

  if (escopo) filtrada = filtrada.in("class_id", escopo.turmaIds);

  const status = condicaoDeStatus(filtros, new Date(), distinguirConcluidas);
  if (status) filtrada = filtrada.or(status);
  if (filtros.professores.length > 0) {
    filtrada = filtrada.in("professor_id", filtros.professores);
  }
  if (filtros.turmas.length > 0) {
    filtrada = filtrada.in("class_id", filtros.turmas);
  }
  if (filtros.espacos.length > 0) {
    filtrada = filtrada.in("room_id", filtros.espacos);
  }
  if (filtros.tipos.length > 0) {
    filtrada = filtrada.in("activity_type", filtros.tipos);
  }

  return filtrada;
}

export async function listBookingsInRange({
  inicio,
  fim,
  filtros = FILTROS_PADRAO,
  escopo = null,
}: {
  inicio: Date;
  fim: Date;
  filtros?: Filtros;
  escopo?: EscopoDoAluno | null;
}): Promise<BookingListItem[]> {
  const supabase = await createSupabaseServerClient();

  const query = supabase
    .from("bookings")
    .select(SELECT_DA_LISTAGEM)
    .lt("starts_at", fim.toISOString())
    .gt("ends_at", inicio.toISOString())
    .order("starts_at");

  const { data, error } = await aplicarFiltros(query, filtros, escopo, false);

  if (error) {
    throw new Error(`Falha ao listar as reservas: ${error.message}`);
  }

  return data.map(paraItemDaListagem);
}

const COLUNA_DA_ORDENACAO: Record<Ordenacao, string> = {
  data: "starts_at",
  atividade: "purpose",
  tipo: "activity_type",
  espaco: "rooms(name)",
  professor: "professors(name)",
  turma: "classes(name)",
  situacao: "status",
};

export async function listBookingsPage({
  de,
  ate,
  ordenar,
  sentido,
  filtros = FILTROS_PADRAO,
  busca = "",
  escopo = null,
}: {
  de: number;
  ate: number;
  ordenar: Ordenacao;
  sentido: Sentido;
  filtros?: Filtros;
  busca?: string;
  escopo?: EscopoDoAluno | null;
}): Promise<{ reservas: BookingListItem[]; total: number }> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("bookings")
    .select(SELECT_DA_LISTAGEM, { count: "exact" })
    .order(COLUNA_DA_ORDENACAO[ordenar], { ascending: sentido === "asc" });

  if (ordenar !== "data")
    query = query.order("starts_at", { ascending: false });

  if (busca.trim()) {
    const { data, error } = await aplicarFiltros(query, filtros, escopo, true).limit(
      LIMITE_DA_BUSCA,
    );

    if (error) {
      throw new Error(`Falha ao listar as reservas: ${error.message}`);
    }

    const encontradas = data
      .map(paraItemDaListagem)
      .filter((reserva) => reservaCorrespondeABusca(reserva, busca));

    return {
      reservas: encontradas.slice(de, ate + 1),
      total: encontradas.length,
    };
  }

  const { data, error, count } = await aplicarFiltros(query, filtros, escopo, true).range(
    de,
    ate,
  );

  if (error) {
    throw new Error(`Falha ao listar as reservas: ${error.message}`);
  }

  return { reservas: data.map(paraItemDaListagem), total: count ?? 0 };
}

export type CancelBookingOutcome =
  "cancelled" | "not_found" | "already_cancelled" | "already_finished";

export async function cancelBooking(
  bookingId: string,
  reason: string | null,
): Promise<CancelBookingOutcome> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc("cancel_booking", {
    p_booking_id: bookingId,
    p_reason: reason ?? undefined,
  });

  if (error) {
    console.error("Falha ao cancelar reserva:", error);
    throw new Error("Não foi possível cancelar a reserva.");
  }

  return data as CancelBookingOutcome;
}

export type DeleteBookingOutcome = "deleted" | "not_found";

export async function deleteBooking(
  bookingId: string,
): Promise<DeleteBookingOutcome> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("bookings")
    .delete()
    .eq("id", bookingId)
    .select("id");

  if (error) {
    console.error("Falha ao excluir reserva:", error);
    throw new Error("Não foi possível excluir a reserva.");
  }

  return data.length > 0 ? "deleted" : "not_found";
}
