"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { combineDateTime } from "@/lib/datetime";

import { validateBooking } from "@/domain/booking/validateBooking";
import { describeViolations } from "@/domain/booking/messages";
import type { BookingRequest } from "@/domain/booking/types";

import { findRoomSnapshot } from "@/lib/repositories/roomRepository";
import { findClassSnapshot } from "@/lib/repositories/classRepository";
import {
  listResources,
  toResourceNameMap,
} from "@/lib/repositories/resourceRepository";
import {
  createBooking,
  findConflictCandidates,
} from "@/lib/repositories/bookingRepository";
import { findTeachingAssignment } from "@/lib/repositories/subjectRepository";
import { PERIODO_LETIVO_VIGENTE } from "@/domain/booking/businessHours";

const schema = z.object({
  roomId: z.uuid("Selecione um espaço."),
  professorId: z.uuid("Selecione um professor."),
  classId: z.uuid("Selecione uma turma."),
  activityType: z.enum(["class", "lecture", "exam", "defense", "event"]),
  // Opcional: nem toda atividade é aula. O campo vem vazio em defesa de TCC ou
  // seminário, e o Zod converte a string vazia em null.
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
      /** Problemas gerais, já em português, prontos para exibir. */
      messages: string[];
      /** Problemas ligados a um campo específico, para exibir junto dele. */
      fieldErrors: Record<string, string[]>;
      values: SubmittedValues;
    };

/** Os campos do formulário em forma de texto, como o navegador os enviou. */
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
  // 1. Forma. Os valores brutos são extraídos antes de validar, porque são eles
  // que voltam à tela em caso de recusa.
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
    // getAll: get devolveria só a primeira caixa marcada.
    resourceIds: formData.getAll("resourceIds").map(texto),
  };

  const parsed = schema.safeParse(values);

  if (!parsed.success) {
    return erro(values, [], z.flattenError(parsed.error).fieldErrors);
  }

  const input = parsed.data;

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

  // 2. Regra. As quatro consultas são independentes, então rodam em paralelo.

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
        term: PERIODO_LETIVO_VIGENTE,
      }),
    ]);

  const resourceNames = toResourceNameMap(resources);

  // Capturado uma vez, para que duas verificações da mesma chamada não usem
  // instantes diferentes.
  const now = new Date();

  const veredito = validateBooking(request, {
    room,
    classGroup,
    teachingAssignment,
    conflictingBookings,
    now,
  });

  if (!veredito.valid) {
    return erro(values, describeViolations(veredito.violations, { resourceNames }));
  }

  // 3. Integridade.

  const resultado = await createBooking({
    roomId: request.roomId,
    professorId: request.professorId,
    classId: request.classId,
    activityType: request.activityType,
    subjectId: request.subjectId,
    purpose: request.purpose,
    startsAt: request.startsAt,
    endsAt: request.endsAt,
    // O pedido original pode ter duplicatas, que violariam a chave primária.
    resourceIds: [...new Set(request.requiredResourceIds)],
  });

  if (resultado.status === "conflict") {
    const conflitosAtuais = await findConflictCandidates(request);

    const revalidacao = validateBooking(request, {
      room,
      classGroup,
      teachingAssignment,
      conflictingBookings: conflitosAtuais,
      now,
    });

    if (!revalidacao.valid) {
      return erro(
        values,
        describeViolations(revalidacao.violations, { resourceNames })
      );
    }

    // A concorrente foi removida depois de causar a recusa. Raro, mas o usuário
    // precisa saber que basta tentar de novo.
    return erro(values, [
      "Outra reserva foi criada ao mesmo tempo e ocupou este horário. Tente enviar novamente.",
    ]);
  }

  if (resultado.status === "error") {
    return erro(values, [resultado.message]);
  }

  // Sem revalidatePath a listagem continuaria servindo a versão em cache, e a
  // reserva só apareceria após recarregar a página à mão.
  revalidatePath("/reservas");

  return { status: "success", bookingId: resultado.bookingId };
}
