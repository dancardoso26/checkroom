import { validateBooking } from "./validateBooking";
import type {
  BookingContext,
  BookingRequest,
  BookingViolation,
  RoomSnapshot,
} from "./types";

export type RoomEvaluation = {
  room: RoomSnapshot;
  /** Verdadeiro quando este espaço atende ao pedido. */
  compatible: boolean;
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
      compatible: resultado.valid,
      violations,
    };
  });

  return ordenar(avaliacoes);
}

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
