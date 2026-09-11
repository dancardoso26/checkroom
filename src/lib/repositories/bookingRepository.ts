import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import type { ActivityType, ExistingBooking } from "@/domain/booking/types";

/** O PostgREST entrega timestamptz como string ISO com fuso. */
function toDate(valor: string): Date {
  return new Date(valor);
}

export async function findConflictCandidates(params: {
  roomId: string;
  professorId: string;
  classId: string;
  startsAt: Date;
  endsAt: Date;
  /** Ignora uma reserva específica. Servirá à edição, que entra depois. */
  excludeBookingId?: string;
}): Promise<ExistingBooking[]> {
  let query = supabaseServer
    .from("bookings")
    .select("id, room_id, professor_id, class_id, purpose, starts_at, ends_at")
    // O "or" do PostgREST agrupa entre parênteses, então a expressão final é
    // (espaço OU professor OU turma) E período.
    .or(
      `room_id.eq.${params.roomId},professor_id.eq.${params.professorId},class_id.eq.${params.classId}`
    )
    // Reserva cancelada não ocupa nada. Sem este filtro, cancelar não liberaria
    // o horário na visão da regra, ainda que o banco já o liberasse.
    .eq("status", "active")
    .lt("starts_at", params.endsAt.toISOString())
    .gt("ends_at", params.startsAt.toISOString());

  if (params.excludeBookingId) {
    query = query.neq("id", params.excludeBookingId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Falha ao verificar conflitos: ${error.message}`);
  }

  return data.map((linha) => ({
    id: linha.id,
    roomId: linha.room_id,
    professorId: linha.professor_id,
    classId: linha.class_id,
    purpose: linha.purpose,
    startsAt: toDate(linha.starts_at),
    endsAt: toDate(linha.ends_at),
  }));
}

export async function findBookingsInPeriod(params: {
  startsAt: Date;
  endsAt: Date;
}): Promise<ExistingBooking[]> {
  const { data, error } = await supabaseServer
    .from("bookings")
    .select("id, room_id, professor_id, class_id, purpose, starts_at, ends_at")
    .eq("status", "active")
    .lt("starts_at", params.endsAt.toISOString())
    .gt("ends_at", params.startsAt.toISOString());

  if (error) {
    throw new Error(`Falha ao consultar a agenda: ${error.message}`);
  }

  return data.map((linha) => ({
    id: linha.id,
    roomId: linha.room_id,
    professorId: linha.professor_id,
    classId: linha.class_id,
    purpose: linha.purpose,
    startsAt: toDate(linha.starts_at),
    endsAt: toDate(linha.ends_at),
  }));
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
} as const;

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
}): Promise<CreateBookingOutcome> {
  const { data, error } = await supabaseServer.rpc("create_booking", {
    p_room_id: input.roomId,
    p_professor_id: input.professorId,
    p_class_id: input.classId,
    p_activity_type: input.activityType,
    p_subject_id: input.subjectId ?? undefined,
    p_purpose: input.purpose.trim(),
    p_starts_at: input.startsAt.toISOString(),
    p_ends_at: input.endsAt.toISOString(),
    p_resource_ids: input.resourceIds,
  });

  if (!error) {
    return { status: "created", bookingId: data };
  }

  // 23P01 é exclusion_violation, o único erro esperado no funcionamento normal.
  if (error.code === "23P01") {
    // Procurar o nome no texto é frágil, mas é a única informação que o
    // PostgREST repassa. Os testes de ponta a ponta pegam se o formato mudar.
    const texto = `${error.message} ${error.details ?? ""}`;

    for (const [constraint, code] of Object.entries(CONSTRAINT_TO_VIOLATION)) {
      if (texto.includes(constraint)) {
        return { status: "conflict", code };
      }
    }

    // Constraint desconhecida: recusar é melhor do que gravar às cegas.
    return {
      status: "error",
      message: "A reserva conflita com outra já existente.",
    };
  }

  // 23514 é violação de check. A regra já barra esse caso, então chegar aqui
  // significa que algo passou por um caminho que não validou.
  if (error.code === "23514") {
    return {
      status: "error",
      message: "O período informado é inválido.",
    };
  }

  // 23503: o espaço, o professor ou a turma sumiu entre o carregamento e o envio.
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

/** Uma reserva como aparece na listagem. */
export type BookingListItem = {
  id: string;
  purpose: string;
  startsAt: Date;
  endsAt: Date;
  roomName: string;
  building: string;
  professorName: string;
  className: string;
  resourceNames: string[];
  cancelled: boolean;
  cancellationReason: string | null;
};

export async function listUpcomingBookings(
  { incluirCanceladas = false } = {},
  now: Date = new Date()
): Promise<BookingListItem[]> {
  let query = supabaseServer
    .from("bookings")
    .select(
      `id, purpose, starts_at, ends_at, status, cancellation_reason,
       rooms(name, building),
       professors(name),
       classes(name),
       booking_resources(resources(name))`
    )
    .gte("ends_at", now.toISOString())
    .order("starts_at");

  if (!incluirCanceladas) {
    query = query.eq("status", "active");
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Falha ao listar as reservas: ${error.message}`);
  }

  return data.map((linha) => ({
    id: linha.id,
    purpose: linha.purpose,
    startsAt: toDate(linha.starts_at),
    endsAt: toDate(linha.ends_at),
    roomName: linha.rooms.name,
    building: linha.rooms.building,
    professorName: linha.professors.name,
    className: linha.classes.name,
    // Dois níveis: booking_resources é a ligação e o nome está em resources. O
    // PostgREST atravessa as duas em uma consulta só.
    resourceNames: linha.booking_resources.map(
      (vinculo) => vinculo.resources.name
    ),
    // A tela precisa do booleano, não do enum: ela decide se mostra o badge, e
    // não qual dos estados possíveis exibir.
    cancelled: linha.status === "cancelled",
    cancellationReason: linha.cancellation_reason,
  }));
}

export type CancelBookingOutcome =
  | "cancelled"
  | "not_found"
  | "already_cancelled"
  | "already_finished";

export async function cancelBooking(
  bookingId: string,
  reason: string | null
): Promise<CancelBookingOutcome> {
  const { data, error } = await supabaseServer.rpc("cancel_booking", {
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
  bookingId: string
): Promise<DeleteBookingOutcome> {
  const { data, error } = await supabaseServer
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
