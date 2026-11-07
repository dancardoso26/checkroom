"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { combineDateTime } from "@/lib/datetime";

import { validateBooking } from "@/domain/booking/validateBooking";
import { describeViolations } from "@/domain/booking/messages";
import type { BookingRequest } from "@/domain/booking/types";

import { findRoomSnapshot } from "@/lib/repositories/repositorio-de-espacos";
import { findClassSnapshot } from "@/lib/repositories/repositorio-de-turmas";
import {
  listResources,
  toResourceNameMap,
} from "@/lib/repositories/repositorio-de-recursos";
import {
  createBooking,
  findConflictCandidates,
} from "@/lib/repositories/repositorio-de-reservas";
import { findTeachingAssignment } from "@/lib/repositories/repositorio-de-disciplinas";
import { PERIODO_LETIVO_VIGENTE } from "@/domain/booking/businessHours";
import { carregarCalendarioDoDia } from "@/lib/repositories/repositorio-do-calendario";
import { exigirSessao } from "@/lib/sessao";
import { notificarProfessor } from "./notificar";
import { podeReservarPara } from "@/domain/auth/permissoes";

const schema = z.object({
  roomId: z.uuid("Selecione um espaço."),
  professorId: z.uuid("Selecione um professor."),
  classId: z.uuid("Selecione uma turma."),
  activityType: z.enum(["class", "exam", "event"], {
    error: "Palestras são cadastradas como palestra, não como reserva.",
  }),
  subjectId: z.union([z.uuid(), z.literal("")]).transform((v) => v || null),
  purpose: z
    .string()
    .trim()
    .min(1, "Informe a finalidade da reserva.")
    .max(200, "A finalidade deve ter no máximo 200 caracteres."),
  date: z.iso.date("Informe a data."),
  startTime: z.iso.time("Informe o horário de início."),
  endTime: z.iso.time("Informe o horário de término."),
  resourceIds: z.array(z.uuid()),
});

function texto(valor: FormDataEntryValue | null): string {
  return typeof valor === "string" ? valor : "";
}

export type BookingFormState =
  | { status: "idle" }
  | { status: "success"; bookingId: string }
  | {
      status: "error";
      messages: string[];
      fieldErrors: Record<string, string[]>;
      values: SubmittedValues;
    };

export type SubmittedValues = {
  roomId: string;
  professorId: string;
  classId: string;
  activityType: string;
  subjectId: string;
  purpose: string;
  date: string;
  startTime: string;
  endTime: string;
  resourceIds: string[];
};

function erro(
  values: SubmittedValues,
  messages: string[],
  fieldErrors: Record<string, string[]> = {}
): BookingFormState {
  return { status: "error", messages, fieldErrors, values };
}

export async function criarReserva(
  _prevState: BookingFormState,
  formData: FormData
): Promise<BookingFormState> {
  const values: SubmittedValues = {
    roomId: texto(formData.get("roomId")),
    professorId: texto(formData.get("professorId")),
    classId: texto(formData.get("classId")),
    activityType: texto(formData.get("activityType")),
    subjectId: texto(formData.get("subjectId")),
    purpose: texto(formData.get("purpose")),
    date: texto(formData.get("date")),
    startTime: texto(formData.get("startTime")),
    endTime: texto(formData.get("endTime")),
    resourceIds: formData.getAll("resourceIds").map(texto),
  };

  const parsed = schema.safeParse(values);

  if (!parsed.success) {
    return erro(values, [], z.flattenError(parsed.error).fieldErrors);
  }

  const input = parsed.data;
  const sessao = await exigirSessao();

  if (!podeReservarPara(sessao, input.professorId)) {
    return erro(values, [
      "Você só pode registrar reservas em seu próprio nome.",
    ]);
  }

  const request: BookingRequest = {
    roomId: input.roomId,
    professorId: input.professorId,
    classId: input.classId,
    activityType: input.activityType,
    subjectId: input.subjectId,
    purpose: input.purpose,
    startsAt: combineDateTime(input.date, input.startTime),
    endsAt: combineDateTime(input.date, input.endTime),
    requiredResourceIds: input.resourceIds,
  };

  const calendario = await carregarCalendarioDoDia(input.date);

  const [room, classGroup, conflictingBookings, resources, teachingAssignment] =
    await Promise.all([
      findRoomSnapshot(request.roomId),
      findClassSnapshot(request.classId),
      findConflictCandidates(request),
      listResources(),
      findTeachingAssignment({
        professorId: request.professorId,
        subjectId: request.subjectId,
        classId: request.classId,
        term: calendario.periodo?.codigo ?? PERIODO_LETIVO_VIGENTE,
      }),
    ]);

  const resourceNames = toResourceNameMap(resources);

  const now = new Date();

  const veredito = validateBooking(request, {
    room,
    classGroup,
    teachingAssignment,
    conflictingBookings,
    now,
    calendario,
  });

  if (!veredito.valid) {
    return erro(
      values,
      describeViolations(veredito.violations, { resourceNames })
    );
  }

  const resultado = await createBooking({
    roomId: request.roomId,
    professorId: request.professorId,
    classId: request.classId,
    activityType: request.activityType,
    subjectId: request.subjectId,
    purpose: request.purpose,
    startsAt: request.startsAt,
    endsAt: request.endsAt,
    resourceIds: [...new Set(request.requiredResourceIds)],
    createdBy: sessao.profileId,
  });

  if (resultado.status === "conflict") {
    const conflitosAtuais = await findConflictCandidates(request);

    const revalidacao = validateBooking(request, {
      room,
      classGroup,
      teachingAssignment,
      conflictingBookings: conflitosAtuais,
      now,
      calendario,
    });

    if (!revalidacao.valid) {
      return erro(
        values,
        describeViolations(revalidacao.violations, { resourceNames })
      );
    }

    return erro(values, [
      "Outra reserva foi criada ao mesmo tempo e ocupou este horário. Tente enviar novamente.",
    ]);
  }

  if (resultado.status === "error") {
    return erro(values, [resultado.message]);
  }

  await notificarProfessor(resultado.bookingId, "nova", sessao.nome);

  revalidatePath("/reservas");

  return { status: "success", bookingId: resultado.bookingId };
}
