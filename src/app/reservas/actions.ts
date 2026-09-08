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

/**
 * SERVER ACTION DE CRIAÇÃO DE RESERVA
 *
 * A diretiva "use server" no topo marca este arquivo como código que só executa
 * no servidor. O Next.js gera automaticamente o endpoint HTTP e o cliente que o
 * chama; o formulário apenas passa a função para o atributo action.
 *
 * O QUE ESTE ARQUIVO FAZ, E O QUE DELIBERADAMENTE NÃO FAZ
 *
 * Ele orquestra. Recebe o formulário, valida o formato dos campos, pede os
 * dados aos repositórios, entrega tudo à regra de negócio, e traduz o veredito
 * em algo que a tela mostre.
 *
 * O que ele não faz é decidir. Nenhuma comparação de horário, capacidade ou
 * recurso acontece aqui: isso é responsabilidade de validateBooking. A
 * separação é o que permite que a mesma regra atenda, sem duplicação, a uma
 * futura API pública, conforme a seção 2.2 da monografia.
 *
 * AS TRÊS CAMADAS DE VERIFICAÇÃO, E POR QUE SÃO TRÊS
 *
 *   1. Zod, logo abaixo: o campo veio? tem o formato certo? É verificação de
 *      FORMA, e recusa lixo antes de qualquer consulta ao banco.
 *   2. validateBooking: a reserva é possível? É verificação de REGRA.
 *   3. As constraints do PostgreSQL: alguém gravou algo entre a consulta e a
 *      gravação? É a garantia de INTEGRIDADE, e é a única que sobrevive a duas
 *      requisições simultâneas.
 *
 * Nenhuma substitui a outra. A primeira não sabe nada do mundo, a segunda
 * trabalha com uma fotografia dele, e a terceira é a única dentro da transação.
 *
 * ---------------------------------------------------------------------------
 * O QUE FALTA AQUI, E POR QUE ISTO NÃO PODE IR AO AR ASSIM
 * ---------------------------------------------------------------------------
 *
 * Esta função NÃO verifica quem está chamando. Não há sessão, não há perfil,
 * não há autorização.
 *
 * O ponto que costuma passar despercebido: uma Server Action não é uma função
 * interna. O Next publica um endpoint HTTP para ela, e qualquer pessoa com o
 * identificador desse endpoint pode invocá-la diretamente, sem passar pelo
 * formulário. Para efeitos de segurança, ela é tão pública quanto uma rota de
 * API escrita à mão.
 *
 * Some-se a isso que o cliente do Supabase usa a chave secreta, que ignora o
 * RLS. O import "server-only" impede a chave de vazar para o navegador, e é
 * tudo o que ele faz: não impede chamadas não autorizadas a esta função.
 *
 * Na prática, hoje: qualquer visitante pode criar reserva, em nome de qualquer
 * professor, para qualquer turma, e created_by fica nulo porque não há autor
 * conhecido.
 *
 * Isso é aceitável enquanto o sistema roda apenas em desenvolvimento, que é o
 * caso desta entrega. É bloqueador antes de qualquer publicação, e é
 * exatamente o que a entrega de 28/09 resolve: identificar o usuário da sessão,
 * verificar se ele pode reservar para aquele professor e aquela turma, e
 * preencher created_by com quem de fato registrou.
 */

/**
 * O que o formulário envia.
 *
 * Data e hora chegam separadas porque é assim que os campos nativos do HTML
 * funcionam: um input type="date" e dois type="time". A junção em instantes
 * acontece logo abaixo.
 */
