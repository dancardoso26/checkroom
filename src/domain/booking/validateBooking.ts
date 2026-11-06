import { localDayKey, localMinutesOfDay } from "@/lib/datetime";
import {
  ABERTURA,
  ABERTURA_EM_MINUTOS,
  FECHAMENTO,
  FECHAMENTO_EM_MINUTOS,
  PERIODO_LETIVO_VIGENTE,
} from "./businessHours";
import type {
  BookingContext,
  BookingRequest,
  BookingValidationResult,
  BookingViolation,
  ExistingBooking,
} from "./types";

export function overlaps(
  a: { startsAt: Date; endsAt: Date },
  b: { startsAt: Date; endsAt: Date }
): boolean {
  return a.startsAt < b.endsAt && a.endsAt > b.startsAt;
}

export function dentroDoExpediente(request: {
  startsAt: Date;
  endsAt: Date;
}): boolean {
  if (localDayKey(request.startsAt) !== localDayKey(request.endsAt)) {
    return false;
  }

  const inicio = localMinutesOfDay(request.startsAt);
  const fim = localMinutesOfDay(request.endsAt);

  return inicio >= ABERTURA_EM_MINUTOS && fim <= FECHAMENTO_EM_MINUTOS;
}

export function validateBooking(
  request: BookingRequest,
  context: BookingContext
): BookingValidationResult {
  const violations: BookingViolation[] = [];

  const hasValidPeriod = request.endsAt > request.startsAt;

  if (!hasValidPeriod) {
    violations.push({ code: "INVALID_PERIOD" });
  }

  if (request.purpose.trim().length === 0) {
    violations.push({ code: "EMPTY_PURPOSE" });
  }

  if (context.room === null) {
    violations.push({ code: "ROOM_NOT_FOUND" });
  }

  if (context.classGroup === null) {
    violations.push({ code: "CLASS_NOT_FOUND" });
  }

  if (request.startsAt < context.now) {
    violations.push({ code: "STARTS_IN_THE_PAST" });
  }

  if (hasValidPeriod && !dentroDoExpediente(request)) {
    violations.push({
      code: "OUTSIDE_BUSINESS_HOURS",
      opening: ABERTURA,
      closing: FECHAMENTO,
    });
  }

  const calendario = context.calendario;

  if (calendario) {
    if (calendario.periodo === null) {
      violations.push({ code: "OUTSIDE_ACADEMIC_TERM" });
    }

    for (const bloqueio of calendario.bloqueios) {
      if (bloqueio.espacoId === null) {
        violations.push({ code: "DATE_BLOCKED", reason: bloqueio.motivo });
      }
    }
  }

  if (!hasValidPeriod || context.room === null || context.classGroup === null) {
    return { valid: false, violations };
  }

  const room = context.room;
  const classGroup = context.classGroup;

  let roomConflict: ExistingBooking | undefined;
  let professorConflict: ExistingBooking | undefined;
  let classConflict: ExistingBooking | undefined;

  for (const existing of context.conflictingBookings) {
    if (!overlaps(request, existing)) continue;

    if (!roomConflict && existing.roomId === request.roomId) {
      roomConflict = existing;
    }

    if (!professorConflict && existing.professorId === request.professorId) {
      professorConflict = existing;
    }

    if (!classConflict && existing.classId === request.classId) {
      classConflict = existing;
    }
  }

  if (roomConflict) {
    violations.push({ code: "ROOM_CONFLICT", conflict: roomConflict });
  }

  const bloqueioDoEspaco = calendario?.bloqueios.find(
    (bloqueio) => bloqueio.espacoId === request.roomId
  );

  if (bloqueioDoEspaco) {
    violations.push({ code: "ROOM_BLOCKED", reason: bloqueioDoEspaco.motivo });
  }

  if (professorConflict) {
    violations.push({ code: "PROFESSOR_CONFLICT", conflict: professorConflict });
  }

  if (classConflict) {
    violations.push({ code: "CLASS_CONFLICT", conflict: classConflict });
  }

  if (request.activityType === "class") {
    if (request.subjectId === null) {
      violations.push({ code: "SUBJECT_REQUIRED" });
    } else if (context.teachingAssignment === null) {
      violations.push({
        code: "NO_TEACHING_ASSIGNMENT",
        term: calendario?.periodo?.codigo ?? PERIODO_LETIVO_VIGENTE,
      });
    }
  }

  if (classGroup.studentCount > room.capacity) {
    violations.push({
      code: "INSUFFICIENT_CAPACITY",
      capacity: room.capacity,
      studentCount: classGroup.studentCount,
    });
  }

  const offered = new Set(room.resourceIds);

  const missingResourceIds = [...new Set(request.requiredResourceIds)].filter(
    (resourceId) => !offered.has(resourceId)
  );

  if (missingResourceIds.length > 0) {
    violations.push({ code: "MISSING_RESOURCES", missingResourceIds });
  }

  if (violations.length > 0) {
    return { valid: false, violations };
  }

  return { valid: true };
}
