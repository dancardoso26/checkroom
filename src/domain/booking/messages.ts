import { formatPeriod } from "@/lib/datetime";
import type { BookingViolation, ExistingBooking } from "./types";

/**
 * TRADUÇÃO DAS VIOLAÇÕES PARA TEXTO
 *
 * validateBooking devolve fatos: um código e os dados que o sustentam. Este
 * arquivo transforma esses fatos em frases para o usuário.
 *
 * POR QUE SÃO ARQUIVOS SEPARADOS
 *
 * Seria mais curto colocar um campo "message" em cada violação e acabar. A
 * separação existe porque as duas coisas mudam por motivos diferentes.
 *
 * O texto muda por motivo de produto: alguém acha a frase seca, o orientador
 * pede mais clareza, o sistema um dia é traduzido. A regra muda por motivo de
 * negócio: a instituição passa a exigir intervalo mínimo entre aulas.
 *
 * Com os dois no mesmo arquivo, ajustar uma vírgula em uma mensagem obrigaria a
 * mexer no arquivo da regra e a rodar os testes da regra de novo. Separados, o
 * teste de validateBooking compara códigos, não frases, e continua passando
 * mesmo que todo o texto do sistema seja reescrito.
 */

/**
 * O horário da reserva conflitante, como "14/09, 19:00 às 20:40".
 *
 * A formatação vem de lib/datetime, compartilhada com as telas. Manter uma
 * cópia aqui faria a mesma reserva aparecer com formatos diferentes na mensagem
 * de erro e na listagem, e o fuso precisaria ser corrigido em dois lugares.
 *
 * Importar de lib não compromete a pureza deste módulo: datetime.ts também não
 * tem efeito colateral nem depende do ambiente de execução.
 */
function periodOf(booking: ExistingBooking): string {
  return formatPeriod(booking.startsAt, booking.endsAt);
}

/**
 * Nomes legíveis para ids, quando quem chama consegue fornecê-los.
 *
 * A regra trabalha com ids porque a comparação precisa ser exata. A mensagem
 * precisa de nomes, porque "o espaço não oferece o recurso
 * 8f3c1a2e-..." não ajuda ninguém. Quem tem os dois é a camada que consultou o
 * banco, então é ela que passa o dicionário.
 *
 * O parâmetro é opcional de propósito: sem ele a função ainda produz uma frase
 * correta, apenas menos específica. Uma mensagem de erro nunca deve falhar por
 * falta de um dado acessório.
 */
export type ViolationLabels = {
  resourceNames?: Record<string, string>;
};

export function describeViolation(
  violation: BookingViolation,
  labels: ViolationLabels = {}
): string {
  switch (violation.code) {
    case "INVALID_PERIOD":
      return "O horário de término precisa ser posterior ao de início.";

    case "EMPTY_PURPOSE":
      return "Informe a finalidade da reserva.";

    case "ROOM_NOT_FOUND":
      return "O espaço selecionado não está mais disponível no sistema.";

    case "CLASS_NOT_FOUND":
      return "A turma selecionada não está mais disponível no sistema.";

    case "STARTS_IN_THE_PAST":
      return "Não é possível reservar um horário que já passou.";

    case "OUTSIDE_BUSINESS_HOURS":
      return `A instituição funciona das ${violation.opening} às ${violation.closing}, e a reserva precisa começar e terminar no mesmo dia.`;

    case "ROOM_CONFLICT":
      return `O espaço já está reservado neste horário para "${
        violation.conflict.purpose
      }", em ${periodOf(violation.conflict)}.`;

    case "PROFESSOR_CONFLICT":
      return `O professor já tem uma reserva neste horário: "${
        violation.conflict.purpose
      }", em ${periodOf(violation.conflict)}.`;

    case "CLASS_CONFLICT":
      return `A turma já tem uma reserva neste horário: "${
        violation.conflict.purpose
      }", em ${periodOf(violation.conflict)}.`;

    case "INSUFFICIENT_CAPACITY":
      return `O espaço comporta ${violation.capacity} pessoas e a turma tem ${violation.studentCount} alunos.`;

    case "MISSING_RESOURCES": {
      // Cai para o próprio id quando o dicionário não traz o nome. É preferível
      // a uma frase quebrada, e o id ainda permite investigar o que houve.
      const nomes = violation.missingResourceIds.map(
        (id) => labels.resourceNames?.[id] ?? id
      );

      return nomes.length === 1
        ? `O espaço não oferece o recurso exigido: ${nomes[0]}.`
        : `O espaço não oferece os recursos exigidos: ${nomes.join(", ")}.`;
    }
  }
}

/**
 * Traduz a lista inteira.
 *
 * O switch acima não tem "default" de propósito. Como BookingViolation é uma
 * união fechada e a função declara retornar string, acrescentar um código novo
 * em types.ts sem tratá-lo aqui faz o typecheck falhar. É o compilador
 * lembrando de escrever a mensagem, em vez de o usuário descobrir um espaço em
 * branco na tela.
 */
export function describeViolations(
  violations: BookingViolation[],
  labels: ViolationLabels = {}
): string[] {
  return violations.map((violation) => describeViolation(violation, labels));
}
