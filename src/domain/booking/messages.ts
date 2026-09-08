import { formatPeriod } from "@/lib/datetime";
import type { BookingViolation, ExistingBooking } from "./types";

/**
 * Traduz as violações em frases para o usuário.
 *
 * Fica separado da regra porque os dois mudam por motivos diferentes: texto por
 * razão de produto, regra por razão de negócio. Assim os testes de
 * validateBooking comparam códigos e continuam passando mesmo que todo o texto
 * seja reescrito.
 */

/**
 * A formatação é compartilhada com as telas, para a mesma reserva não aparecer
 * em formatos diferentes na mensagem de erro e na listagem.
 */
function periodOf(booking: ExistingBooking): string {
  return formatPeriod(booking.startsAt, booking.endsAt);
}

/**
 * A regra trabalha com ids, a mensagem precisa de nomes. Opcional de propósito:
 * uma mensagem de erro nunca deve falhar por falta de um dado acessório.
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

    case "SUBJECT_REQUIRED":
      return "Informe a disciplina da aula.";

    case "NO_TEACHING_ASSIGNMENT":
      return `Este professor não leciona a disciplina selecionada para esta turma no período ${violation.term}.`;

    case "INSUFFICIENT_CAPACITY":
      return `O espaço comporta ${violation.capacity} pessoas e a turma tem ${violation.studentCount} alunos.`;

    case "MISSING_RESOURCES": {
      // Cai para o id quando falta o nome: feio, mas investigável.
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
 * O switch acima não tem "default" de propósito: acrescentar um código novo em
 * types.ts sem tratá-lo aqui faz o typecheck falhar, em vez de o usuário
 * descobrir um espaço em branco na tela.
 */
export function describeViolations(
  violations: BookingViolation[],
  labels: ViolationLabels = {}
): string[] {
  return violations.map((violation) => describeViolation(violation, labels));
}
