import { localDayKey, localMinutesOfDay } from "@/lib/datetime";
import {
  ABERTURA,
  ABERTURA_EM_MINUTOS,
  FECHAMENTO,
  FECHAMENTO_EM_MINUTOS,
} from "./businessHours";
import type {
  BookingContext,
  BookingRequest,
  BookingValidationResult,
  BookingViolation,
  ExistingBooking,
} from "./types";

/**
 * A REGRA DE NEGÓCIO DO CHECKROOM
 *
 * Este é o arquivo central da entrega de 14/09. Tudo o mais existe para levar
 * dados até aqui e devolver o resultado ao usuário.
 *
 * ---------------------------------------------------------------------------
 * POR QUE ESTA FUNÇÃO É PURA
 * ---------------------------------------------------------------------------
 *
 * Função pura é aquela que, para a mesma entrada, sempre devolve a mesma saída,
 * e não altera nada fora de si. Repare no que este arquivo NÃO faz:
 *
 *   - não importa o cliente do Supabase, nem consulta o banco;
 *   - não lê o relógio: o instante presente chega em context.now;
 *   - não conhece HTTP, formulário, requisição ou resposta;
 *   - não grava nada, não envia e-mail, não escreve log.
 *
 * Três consequências práticas, e é por elas que a decisão foi tomada.
 *
 * A primeira é o teste. validateBooking.test.ts roda sem banco, sem servidor e
 * sem rede: cada caso monta um contexto como objeto literal e compara o
 * resultado. Testes assim rodam em milissegundos e nunca falham por motivo
 * alheio à regra, o que é o que faz alguém realmente rodá-los.
 *
 * A segunda é o reaproveitamento. A monografia afirma, na seção 2.2, que Server
 * Actions e Route Handlers compartilham as mesmas funções de regra. Isso só é
 * possível porque esta função não sabe por qual caminho foi chamada. Quando a
 * API pública entrar, ela chama exatamente esta função.
 *
 * A terceira é a explicação. Na validação com o orientador, a regra inteira
 * cabe em um arquivo que se lê de cima a baixo, sem precisar abrir o banco para
 * entender o que acontece.
 *
 * ---------------------------------------------------------------------------
 * O QUE ESTA FUNÇÃO NÃO GARANTE
 * ---------------------------------------------------------------------------
 *
 * Ela julga o pedido contra uma fotografia do banco, tirada momentos antes. Se
 * outra reserva for gravada entre a consulta e a gravação, a fotografia fica
 * desatualizada e esta função aprova um conflito real.
 *
 * Isso não é um defeito a corrigir aqui: nenhuma verificação feita fora de uma
 * transação consegue resolver. Quem resolve são as constraints de exclusão da
 * migration 20260904000200, avaliadas pelo PostgreSQL dentro da transação do
 * INSERT. As duas camadas têm papéis diferentes: esta produz a explicação, o
 * banco produz a garantia.
 */

/**
 * Duas faixas de tempo se sobrepõem?
 *
 * A comparação é estrita nos dois lados, e é isso que faz aulas consecutivas
 * conviverem. Uma aula das 19h às 20h40 e outra das 20h40 às 22h20:
 *
 *   a.startsAt (20h40) < b.endsAt (20h40)  ->  falso
 *
 * A primeira condição já falha, e não há sobreposição. Trocar "<" por "<="
 * faria o sistema recusar toda grade horária encadeada, que é o caso normal em
 * uma instituição de ensino.
 *
 * Esta é a mesma semântica do tstzrange [início, fim) usado nas constraints do
 * banco. As duas camadas precisam concordar: se divergissem, o formulário
 * aceitaria uma reserva que o banco recusaria, e o usuário veria um erro
 * inexplicável depois de a tela dizer que estava tudo certo.
 */
function overlaps(
  a: { startsAt: Date; endsAt: Date },
  b: { startsAt: Date; endsAt: Date }
): boolean {
  return a.startsAt < b.endsAt && a.endsAt > b.startsAt;
}

/**
 * O período cabe dentro do expediente da instituição?
 *
 * São três perguntas em uma, e as três precisam ser verdadeiras.
 *
 * A primeira é o início não ser antes da abertura. A segunda é o término não
 * passar do fechamento. A terceira, menos óbvia, é que as duas pontas caiam no
 * MESMO dia do calendário: sem ela, uma reserva das 21h às 8h do dia seguinte
 * passaria, porque o início está dentro do expediente e o término também, cada
 * um no seu dia.
 *
 * A comparação usa minutos desde a meia-noite no fuso de São Paulo, e não
 * getHours(), porque getHours lê o fuso da máquina. No servidor, que roda em
 * UTC, uma aula das 21h em Brasília responderia meia-noite do dia seguinte, e a
 * verificação recusaria uma reserva perfeitamente válida.
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
 * Julga um pedido de reserva contra o contexto carregado do banco.
 *
 * Devolve todas as violações encontradas, e não apenas a primeira. É uma
 * decisão de usabilidade: recusar uma reserva dizendo só "sala ocupada", para
 * então recusar de novo por capacidade depois que o professor troca o horário,
 * transforma o formulário em adivinhação.
 */
