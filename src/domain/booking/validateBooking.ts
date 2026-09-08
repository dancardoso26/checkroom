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

/**
 * A regra de negócio do CheckRoom.
 *
 * Função pura: não consulta o banco, não lê o relógio e não conhece HTTP. O
 * contexto chega pronto, e o instante presente vem em context.now. É isso que
 * permite testá-la sem infraestrutura e reaproveitá-la em outros pontos de
 * entrada, conforme as seções 2.2 e 2.6 da monografia.
 *
 * Ela julga o pedido contra uma fotografia do banco, então não protege de duas
 * gravações simultâneas. Quem faz isso são as constraints de exclusão da
 * migration 20260904000200: aqui nasce a explicação, no banco a garantia.
 */

/**
 * Comparação estrita nos dois lados, o que faz aulas consecutivas conviverem:
 * 19h-20h40 e 20h40-22h20 não conflitam.
 *
 * É a mesma semântica do tstzrange [início, fim) usado nas constraints. Se as
 * duas divergissem, o formulário aceitaria o que o banco recusa.
 */
function overlaps(
  a: { startsAt: Date; endsAt: Date },
  b: { startsAt: Date; endsAt: Date }
): boolean {
  return a.startsAt < b.endsAt && a.endsAt > b.startsAt;
}

/**
 * Três condições: começar após a abertura, terminar antes do fechamento e as
 * duas pontas caírem no mesmo dia. Sem a terceira, uma reserva das 21h às 8h do
 * dia seguinte passaria com o prédio fechado no meio dela.
 *
 * Usa minutos no fuso de São Paulo em vez de getHours(), que leria o fuso do
 * servidor e responderia outro dia para uma aula noturna.
 */
function dentroDoExpediente(request: {
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

/**
 * Devolve TODAS as violações, e não apenas a primeira: recusar por um motivo de
 * cada vez transforma o formulário em adivinhação.
 */
export function validateBooking(
  request: BookingRequest,
  context: BookingContext
): BookingValidationResult {
  const violations: BookingViolation[] = [];

  // 1. Verificações estruturais: o pedido faz sentido em si mesmo?

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

  // Só faz sentido com o período coerente: em uma reserva invertida o "início" é
  // o fim, e INVALID_PERIOD já descreve o problema.
  if (hasValidPeriod && !dentroDoExpediente(request)) {
    violations.push({
      code: "OUTSIDE_BUSINESS_HOURS",
      opening: ABERTURA,
      closing: FECHAMENTO,
    });
  }

  // 2. Parada antecipada.
  //
  // Sem período válido não há o que sobrepor, e sem espaço ou turma não há o que
  // comparar. Seguir produziria um "nenhum conflito encontrado" que na verdade
  // significa "não foi possível verificar".
  if (!hasValidPeriod || context.room === null || context.classGroup === null) {
    return { valid: false, violations };
  }

  const room = context.room;
  const classGroup = context.classGroup;

  // 3. Conflito triplo: espaço, professor e turma só podem estar em um lugar por
  // vez. Cada categoria é reportada uma única vez, porque as três exigem
  // correções diferentes e repetir a mesma não acrescenta nada.

  let roomConflict: ExistingBooking | undefined;
  let professorConflict: ExistingBooking | undefined;
  let classConflict: ExistingBooking | undefined;

  for (const existing of context.conflictingBookings) {
    // O repositório já filtra por período, mas a regra reconfere: ela não
    // terceiriza a própria decisão.
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

  if (professorConflict) {
    violations.push({ code: "PROFESSOR_CONFLICT", conflict: professorConflict });
  }

  if (classConflict) {
    violations.push({ code: "CLASS_CONFLICT", conflict: classConflict });
  }

  // 4. Vínculo acadêmico.
  //
  // É a verificação que torna o modelo exclusivo de educação: uma agenda de
  // consultórios ou de coworking não tem onde encaixar a relação entre docente,
  // disciplina e turma.
  //
  // O tipo da atividade decide se ela se aplica. Aula exige disciplina, e a
  // disciplina exige vínculo; palestra, prova, defesa e evento não pertencem a
  // disciplina nenhuma. Antes do tipo existir, a exigência dependia de o campo
  // vir preenchido, e bastava deixá-lo vazio para contorná-la.
  if (request.activityType === "class") {
    if (request.subjectId === null) {
      violations.push({ code: "SUBJECT_REQUIRED" });
    } else if (context.teachingAssignment === null) {
      violations.push({
        code: "NO_TEACHING_ASSIGNMENT",
        term: PERIODO_LETIVO_VIGENTE,
      });
    }
  }

  // 5. Compatibilidade com o espaço. Ao contrário dos conflitos, seria verdadeira
  // mesmo com a agenda vazia.

  if (classGroup.studentCount > room.capacity) {
    violations.push({
      code: "INSUFFICIENT_CAPACITY",
      capacity: room.capacity,
      studentCount: classGroup.studentCount,
    });
  }

  const offered = new Set(room.resourceIds);

  // O Set na entrada evita que um recurso enviado duas vezes apareça duplicado
  // na mensagem de erro.
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
