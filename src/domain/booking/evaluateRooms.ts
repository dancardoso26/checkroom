import { validateBooking } from "./validateBooking";
import type {
  BookingContext,
  BookingRequest,
  BookingViolation,
  RoomSnapshot,
} from "./types";

export type RoomEvaluation = {
  room: RoomSnapshot;
  compatible: boolean;
  violations: BookingViolation[];
};

const VIOLACOES_DO_ESPACO = new Set<BookingViolation["code"]>([
  "ROOM_CONFLICT",
  "INSUFFICIENT_CAPACITY",
  "MISSING_RESOURCES",
  "ROOM_NOT_FOUND",
  "ROOM_BLOCKED",
]);

export function evaluateRooms(
  request: Omit<BookingRequest, "roomId">,
  rooms: RoomSnapshot[],
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
