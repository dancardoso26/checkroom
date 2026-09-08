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
import { combineDateTime } from "@/lib/datetime";

/**
 * ANÁLISE PRÉVIA DE UM PEDIDO DE RESERVA
 *
 * Server Action de LEITURA. Ela não grava nada: responde o que aconteceria se o
 * pedido fosse enviado agora.
 *
 * É o que alimenta os passos intermediários do formulário. Ao escolher data e
 * horário, o professor já vê se ele próprio ou a turma estão comprometidos. Ao
 * chegar na escolha do espaço, vê quais servem e por que os outros não.
 *
 * POR QUE NO SERVIDOR, E NÃO NO NAVEGADOR
 *
 * A regra é uma função pura e rodaria no navegador sem alteração nenhuma. O que
 * não pode ir para lá é o insumo: responder "quais espaços estão livres" exige
 * a agenda daquele período, e mandá-la ao cliente significaria expor as
 * reservas de todo mundo para quem apenas abriu o formulário.
 *
 * Aqui o servidor consulta, decide e devolve só o veredito.
 *
 * ESTA FUNÇÃO NÃO SUBSTITUI A VALIDAÇÃO DO ENVIO
 *
 * O que ela mostra é uma fotografia, e a agenda muda. Entre ver "laboratório
 * disponível" e clicar em confirmar podem passar minutos. Por isso criarReserva
 * refaz a validação inteira, e o banco ainda tem a palavra final através das
 * constraints de exclusão.
 */

const schema = z.object({
  professorId: z.uuid(),
  classId: z.uuid(),
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

  const [classGroup, rooms, resources, bookings] = await Promise.all([
    findClassSnapshot(dados.classId),
    listRooms(),
    listResources(),
    // Quando o período está invertido, o intervalo consultado é vazio e a
    // consulta não traz nada. Isso não é problema: a regra recusa por
    // INVALID_PERIOD antes de qualquer comparação de sobreposição.
    findBookingsInPeriod({ startsAt, endsAt }),
  ]);

  const resourceNames = toResourceNameMap(resources);

  // O pedido sem espaço e sem finalidade: nenhum dos dois participa das
  // verificações que esta tela mostra. A finalidade é obrigatória no envio, e
  // um texto qualquer aqui evitaria uma violação que confundiria a lista.
  const pedido = {
    professorId: dados.professorId,
    classId: dados.classId,
    purpose: "análise",
    startsAt,
    endsAt,
    requiredResourceIds: dados.resourceIds,
  };

  const contexto = {
    classGroup,
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