export function validateBooking(
  request: BookingRequest,
  context: BookingContext
): BookingValidationResult {
  const violations: BookingViolation[] = [];

  // -------------------------------------------------------------------------
  // 1. Verificações estruturais
  //
  // Perguntam se o pedido faz sentido em si mesmo, antes de compará-lo com o
  // resto do mundo. São as únicas que podem impedir as demais de rodar.
  // -------------------------------------------------------------------------

  // Guardado em uma constante porque a mesma condição é consultada de novo na
  // parada antecipada, logo abaixo. Duplicar a comparação abriria espaço para
  // que uma fosse ajustada um dia e a outra não.
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

  // Reservar para ontem não é um conflito, é um engano. A verificação existe
  // porque o campo de data do formulário aceita qualquer dia, e um erro de
  // digitação no ano é fácil de cometer e difícil de perceber na listagem.
  if (request.startsAt < context.now) {
    violations.push({ code: "STARTS_IN_THE_PAST" });
  }

  // O prédio fecha às 22h. Uma reserva às 23h seria aceita pelo sistema e
  // recusada pela realidade, porque não há portaria nem suporte no local.
  //
  // A verificação só faz sentido com o período coerente: em uma reserva
  // invertida, o "início" é na verdade o fim, e a comparação diria coisas sem
  // sentido. INVALID_PERIOD já cobre esse caso sozinho.
  if (hasValidPeriod && !dentroDoExpediente(request)) {
    violations.push({
      code: "OUTSIDE_BUSINESS_HOURS",
      opening: ABERTURA,
      closing: FECHAMENTO,
    });
  }

  // -------------------------------------------------------------------------
  // 2. Parada antecipada
  //
  // Sem período válido não há o que sobrepor, e sem espaço ou turma carregados
  // não há capacidade nem recursos a comparar. Seguir adiante produziria ou um
  // erro de acesso a nulo, ou pior: um "nenhum conflito encontrado" que na
  // verdade significa "não foi possível verificar".
  //
  // A saída aqui é o que permite ao TypeScript, daqui para baixo, tratar
  // context.room e context.classGroup como preenchidos sem nenhuma checagem
  // adicional. O compilador acompanha o raciocínio.
  // -------------------------------------------------------------------------

  if (!hasValidPeriod || context.room === null || context.classGroup === null) {
    return { valid: false, violations };
  }

  const room = context.room;
  const classGroup = context.classGroup;

  // -------------------------------------------------------------------------
  // 3. Conflito triplo
  //
  // A parte que a revisão do orientador ampliou. Antes bastava perguntar se o
  // espaço estava livre; agora a reserva também amarra um professor e uma
  // turma, e cada um deles só pode estar em um lugar por vez.
  //
  // Uma mesma reserva existente pode violar mais de uma dessas condições ao
  // mesmo tempo. Cada categoria é reportada no máximo uma vez, pela primeira
  // reserva que a viola, porque as três exigem correções diferentes do usuário
  // (trocar de sala, trocar de professor, trocar de horário) enquanto repetir a
  // mesma categoria cinco vezes não acrescenta nada.
  // -------------------------------------------------------------------------

  let roomConflict: ExistingBooking | undefined;
  let professorConflict: ExistingBooking | undefined;
  let classConflict: ExistingBooking | undefined;

  for (const existing of context.conflictingBookings) {
    // O repositório já traz apenas candidatos plausíveis, mas a sobreposição é
    // reconferida aqui. A regra não terceiriza a própria decisão: se a consulta
    // um dia trouxer uma linha a mais, ela é descartada em vez de virar uma
    // recusa injustificada.
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

  // -------------------------------------------------------------------------
  // 4. Compatibilidade entre a turma e o espaço
  //
  // Diferente dos conflitos, que dependem de outras reservas, estas duas
  // verificações comparam o pedido com as características do próprio espaço.
  // Seriam verdadeiras mesmo que a agenda estivesse inteiramente vazia.
  // -------------------------------------------------------------------------

  if (classGroup.studentCount > room.capacity) {
    violations.push({
      code: "INSUFFICIENT_CAPACITY",
      capacity: room.capacity,
      studentCount: classGroup.studentCount,
    });
  }

  // Set em vez de percorrer o array a cada consulta: com poucos recursos a
  // diferença de desempenho é irrelevante, mas a intenção fica explícita, que é
  // perguntar pertinência, não posição.
  const offered = new Set(room.resourceIds);

  // O Set na entrada elimina duplicatas do pedido. Sem ele, um recurso enviado
  // duas vezes pelo formulário apareceria duas vezes na mensagem de erro.
  const missingResourceIds = [...new Set(request.requiredResourceIds)].filter(
    (resourceId) => !offered.has(resourceId)
  );

  if (missingResourceIds.length > 0) {
    violations.push({ code: "MISSING_RESOURCES", missingResourceIds });
  }

  // -------------------------------------------------------------------------
  // 5. Veredito
  // -------------------------------------------------------------------------

  if (violations.length > 0) {
    return { valid: false, violations };
  }

  return { valid: true };
}