const schema = z.object({
  roomId: z.uuid("Selecione um espaço."),
  professorId: z.uuid("Selecione um professor."),
  classId: z.uuid("Selecione uma turma."),
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

/**
 * FormData devolve string ou File. Este helper reduz ao texto, tratando o campo
 * ausente como string vazia, para que o Zod recuse com a mensagem escrita no
 * schema em vez de com um erro genérico de tipo.
 */
function texto(valor: FormDataEntryValue | null): string {
  return typeof valor === "string" ? valor : "";
}

/**
 * O estado que o formulário lê.
 *
 * Modelado como união discriminada pela mesma razão dos tipos do domínio: o
 * campo "messages" só existe no erro, e "bookingId" só no sucesso. A tela não
 * consegue, por construção, exibir a lista de problemas de uma reserva que deu
 * certo.
 */
export type BookingFormState =
  | { status: "idle" }
  | { status: "success"; bookingId: string }
  | {
      status: "error";
      /** Problemas gerais, já em português, prontos para exibir. */
      messages: string[];
      /** Problemas ligados a um campo específico, para exibir junto dele. */
      fieldErrors: Record<string, string[]>;
      /**
       * O que o usuário havia preenchido.
       *
       * Devolver os valores parece redundante, já que eles acabaram de sair do
       * navegador. Não é: o React 19 limpa um formulário com action assim que a
       * action termina, como faz um formulário HTML tradicional.
       *
       * Sem isto, uma reserva recusada por quatro motivos apagaria os sete
       * campos, e o professor teria de preencher tudo de novo para corrigir um
       * horário. Estes valores voltam à tela como conteúdo inicial dos campos.
       *
       * São os dados brutos, exatamente como chegaram, e não os dados já
       * validados: se o Zod recusou a data, é a data recusada que precisa
       * reaparecer para ser corrigida.
       */
      values: SubmittedValues;
    };

/** Os campos do formulário em forma de texto, como o navegador os enviou. */
export type SubmittedValues = {
  roomId: string;
  professorId: string;
  classId: string;
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

/**
 * Cria uma reserva a partir do formulário.
 *
 * A assinatura com estado anterior é o formato que o hook useActionState do
 * React espera. O primeiro parâmetro não é usado aqui porque cada envio é
 * julgado do zero, mas precisa existir na posição.
 */
export async function criarReserva(
  _prevState: BookingFormState,
  formData: FormData
): Promise<BookingFormState> {
  // -------------------------------------------------------------------------
  // 1. Forma
  // -------------------------------------------------------------------------

  // Os valores brutos são extraídos antes de qualquer validação, porque são
  // eles que voltam à tela em caso de recusa, inclusive quando a recusa é
  // justamente por um deles estar mal preenchido.
  const values: SubmittedValues = {
    roomId: texto(formData.get("roomId")),
    professorId: texto(formData.get("professorId")),
    classId: texto(formData.get("classId")),
    purpose: texto(formData.get("purpose")),
    date: texto(formData.get("date")),
    startTime: texto(formData.get("startTime")),
    endTime: texto(formData.get("endTime")),
    // getAll, e não get: os recursos são caixas de seleção múltipla, e get
    // devolveria apenas a primeira marcada.
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
    purpose: input.purpose,
    startsAt: combineDateTime(input.date, input.startTime),
    endsAt: combineDateTime(input.date, input.endTime),
    requiredResourceIds: input.resourceIds,
  };

  // -------------------------------------------------------------------------
  // 2. Regra
  //
  // As quatro consultas são independentes entre si, então rodam em paralelo. Em
  // sequência, o tempo de resposta seria a soma das quatro idas ao banco em vez
  // do tempo da mais lenta.
  // -------------------------------------------------------------------------

  const [room, classGroup, conflictingBookings, resources] = await Promise.all([
    findRoomSnapshot(request.roomId),
    findClassSnapshot(request.classId),
    findConflictCandidates(request),
    listResources(),
  ]);

  const resourceNames = toResourceNameMap(resources);

  // O "agora" é capturado uma vez e injetado. Fosse lido dentro da regra, duas
  // verificações da mesma chamada poderiam usar instantes diferentes.
  const now = new Date();

  const veredito = validateBooking(request, {
    room,
    classGroup,
    conflictingBookings,
    now,
  });

  if (!veredito.valid) {
    return erro(values, describeViolations(veredito.violations, { resourceNames }));
  }

  // -------------------------------------------------------------------------
  // 3. Integridade
  // -------------------------------------------------------------------------

  const resultado = await createBooking({
    roomId: request.roomId,
    professorId: request.professorId,
    classId: request.classId,
    purpose: request.purpose,
    startsAt: request.startsAt,
    endsAt: request.endsAt,
    // A regra já removeu duplicatas ao calcular o que falta, mas o pedido
    // original ainda pode tê-las. O Set garante que a gravação não tente
    // inserir a mesma linha duas vezes.
    resourceIds: [...new Set(request.requiredResourceIds)],
  });

  if (resultado.status === "conflict") {
    // Chegar aqui significa que a validação aprovou e o banco recusou, ou seja,
    // outra reserva foi gravada nos milissegundos entre uma coisa e outra.
    //
    // Em vez de exibir um aviso genérico, o contexto é recarregado e a regra
    // roda de novo. Agora a reserva concorrente já está no banco, então a
    // violação vem completa, com a finalidade e o horário de quem ocupou o
    // lugar. É a mesma mensagem que o usuário teria visto se tivesse chegado um
    // instante depois.
    const conflitosAtuais = await findConflictCandidates(request);

    const revalidacao = validateBooking(request, {
      room,
      classGroup,
      conflictingBookings: conflitosAtuais,
      now,
    });

    if (!revalidacao.valid) {
      return erro(
        values,
        describeViolations(revalidacao.violations, { resourceNames })
      );
    }

    // A revalidação não encontrou nada: a reserva concorrente foi removida
    // depois de ter causado a recusa. Situação rara o bastante para não merecer
    // tratamento próprio, mas o usuário precisa saber que pode simplesmente
    // tentar de novo.
    return erro(values, [
      "Outra reserva foi criada ao mesmo tempo e ocupou este horário. Tente enviar novamente.",
    ]);
  }

  if (resultado.status === "error") {
    return erro(values, [resultado.message]);
  }

  // -------------------------------------------------------------------------
  // 4. Sucesso
  //
  // revalidatePath descarta o cache da listagem no servidor. Sem isso, a página
  // continuaria servindo a versão anterior e a reserva recém-criada só
  // apareceria depois de um recarregamento manual.
  // -------------------------------------------------------------------------

  revalidatePath("/reservas");

  return { status: "success", bookingId: resultado.bookingId };
}
