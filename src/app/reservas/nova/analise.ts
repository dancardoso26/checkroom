"use server";

import { z } from "zod";

import { evaluateRooms, findScheduleConflicts } from "@/domain/booking/evaluateRooms";
import { describeViolations } from "@/domain/booking/messages";

import { findClassSnapshot } from "@/lib/repositories/classRepository";
import { listRooms } from "@/lib/repositories/roomRepository";
import {
  listResources,
  toResourceNameMap,
} from "@/lib/repositories/resourceRepository";
import { findBookingsInPeriod } from "@/lib/repositories/bookingRepository";
import { findTeachingAssignment } from "@/lib/repositories/subjectRepository";
import { PERIODO_LETIVO_VIGENTE } from "@/domain/booking/businessHours";
import { combineDateTime } from "@/lib/datetime";

/**
 * Server Action de leitura: responde o que aconteceria se o pedido fosse enviado
 * agora. É o que alimenta as etapas intermediárias do formulário.
 *
 * Roda no servidor porque o insumo não pode ir ao navegador: responder "quais
 * espaços estão livres" exige a agenda do período, e mandá-la ao cliente exporia
 * as reservas de todo mundo a quem apenas abriu o formulário.
 *
 * Não substitui a validação do envio. O que ela mostra é uma fotografia, e entre
 * vê-la e confirmar podem passar minutos.
 */

const schema = z.object({
  professorId: z.uuid(),
  classId: z.uuid(),
  subjectId: z.union([z.uuid(), z.literal("")]).transform((v) => v || null),
  activityType: z.enum(["class", "lecture", "exam", "defense", "event"]),
  date: z.iso.date(),
  startTime: z.iso.time(),
  endTime: z.iso.time(),
  resourceIds: z.array(z.uuid()),
});

export type AnaliseInput = z.infer<typeof schema>;

/** O veredito para um espaço, no formato que a lista da tela consome. */
export type RoomVerdict = {
  roomId: string;
  compatible: boolean;
  /** Motivos ligados a este espaço, já em português. Vazio quando compatível. */
  motivos: string[];
};

export type AnaliseResult =
  | {
      status: "ok";
      /**
       * Problemas que valem para todos os espaços: professor ocupado, turma
       * ocupada, período inválido. Aparecem uma vez só, fora da lista.
       */
      scheduleMessages: string[];
      rooms: RoomVerdict[];
    }
  | { status: "invalid"; message: string };

export async function analisarReserva(
  input: AnaliseInput
): Promise<AnaliseResult> {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "invalid",
      message: "Preencha turma, professor, data e horário para ver os espaços.",
    };
  }

  const dados = parsed.data;
  const startsAt = combineDateTime(dados.date, dados.startTime);
  const endsAt = combineDateTime(dados.date, dados.endTime);

  const [classGroup, rooms, resources, teachingAssignment, bookings] =
    await Promise.all([
    findClassSnapshot(dados.classId),
    listRooms(),
    listResources(),
    findTeachingAssignment({
      professorId: dados.professorId,
      subjectId: dados.subjectId,
      classId: dados.classId,
      term: PERIODO_LETIVO_VIGENTE,
    }),
    // Período invertido produz intervalo vazio e consulta sem resultado. A regra
    // recusa por INVALID_PERIOD antes de comparar sobreposição.
    findBookingsInPeriod({ startsAt, endsAt }),
  ]);

  const resourceNames = toResourceNameMap(resources);

  // A finalidade é obrigatória no envio, mas não participa desta análise: um
  // texto qualquer evita uma violação que confundiria a lista.
  const pedido = {
    professorId: dados.professorId,
    classId: dados.classId,
    subjectId: dados.subjectId,
    activityType: dados.activityType,
    purpose: "análise",
    startsAt,
    endsAt,
    requiredResourceIds: dados.resourceIds,
  };

  const contexto = {
    classGroup,
    teachingAssignment,
    conflictingBookings: bookings,
    now: new Date(),
  };

  const avaliacoes = evaluateRooms(pedido, rooms, contexto);
  const conflitos = findScheduleConflicts(pedido, contexto);

  return {
    status: "ok",
    scheduleMessages: describeViolations(conflitos, { resourceNames }),
    rooms: avaliacoes.map((avaliacao) => ({
      roomId: avaliacao.room.id,
      compatible: avaliacao.compatible,
      motivos: describeViolations(avaliacao.violations, { resourceNames }),
    })),
  };
}
