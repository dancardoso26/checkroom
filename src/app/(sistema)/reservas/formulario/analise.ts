"use server";

import { z } from "zod";

import {
  evaluateRooms,
  findScheduleConflicts,
} from "@/domain/booking/evaluateRooms";
import { describeViolations } from "@/domain/booking/messages";
import type { BookingViolation } from "@/domain/booking/types";

import { findClassSnapshot } from "@/lib/repositories/repositorio-de-turmas";
import { listRooms } from "@/lib/repositories/repositorio-de-espacos";
import {
  listResources,
  toResourceNameMap,
} from "@/lib/repositories/repositorio-de-recursos";
import { findBookingsInPeriod } from "@/lib/repositories/repositorio-de-reservas";
import { findTeachingAssignment } from "@/lib/repositories/repositorio-de-disciplinas";
import { PERIODO_LETIVO_VIGENTE } from "@/domain/booking/businessHours";
import { combineDateTime } from "@/lib/datetime";
import { carregarCalendarioDoDia } from "@/lib/repositories/repositorio-do-calendario";
import {
  podeCadastrarPalestra,
  podeReservarPara,
} from "@/domain/auth/permissoes";
import { exigirSessao } from "@/lib/sessao";

const schema = z.object({
  professorId: z.uuid(),
  classId: z.uuid(),
  subjectId: z.union([z.uuid(), z.literal("")]).transform((v) => v || null),
  activityType: z.enum(["class", "lecture", "exam", "event"]),
  date: z.iso.date(),
  startTime: z.iso.time(),
  endTime: z.iso.time(),
  resourceIds: z.array(z.uuid()),
});

export type AnaliseInput = z.infer<typeof schema>;

export type RoomVerdict = {
  roomId: string;
  compatible: boolean;
  motivos: string[];
};

export type AnaliseResult =
  | {
      status: "ok";
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

  const sessao = await exigirSessao();
  if (!podeReservarPara(sessao, dados.professorId)) {
    return {
      status: "invalid",
      message: "Você só pode registrar reservas em seu próprio nome.",
    };
  }

  const startsAt = combineDateTime(dados.date, dados.startTime);
  const endsAt = combineDateTime(dados.date, dados.endTime);

  const calendario = await carregarCalendarioDoDia(dados.date);

  const [classGroup, rooms, resources, teachingAssignment, bookings] =
    await Promise.all([
      findClassSnapshot(dados.classId),
      listRooms(),
      listResources(),
      findTeachingAssignment({
        professorId: dados.professorId,
        subjectId: dados.subjectId,
        classId: dados.classId,
        term: calendario.periodo?.codigo ?? PERIODO_LETIVO_VIGENTE,
      }),
      findBookingsInPeriod({ startsAt, endsAt }),
    ]);

  const resourceNames = toResourceNameMap(resources);

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
    calendario,
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

const schemaDaPalestra = z.object({
  date: z.iso.date(),
  startTime: z.iso.time(),
  endTime: z.iso.time(),
  vagas: z.number().int().positive(),
  resourceIds: z.array(z.uuid()),
});

export type AnaliseDaPalestraInput = z.infer<typeof schemaDaPalestra>;

const PUBLICO_DA_PALESTRA = "__palestra__";

export async function analisarPalestra(
  input: AnaliseDaPalestraInput
): Promise<AnaliseResult> {
  const parsed = schemaDaPalestra.safeParse(input);

  if (!parsed.success) {
    return {
      status: "invalid",
      message: "Preencha data, horário e vagas para ver os espaços.",
    };
  }

  const sessao = await exigirSessao();
  if (!podeCadastrarPalestra(sessao)) {
    return {
      status: "invalid",
      message: "Apenas a administração cadastra palestras.",
    };
  }

  const dados = parsed.data;
  const startsAt = combineDateTime(dados.date, dados.startTime);
  const endsAt = combineDateTime(dados.date, dados.endTime);

  const [calendario, rooms, resources, bookings] = await Promise.all([
    carregarCalendarioDoDia(dados.date),
    listRooms(),
    listResources(),
    findBookingsInPeriod({ startsAt, endsAt }),
  ]);

  const resourceNames = toResourceNameMap(resources);

  const descrever = (violacoes: BookingViolation[]) =>
    violacoes.map((v) =>
      v.code === "INSUFFICIENT_CAPACITY"
        ? `O espaço comporta ${v.capacity} pessoas e a palestra tem ${v.studentCount} vagas.`
        : describeViolations([v], { resourceNames })[0]
    );

  const pedido = {
    professorId: PUBLICO_DA_PALESTRA,
    classId: PUBLICO_DA_PALESTRA,
    subjectId: null,
    activityType: "lecture" as const,
    purpose: "análise",
    startsAt,
    endsAt,
    requiredResourceIds: dados.resourceIds,
  };

  const contexto = {
    classGroup: {
      id: PUBLICO_DA_PALESTRA,
      name: "Palestra",
      studentCount: dados.vagas,
    },
    teachingAssignment: null,
    conflictingBookings: bookings,
    now: new Date(),
    calendario,
  };

  return {
    status: "ok",
    scheduleMessages: descrever(findScheduleConflicts(pedido, contexto)),
    rooms: evaluateRooms(pedido, rooms, contexto).map((avaliacao) => ({
      roomId: avaliacao.room.id,
      compatible: avaliacao.compatible,
      motivos: descrever(avaliacao.violations),
    })),
  };
}
