import { validateBooking } from "./validateBooking";
import type {
  BookingContext,
  BookingRequest,
  BookingViolation,
  RoomSnapshot,
} from "./types";

/**
 * QUAIS ESPAÇOS SERVEM PARA ESTA ATIVIDADE
 *
 * validateBooking responde "este pedido pode ser aceito?". Esta função responde
 * uma pergunta diferente e mais útil para quem está preenchendo o formulário:
 * "dos espaços que existem, quais servem, e por que os outros não?".
 *
 * A DIFERENÇA QUE ISSO FAZ NA TELA
 *
 * Na primeira versão, o professor escolhia a sala e descobria o erro só depois
 * de enviar. Recusar uma escolha é sempre pior do que mostrar as escolhas
 * possíveis: no primeiro caso, quem preencheu precisa adivinhar o que tentar
 * em seguida.
 *
 * POR QUE ESTA FUNÇÃO É CURTA
 *
 * Ela não reimplementa verificação nenhuma. Chama validateBooking uma vez por
 * espaço e agrupa o resultado. Isso só é possível porque a regra é uma função
 * pura: não faz consulta ao banco, então executá-la doze vezes custa o mesmo
 * que executá-la uma, e as duas telas não podem divergir, porque decidem pelo
 * mesmo código.
 *
 * Fosse a regra dependente do banco, esta tela exigiria uma consulta por espaço,
 * ou uma segunda implementação da mesma lógica em SQL. As duas alternativas
 * acabariam divergindo do formulário em algum ponto.
 */

export type RoomEvaluation = {
  room: RoomSnapshot;
  /** Verdadeiro quando este espaço atende ao pedido. */
  compatible: boolean;
  /**
   * Só os motivos que dizem respeito AO ESPAÇO: capacidade, recursos e ocupação
   * do próprio espaço.
   *
   * Conflito de professor e de turma são filtrados de propósito. Eles valem
   * para todos os espaços igualmente, e repeti-los em cada cartão da lista
   * sugeriria que trocar de sala resolveria, quando o que resolve é trocar de
   * horário. A tela mostra esses dois uma vez só, fora da lista.
   */
  violations: BookingViolation[];
};

/**
 * Violações que dependem do espaço escolhido.
 *
 * O Set existe para que a decisão de "isto é sobre o espaço" fique declarada em
 * um lugar, e não espalhada por comparações no meio do código.
 */
const VIOLACOES_DO_ESPACO = new Set<BookingViolation["code"]>([
  "ROOM_CONFLICT",
  "INSUFFICIENT_CAPACITY",
  "MISSING_RESOURCES",
  "ROOM_NOT_FOUND",
]);

export function evaluateRooms(
  /**
   * O pedido sem o espaço: ele é justamente o que está sendo decidido. Omitir o
   * campo no tipo impede que alguém passe um roomId aqui e receba um resultado
   * que ignora silenciosamente esse valor.
   */
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
      // A compatibilidade olha o veredito completo, e não a lista filtrada.
      // Um espaço não vira compatível só porque o motivo da recusa foi
      // escondido da lista.
      compatible: resultado.valid,
      violations,
    };
  });

  return ordenar(avaliacoes);
}

/**
 * Coloca na frente o que o professor provavelmente quer.
 *
 * Compatíveis primeiro, o que é óbvio. Entre os compatíveis, o critério é a
 * sobra de lugares: uma turma de 38 alunos deve ver antes o laboratório de 40
 * do que o auditório de 120.
 *
 * A razão não é estética. Ocupar o auditório com 38 pessoas o torna
 * indisponível para o evento de 100 que viria depois, e esse é o desperdício
 * que o sistema existe para reduzir. Sugerir o espaço mais justo é a regra de
 * bom uso transformada em ordenação.
 *
 * Entre os incompatíveis, a ordem é alfabética por prédio e nome, para que a
 * lista fique estável entre um carregamento e outro.
 */
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

/**
 * Os conflitos que não dependem do espaço.
 *
 * Extraídos uma vez, a partir de qualquer avaliação, porque valem para a lista
 * inteira. A tela os exibe em um aviso próprio, acima dos cartões.
 *
 * Recebe o pedido sem espaço e verifica contra um espaço fictício que nunca
 * conflita, para que só sobrem as violações de professor e turma.
 */
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
