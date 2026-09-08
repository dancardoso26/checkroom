import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import type { ExistingBooking } from "@/domain/booking/types";

/**
 * Repositório de reservas. Concentra os nomes das constraints, os códigos de
 * erro do PostgreSQL e a conversão entre as datas do banco e os Date do domínio.
 */

/** O PostgREST entrega timestamptz como string ISO com fuso. */
function toDate(valor: string): Date {
  return new Date(valor);
}

/**
 * O retrato do conflito triplo em SQL: qualquer reserva que compartilhe espaço,
 * professor ou turma e toque a mesma faixa de tempo.
 *
 * O filtro de período é a mesma condição de overlaps, com os dois lados
 * estritos, e é o que mantém o custo constante conforme a agenda cresce. A regra
 * reconfere cada linha, então alterar esta consulta não corrompe a decisão.
 */
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

/**
 * Todas as reservas do período, sem filtrar por espaço: a tela de escolha
 * pergunta "quais salas estão livres", e não "esta sala está livre".
 */
export async function findBookingsInPeriod(params: {
  startsAt: Date;
  endsAt: Date;
}): Promise<ExistingBooking[]> {
  const { data, error } = await supabaseServer
    .from("bookings")
    .select("id, room_id, professor_id, class_id, purpose, starts_at, ends_at")
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

/**
 * "conflict" não é erro: é a validação ter aprovado e o banco recusado, o que só
 * acontece quando outra reserva foi gravada no intervalo. Quem chama precisa
 * distinguir isso de uma falha real.
 */
export type CreateBookingOutcome =
  | { status: "created"; bookingId: string }
  | {
      status: "conflict";
      code: "ROOM_CONFLICT" | "PROFESSOR_CONFLICT" | "CLASS_CONFLICT";
    }
  | { status: "error"; message: string };

/**
 * Os nomes das constraints são interface: renomear uma na migration
 * 20260904000200 obriga a atualizar este mapa.
 */
const CONSTRAINT_TO_VIOLATION = {
  bookings_no_room_overlap: "ROOM_CONFLICT",
  bookings_no_professor_overlap: "PROFESSOR_CONFLICT",
  bookings_no_class_overlap: "CLASS_CONFLICT",
} as const;

/**
 * Chama create_booking em vez de dois inserts seguidos, porque a gravação toca
 * bookings e booking_resources e precisa ser atômica.
 */
export async function createBooking(input: {
  roomId: string;
  professorId: string;
  classId: string;
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
    // undefined omite o parâmetro na chamada, e o banco aplica o default null.
    // Enviar null explícito seria equivalente no PostgreSQL, mas o tipo gerado
    // descreve o parâmetro como opcional, e respeitá-lo evita um cast.
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

  // Erro não previsto: o detalhe fica no log e o usuário recebe texto genérico,
  // porque mensagens do banco citam nomes de tabela e de constraint.
  //
  // Os "throw" deste arquivo continuam carregando o detalhe de propósito: exceção
  // não tratada em Server Action é substituída pelo Next por uma mensagem neutra.
  // O caso perigoso é este, um retorno normal, que chega à tela como foi escrito.
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
};

/**
 * O corte é por ends_at: uma aula que começou há dez minutos ainda está
 * acontecendo e precisa aparecer na grade.
 */
export async function listUpcomingBookings(
  now: Date = new Date()
): Promise<BookingListItem[]> {
  const { data, error } = await supabaseServer
    .from("bookings")
    .select(
      `id, purpose, starts_at, ends_at,
       rooms(name, building),
       professors(name),
       classes(name),
       booking_resources(resources(name))`
    )
    .gte("ends_at", now.toISOString())
    .order("starts_at");

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
  }));
}
