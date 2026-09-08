import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import type { ExistingBooking } from "@/domain/booking/types";

/**
 * REPOSITÓRIO DE RESERVAS
 *
 * O arquivo que mais conhece o banco em todo o sistema. É aqui que ficam os
 * nomes das constraints, os códigos de erro do PostgreSQL e a conversão entre
 * as datas em texto que o banco devolve e os objetos Date que o domínio usa.
 */

/**
 * Converte a data como o banco a devolve para o tipo que o domínio espera.
 *
 * O PostgREST entrega timestamptz como string ISO com fuso, por exemplo
 * "2026-09-14T22:00:00+00:00". O construtor de Date interpreta o fuso
 * corretamente, então a conversão é direta. A função existe para que a
 * conversão apareça uma vez só, com o motivo explicado, em vez de espalhada.
 */
function toDate(valor: string): Date {
  return new Date(valor);
}

/**
 * Busca as reservas que podem conflitar com o período pedido.
 *
 * A consulta é o retrato do conflito triplo: interessa qualquer reserva que
 * compartilhe o espaço OU o professor OU a turma, e que toque a mesma faixa de
 * tempo.
 *
 * O FILTRO DE PERÍODO
 *
 * starts_at < fim E ends_at > início é a mesma condição de sobreposição da
 * função overlaps em validateBooking.ts, escrita em SQL. Trazer só o que pode
 * conflitar mantém o custo da consulta constante conforme a agenda cresce;
 * trazer a base inteira funcionaria hoje e ficaria insustentável em um ano.
 *
 * Os dois lados são estritos, pelo mesmo motivo de lá: uma reserva que termina
 * exatamente quando esta começa não é candidata a conflito.
 *
 * Ainda assim, a regra reconfere cada linha devolvida. Se esta consulta um dia
 * for alterada e passar a trazer algo a mais, a decisão continua correta.
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
    // O "or" do PostgREST recebe as condições em uma string separada por
    // vírgula. Ele agrupa este bloco entre parênteses, então a expressão final
    // é (espaço OU professor OU turma) E período, que é o pretendido.
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
 * Todas as reservas que tocam o período, sem filtrar por espaço.
 *
 * Serve à tela que avalia os espaços de uma vez. Ali a pergunta não é "esta
 * sala está livre", e sim "quais estão", então filtrar por um espaço específico
 * esconderia justamente a informação que a tela precisa mostrar.
 *
 * O filtro de período continua, e é ele que mantém o custo sob controle: em uma
 * instituição com anos de histórico, o que importa são as poucas reservas que
 * disputam aquelas duas horas.
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
 * O que pode acontecer ao tentar gravar.
 *
 * "conflict" não é o mesmo que erro: significa que a validação aprovou mas o
 * banco recusou, o que só acontece quando outra reserva foi gravada entre a
 * consulta e a gravação. É a corrida que as constraints de exclusão existem
 * para pegar, e quem chama precisa distinguir esse caso de uma falha real.
 */
export type CreateBookingOutcome =
  | { status: "created"; bookingId: string }
  | {
      status: "conflict";
      code: "ROOM_CONFLICT" | "PROFESSOR_CONFLICT" | "CLASS_CONFLICT";
    }
  | { status: "error"; message: string };

/**
 * Nome da constraint no banco para o código de violação do domínio.
 *
 * Este objeto é o outro lado do acordo firmado no comentário final da migration
 * 20260904000200: os nomes das constraints são interface, e renomear uma delas
 * lá obriga a atualizar este mapa aqui.
 */
const CONSTRAINT_TO_VIOLATION = {
  bookings_no_room_overlap: "ROOM_CONFLICT",
  bookings_no_professor_overlap: "PROFESSOR_CONFLICT",
  bookings_no_class_overlap: "CLASS_CONFLICT",
} as const;

/**
 * Grava a reserva.
 *
 * Chama a função create_booking do banco em vez de dois inserts seguidos,
 * porque a gravação toca bookings e booking_resources e precisa ser atômica. O
 * raciocínio está na migration 20260907000000.
 */
export async function createBooking(input: {
  roomId: string;
  professorId: string;
  classId: string;
  purpose: string;
  startsAt: Date;
  endsAt: Date;
  resourceIds: string[];
}): Promise<CreateBookingOutcome> {
  const { data, error } = await supabaseServer.rpc("create_booking", {
    p_room_id: input.roomId,
    p_professor_id: input.professorId,
    p_class_id: input.classId,
    p_purpose: input.purpose.trim(),
    p_starts_at: input.startsAt.toISOString(),
    p_ends_at: input.endsAt.toISOString(),
    p_resource_ids: input.resourceIds,
  });

  if (!error) {
    return { status: "created", bookingId: data };
  }

  // 23P01 é o código do PostgreSQL para exclusion_violation, devolvido quando
  // uma das três constraints de sobreposição barra a gravação. É o único erro
  // esperado no funcionamento normal do sistema.
  if (error.code === "23P01") {
    // A mensagem do banco cita o nome da constraint violada. Procurar o nome
    // dentro do texto é frágil por natureza, mas é a única informação que o
    // PostgREST repassa, e os testes que comparam as duas camadas pegariam a
    // quebra caso o formato mude.
    const texto = `${error.message} ${error.details ?? ""}`;

    for (const [constraint, code] of Object.entries(CONSTRAINT_TO_VIOLATION)) {
      if (texto.includes(constraint)) {
        return { status: "conflict", code };
      }
    }

    // Constraint de exclusão desconhecida: alguém acrescentou uma no banco sem
    // atualizar o mapa acima. Melhor recusar de forma honesta do que gravar.
    return {
      status: "error",
      message: "A reserva conflita com outra já existente.",
    };
  }

  // 23514 é violação de check, hoje só o bookings_period_valid. A regra já
  // barra esse caso antes, então chegar aqui significa que algo passou por um
  // caminho que não validou.
  if (error.code === "23514") {
    return {
      status: "error",
      message: "O período informado é inválido.",
    };
  }

  // 23503 é violação de chave estrangeira: o espaço, o professor ou a turma
  // deixou de existir entre o carregamento do formulário e o envio.
  if (error.code === "23503") {
    return {
      status: "error",
      message:
        "Espaço, professor ou turma não existe mais. Recarregue a página e tente de novo.",
    };
  }

  // Erro não previsto. A mensagem do PostgreSQL fica no log do servidor, e o
  // usuário recebe um texto genérico.
  //
  // A diferença importa: mensagens do banco citam nomes de tabela, de coluna e
  // de constraint. Devolvê-las à tela entrega o desenho interno do sistema a
  // quem estiver olhando, e não ajuda em nada quem só queria reservar uma sala.
  //
  // Repare que os "throw" espalhados neste arquivo continuam carregando o
  // detalhe, e isso é intencional: exceção não tratada em Server Action é
  // substituída pelo Next por uma mensagem neutra com um identificador, e o
  // texto completo só aparece no log. O caso perigoso é este aqui, um retorno
  // normal da função, que chega à interface exatamente como foi escrito.
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
 * Lista as reservas que ainda não terminaram.
 *
 * O corte é por ends_at, e não por starts_at: uma aula que começou há dez
 * minutos ainda está acontecendo e precisa aparecer na grade.
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
    // Dois níveis de aninhamento: booking_resources é a tabela de ligação, e o
    // nome está em resources, do outro lado dela. O PostgREST atravessa as duas
    // em uma consulta só.
    resourceNames: linha.booking_resources.map(
      (vinculo) => vinculo.resources.name
    ),
  }));
}
