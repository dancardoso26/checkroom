import { validateBooking } from "./validateBooking";
import type {
  BookingContext,
  BookingRequest,
  BookingViolation,
  RoomSnapshot,
} from "./types";

/**
 * Responde "quais espaços servem, e por que os outros não", em vez de recusar
 * uma escolha já feita.
 *
 * Não reimplementa verificação nenhuma: chama validateBooking uma vez por
 * espaço e agrupa. Isso só é barato porque a regra é pura, e é o que garante que
 * esta lista nunca discorde da recusa final. Com a regra acoplada ao banco,
 * seria uma consulta por sala ou uma segunda implementação em SQL.
 */

export type RoomEvaluation = {
  room: RoomSnapshot;
  /** Verdadeiro quando este espaço atende ao pedido. */
  compatible: boolean;
  /**
   * Só os motivos ligados ao espaço. Conflito de professor e de turma valem para
   * todos igualmente, e repeti-los em cada cartão sugeriria que trocar de sala
   * resolveria, quando o que resolve é trocar de horário.
   */
  violations: BookingViolation[];
};

/** Violações que dependem do espaço escolhido. */
const VIOLACOES_DO_ESPACO = new Set<BookingViolation["code"]>([
  "ROOM_CONFLICT",
  "INSUFFICIENT_CAPACITY",
  "MISSING_RESOURCES",
  "ROOM_NOT_FOUND",
]);

export function evaluateRooms(
  /** Sem o espaço: ele é justamente o que está sendo decidido. */
  request: Omit<BookingRequest, "roomId">,
  rooms: RoomSnapshot[],
  /** O contexto sem o espaço, pela mesma razão. */
  context: Omit<BookingContext, "room">
): RoomEvaluation[] {
  const avaliacoes = rooms.map((room) => {
    const resultado = validateBooking(
      { ...request, roomId: room.id },
      { ...context, room }
    );

    const violations = resultado.valid
      ? []
      : resultado.violations.filter((v) => VIOLACOES_DO_ESPACO.has(v.code));

    return {
      room,
      // A compatibilidade olha o veredito completo, e não a lista filtrada.
      // Um espaço não vira compatível só porque o motivo da recusa foi
      // escondido da lista.
      compatible: resultado.valid,
      violations,
    };
  });

  return ordenar(avaliacoes);
}

/**
 * Compatíveis primeiro e, entre eles, o de menor sobra de lugares. Ocupar o
 * auditório com 38 alunos o torna indisponível para o evento de 100 que viria
 * depois, e reduzir esse desperdício é o motivo do sistema existir.
 */
function ordenar(avaliacoes: RoomEvaluation[]): RoomEvaluation[] {
  return [...avaliacoes].sort((a, b) => {
    if (a.compatible !== b.compatible) {
      return a.compatible ? -1 : 1;
    }

    if (a.compatible && b.compatible) {
      return a.room.capacity - b.room.capacity;
    }

    return (
      a.room.building.localeCompare(b.room.building, "pt-BR") ||
      a.room.name.localeCompare(b.room.name, "pt-BR", { numeric: true })
    );
  });
}

/**
 * Os conflitos que valem para a lista inteira, exibidos uma vez só acima dos
 * cartões. Verifica contra um espaço fictício que nunca conflita, para que só
 * sobrem as violações de professor e turma.
 */
export function findScheduleConflicts(
  request: Omit<BookingRequest, "roomId">,
  context: Omit<BookingContext, "room">
): BookingViolation[] {
  const espacoNeutro: RoomSnapshot = {
    id: "__nenhum__",
    name: "",
    building: "",
    // Capacidade e recursos suficientes para qualquer pedido, de modo que
    // nenhuma violação de compatibilidade apareça e mascare o que interessa.
    capacity: Number.MAX_SAFE_INTEGER,
    resourceIds: [...request.requiredResourceIds],
  };

  const resultado = validateBooking(
    { ...request, roomId: espacoNeutro.id },
    { ...context, room: espacoNeutro }
  );

  if (resultado.valid) return [];

  return resultado.violations.filter((v) => !VIOLACOES_DO_ESPACO.has(v.code));
}
