import "server-only";
import {
  createSupabaseServerClient,
  supabaseAdmin,
} from "@/lib/supabase/server";
import type { ActivityType, ExistingBooking } from "@/domain/booking/types";
import { FILTROS_PADRAO, type Filtros } from "@/lib/filtros";
import type { Ordenacao, Sentido } from "@/lib/tabela";

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
  const supabase = await createSupabaseServerClient();

  let query = supabase
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
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
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

// Só o necessário para decidir quem pode mexer na reserva. A verificação vale
// pela mensagem: a garantia vem das políticas do banco.
export async function findBookingOwnership(
  bookingId: string
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
};

// Uma consulta só para montar o e-mail, feita depois da gravação: antes dela
// nem todos os dados existem, e o envio não deve atrasar a resposta da tela.
export async function findBookingNotificationData(
  bookingId: string
): Promise<DadosParaNotificacao | null> {
  // Chave secreta: o e-mail do docente não é legível pela sessão do usuário.
  // Quem chama já conferiu que a pessoa pode mexer nesta reserva.
  const supabase = supabaseAdmin;

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `purpose, starts_at, ends_at, cancellation_reason,
       rooms(name, building),
       professors(name, email),
       classes(name)`
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    professorNome: data.professors.name,
    professorEmail: data.professors.email,
    finalidade: data.purpose,
    espaco: `${data.rooms.building} · ${data.rooms.name}`,
    turma: data.classes.name,
    startsAt: new Date(data.starts_at),
    endsAt: new Date(data.ends_at),
    motivo: data.cancellation_reason,
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

/** Uma reserva como aparece no calendário, na lista e na tabela. */
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
};

const SELECT_DA_LISTAGEM =
  `id, purpose, activity_type, starts_at, ends_at, status, cancellation_reason,
       room_id,
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
    // Dois níveis: booking_resources é a ligação e o nome está em resources.
    resourceNames: linha.booking_resources.map(
      (vinculo) => vinculo.resources.name
    ),
    cancelled: linha.status === "cancelled",
    cancellationReason: linha.cancellation_reason,
  };
}

// Genérico para servir às duas consultas, que diferem no count e na ordem.
function aplicarFiltros<Q extends { eq(coluna: string, valor: string): Q }>(
  query: Q,
  filtros: Filtros
): Q {
  let filtrada = query;

  if (filtros.status === "agendadas")
    filtrada = filtrada.eq("status", "active");
  if (filtros.status === "canceladas")
    filtrada = filtrada.eq("status", "cancelled");
  if (filtros.professor)
    filtrada = filtrada.eq("professor_id", filtros.professor);

  return filtrada;
}

// Sobreposição com o período, e não "começa dentro dele": uma aula das 21h às
// 23h também pertence ao dia seguinte se a janela começar à meia-noite.
export async function listBookingsInRange({
  inicio,
  fim,
  filtros = FILTROS_PADRAO,
}: {
  inicio: Date;
  fim: Date;
  filtros?: Filtros;
}): Promise<BookingListItem[]> {
  const supabase = await createSupabaseServerClient();

  const query = supabase
    .from("bookings")
    .select(SELECT_DA_LISTAGEM)
    .lt("starts_at", fim.toISOString())
    .gt("ends_at", inicio.toISOString())
    .order("starts_at");

  const { data, error } = await aplicarFiltros(query, filtros);

  if (error) {
    throw new Error(`Falha ao listar as reservas: ${error.message}`);
  }

  return data.map(paraItemDaListagem);
}

// As três do meio são colunas de tabelas relacionadas. O PostgREST ordena a
// reserva por elas quando a relação é de um para um, que é o caso das três.
const COLUNA_DA_ORDENACAO: Record<Ordenacao, string> = {
  data: "starts_at",
  atividade: "purpose",
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
}: {
  de: number;
  ate: number;
  ordenar: Ordenacao;
  sentido: Sentido;
  filtros?: Filtros;
}): Promise<{ reservas: BookingListItem[]; total: number }> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("bookings")
    .select(SELECT_DA_LISTAGEM, { count: "exact" })
    .order(COLUNA_DA_ORDENACAO[ordenar], { ascending: sentido === "asc" });

  // Desempate pela data: sem ele, reservas com o mesmo professor mudariam de
  // posição entre uma página e outra, e uma poderia aparecer duas vezes.
  if (ordenar !== "data")
    query = query.order("starts_at", { ascending: false });

  const { data, error, count } = await aplicarFiltros(query, filtros).range(
    de,
    ate
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
  reason: string | null
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
  bookingId: string
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
