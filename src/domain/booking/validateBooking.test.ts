import { describe, it, expect } from "vitest";
import { validateBooking } from "./validateBooking";
import type {
  BookingContext,
  BookingRequest,
  BookingViolation,
  ClassSnapshot,
  ExistingBooking,
  RoomSnapshot,
} from "./types";

/**
 * TESTES DA REGRA DE NEGÓCIO
 *
 * Nenhum destes testes toca o banco, a rede ou o relógio do sistema. Isso não é
 * um detalhe de implementação: é a razão de validateBooking ter sido escrita
 * como função pura.
 *
 * Um teste que depende do Supabase falharia por conexão instável, por dado
 * deixado por outro teste ou por internet fora do ar, e a suíte perderia a
 * credibilidade. Estes rodam em milissegundos e só falham quando a regra está
 * errada, que é a única falha que interessa.
 *
 * Os casos abaixo cobrem o roteiro de verificação registrado no fim do
 * supabase/seed.sql, para que a mesma situação possa ser conferida nas duas
 * camadas: aqui, pela regra, e no editor SQL, pelas constraints do banco.
 */

// ---------------------------------------------------------------------------
// Cenário de referência
//
// Os identificadores são legíveis em vez de uuid porque a regra não interpreta
// o formato do id, apenas compara. "room-101" torna a leitura do teste direta;
// um uuid tornaria cada asserção um exercício de conferir caracteres.
// ---------------------------------------------------------------------------

const ROOM_101 = "room-101";
const ROOM_LAB = "room-lab";
const PROF_ANA = "prof-ana";
const PROF_CARLOS = "prof-carlos";
const CLASS_SI8 = "class-si8";
const CLASS_ENG2 = "class-eng2";
const RES_PROJETOR = "res-projetor";
const RES_COMPUTADORES = "res-computadores";

/**
 * O instante presente, fixo.
 *
 * Fixar o "agora" é o que torna os testes estáveis ao longo do tempo. Com
 * new Date() dentro da regra, o teste de reserva no passado passaria hoje e
 * falharia em 2027, sem que uma linha de código tivesse mudado.
 */
const NOW = new Date("2026-09-01T12:00:00-03:00");

/**
 * Constrói um instante na segunda-feira 14/09/2026, no horário de Brasília.
 *
 * O deslocamento -03:00 é explícito porque, sem ele, a string seria
 * interpretada no fuso da máquina que roda o teste. A suíte passaria no
 * notebook e falharia em um servidor configurado em UTC, que é exatamente o
 * tipo de falha que faz perder horas.
 */
function segunda(hora: string): Date {
  return new Date(`2026-09-14T${hora}:00-03:00`);
}

function makeRoom(overrides: Partial<RoomSnapshot> = {}): RoomSnapshot {
  return {
    id: ROOM_101,
    name: "101",
    building: "Bloco A",
    capacity: 45,
    resourceIds: [RES_PROJETOR],
    ...overrides,
  };
}

function makeClass(overrides: Partial<ClassSnapshot> = {}): ClassSnapshot {
  return {
    id: CLASS_SI8,
    name: "SI 8º semestre A",
    studentCount: 42,
    ...overrides,
  };
}

function makeRequest(overrides: Partial<BookingRequest> = {}): BookingRequest {
  return {
    roomId: ROOM_101,
    professorId: PROF_ANA,
    classId: CLASS_SI8,
    purpose: "Aula de Engenharia de Software",
    startsAt: segunda("19:00"),
    endsAt: segunda("20:40"),
    requiredResourceIds: [RES_PROJETOR],
    ...overrides,
  };
}

function makeContext(overrides: Partial<BookingContext> = {}): BookingContext {
  return {
    room: makeRoom(),
    classGroup: makeClass(),
    conflictingBookings: [],
    now: NOW,
    ...overrides,
  };
}

function makeExisting(
  overrides: Partial<ExistingBooking> = {}
): ExistingBooking {
  return {
    id: "booking-existente",
    roomId: ROOM_101,
    professorId: PROF_ANA,
    classId: CLASS_SI8,
    purpose: "Aula anterior",
    startsAt: segunda("19:00"),
    endsAt: segunda("20:40"),
    ...overrides,
  };
}

/**
 * Extrai apenas os códigos do resultado.
 *
 * As asserções comparam códigos, e nunca as frases de messages.ts. Se
 * comparassem texto, reescrever uma mensagem quebraria testes de regra de
 * negócio, o que treinaria qualquer pessoa a ignorar falhas da suíte.
 */
function codesOf(result: ReturnType<typeof validateBooking>): string[] {
  return result.valid
    ? []
    : result.violations.map((violation: BookingViolation) => violation.code);
}

// ---------------------------------------------------------------------------

describe("validateBooking", () => {
  describe("pedido válido", () => {
    it("aceita uma reserva sem conflito e compatível com o espaço", () => {
      const result = validateBooking(makeRequest(), makeContext());

      expect(result).toEqual({ valid: true });
    });

    it("aceita reservas simultâneas quando não compartilham espaço, professor nem turma", () => {
      // Este é o contrário dos testes de conflito, e é tão importante quanto:
      // uma regra que recusasse tudo passaria em todos os testes de recusa.
      const outraReserva = makeExisting({
        roomId: ROOM_LAB,
        professorId: PROF_CARLOS,
        classId: CLASS_ENG2,
      });

      const result = validateBooking(
        makeRequest(),
        makeContext({ conflictingBookings: [outraReserva] })
      );

      expect(result).toEqual({ valid: true });
    });
  });

  describe("conflito triplo", () => {
    it("recusa quando o espaço já está ocupado", () => {
      // Professor e turma diferentes: o único vínculo em comum é o espaço.
      const ocupada = makeExisting({
        professorId: PROF_CARLOS,
        classId: CLASS_ENG2,
      });

      const result = validateBooking(
        makeRequest(),
        makeContext({ conflictingBookings: [ocupada] })
      );

      expect(codesOf(result)).toEqual(["ROOM_CONFLICT"]);
    });

    it("recusa quando o professor já tem compromisso, mesmo em outro espaço", () => {
      // Espaço e turma diferentes. É o conflito que uma agenda que só cuidasse
      // de salas deixaria passar.
      const ocupado = makeExisting({
        roomId: ROOM_LAB,
        classId: CLASS_ENG2,
      });

      const result = validateBooking(
        makeRequest(),
        makeContext({ conflictingBookings: [ocupado] })
      );

      expect(codesOf(result)).toEqual(["PROFESSOR_CONFLICT"]);
    });

    it("recusa quando a turma já tem aula, mesmo em outro espaço", () => {
      // Espaço e professor diferentes. Este é o conflito que a revisão do
      // orientador acrescentou ao escopo.
      const ocupada = makeExisting({
        roomId: ROOM_LAB,
        professorId: PROF_CARLOS,
      });

      const result = validateBooking(
        makeRequest(),
        makeContext({ conflictingBookings: [ocupada] })
      );

      expect(codesOf(result)).toEqual(["CLASS_CONFLICT"]);
    });

    it("reporta os três motivos quando a reserva existente compartilha tudo", () => {
      const result = validateBooking(
        makeRequest(),
        makeContext({ conflictingBookings: [makeExisting()] })
      );

      expect(codesOf(result)).toEqual([
        "ROOM_CONFLICT",
        "PROFESSOR_CONFLICT",
        "CLASS_CONFLICT",
      ]);
    });

    it("reporta cada categoria uma única vez, ainda que várias reservas conflitem", () => {
      // Duas reservas diferentes ocupando o mesmo espaço em horários que se
      // sobrepõem ao pedido. Repetir "o espaço está ocupado" duas vezes não
      // acrescenta informação nenhuma para quem preenche o formulário.
      const primeira = makeExisting({
        id: "b1",
        professorId: PROF_CARLOS,
        classId: CLASS_ENG2,
      });
      const segundaReserva = makeExisting({
        id: "b2",
        professorId: PROF_CARLOS,
        classId: CLASS_ENG2,
        startsAt: segunda("20:00"),
        endsAt: segunda("21:30"),
      });

      const result = validateBooking(
        makeRequest(),
        makeContext({ conflictingBookings: [primeira, segundaReserva] })
      );

      expect(codesOf(result)).toEqual(["ROOM_CONFLICT"]);
    });

    it("aponta qual reserva causou o conflito", () => {
      // A mensagem exibida ao usuário cita a finalidade e o horário da reserva
      // existente. Sem carregar o objeto na violação, a tela só conseguiria
      // dizer "ocupado", e o professor não saberia com quem negociar.
      const ocupada = makeExisting({
        id: "b-alvo",
        purpose: "Defesa de TCC",
        professorId: PROF_CARLOS,
        classId: CLASS_ENG2,
      });

      const result = validateBooking(
        makeRequest(),
        makeContext({ conflictingBookings: [ocupada] })
      );

      expect(result.valid).toBe(false);
      if (result.valid) return; // estreita o tipo para o TypeScript

      const violation = result.violations[0];
      expect(violation).toMatchObject({
        code: "ROOM_CONFLICT",
        conflict: { id: "b-alvo", purpose: "Defesa de TCC" },
      });
    });
  });

  describe("limites do intervalo", () => {
    it("aceita uma reserva que começa exatamente quando a anterior termina", () => {
      // O caso que mais falha em comparações de horário escritas à mão. O
      // intervalo é fechado no início e aberto no fim, [19:00, 20:40), então
      // 20:40 pertence apenas à reserva seguinte.
      const anterior = makeExisting({
        startsAt: segunda("17:20"),
        endsAt: segunda("19:00"),
      });

      const result = validateBooking(
        makeRequest(),
        makeContext({ conflictingBookings: [anterior] })
      );

      expect(result).toEqual({ valid: true });
    });

    it("aceita uma reserva que termina exatamente quando a próxima começa", () => {
      const posterior = makeExisting({
        startsAt: segunda("20:40"),
        endsAt: segunda("22:20"),
      });

      const result = validateBooking(
        makeRequest(),
        makeContext({ conflictingBookings: [posterior] })
      );

      expect(result).toEqual({ valid: true });
    });

    it("recusa quando a sobreposição é de um único minuto", () => {
      // O contraponto do teste anterior: um minuto de invasão já é conflito.
      // Os dois juntos fixam a fronteira exata do comportamento.
      const anterior = makeExisting({
        startsAt: segunda("17:20"),
        endsAt: segunda("19:01"),
      });

      const result = validateBooking(
        makeRequest(),
        makeContext({ conflictingBookings: [anterior] })
      );

      expect(codesOf(result)).toContain("ROOM_CONFLICT");
    });

    it("recusa quando a reserva existente está inteiramente contida no pedido", () => {
      // Contenção não é detectada por comparar apenas os inícios ou apenas os
      // fins. É o caso que uma verificação incompleta deixaria passar.
      const contida = makeExisting({
        startsAt: segunda("19:30"),
        endsAt: segunda("20:00"),
      });

      const result = validateBooking(
        makeRequest(),
        makeContext({ conflictingBookings: [contida] })
      );

      expect(codesOf(result)).toContain("ROOM_CONFLICT");
    });

    it("ignora reservas que não tocam o período, mesmo se vierem na consulta", () => {
      // O repositório já filtra por período, mas a regra reconfere. Este teste
      // é a prova de que ela não terceiriza a própria decisão.
      const distante = makeExisting({
        startsAt: segunda("07:00"),
        endsAt: segunda("08:40"),
      });

      const result = validateBooking(
        makeRequest(),
        makeContext({ conflictingBookings: [distante] })
      );

      expect(result).toEqual({ valid: true });
    });
  });

  describe("compatibilidade entre turma e espaço", () => {
    it("recusa quando a turma é maior que a capacidade do espaço", () => {
      const result = validateBooking(
        makeRequest(),
        makeContext({
          room: makeRoom({ capacity: 30 }),
          classGroup: makeClass({ studentCount: 55 }),
        })
      );

      expect(codesOf(result)).toEqual(["INSUFFICIENT_CAPACITY"]);
    });

    it("aceita quando a turma ocupa exatamente a capacidade", () => {
      // A comparação é "maior que", não "maior ou igual": uma sala de 42
      // lugares comporta uma turma de 42 alunos.
      const result = validateBooking(
        makeRequest(),
        makeContext({
          room: makeRoom({ capacity: 42 }),
          classGroup: makeClass({ studentCount: 42 }),
        })
      );

      expect(result).toEqual({ valid: true });
    });

    it("recusa quando o espaço não oferece um recurso exigido", () => {
      const result = validateBooking(
        makeRequest({ requiredResourceIds: [RES_PROJETOR, RES_COMPUTADORES] }),
        makeContext({ room: makeRoom({ resourceIds: [RES_PROJETOR] }) })
      );

      expect(result.valid).toBe(false);
      if (result.valid) return;

      expect(result.violations[0]).toEqual({
        code: "MISSING_RESOURCES",
        // Apenas o que falta, e não a lista inteira do pedido: o projetor
        // existe na sala e não deve aparecer na mensagem de erro.
        missingResourceIds: [RES_COMPUTADORES],
      });
    });

    it("aceita quando o espaço oferece mais recursos do que o exigido", () => {
      const result = validateBooking(
        makeRequest({ requiredResourceIds: [RES_PROJETOR] }),
        makeContext({
          room: makeRoom({ resourceIds: [RES_PROJETOR, RES_COMPUTADORES] }),
        })
      );

      expect(result).toEqual({ valid: true });
    });

    it("aceita quando a reserva não exige recurso nenhum", () => {
      const result = validateBooking(
        makeRequest({ requiredResourceIds: [] }),
        makeContext({ room: makeRoom({ resourceIds: [] }) })
      );

      expect(result).toEqual({ valid: true });
    });

    it("não repete um recurso enviado duas vezes pelo formulário", () => {
      const result = validateBooking(
        makeRequest({
          requiredResourceIds: [RES_COMPUTADORES, RES_COMPUTADORES],
        }),
        makeContext({ room: makeRoom({ resourceIds: [] }) })
      );

      expect(result.valid).toBe(false);
      if (result.valid) return;

      expect(result.violations[0]).toEqual({
        code: "MISSING_RESOURCES",
        missingResourceIds: [RES_COMPUTADORES],
      });
    });
  });

  describe("verificações estruturais", () => {
    it("recusa quando o término é anterior ao início", () => {
      const result = validateBooking(
        makeRequest({
          startsAt: segunda("20:40"),
          endsAt: segunda("19:00"),
        }),
        makeContext()
      );

      expect(codesOf(result)).toContain("INVALID_PERIOD");
    });

    it("recusa quando início e término são iguais", () => {
      // Duração zero. No banco isso produziria um tstzrange vazio, que não se
      // sobrepõe a nada e escaparia de todas as constraints de exclusão.
      const result = validateBooking(
        makeRequest({
          startsAt: segunda("19:00"),
          endsAt: segunda("19:00"),
        }),
        makeContext()
      );

      expect(codesOf(result)).toContain("INVALID_PERIOD");
    });

    it("não avalia conflitos quando o período é inválido", () => {
      // Sem período válido não há o que sobrepor. Reportar "sala ocupada" aqui
      // seria uma conclusão tirada de uma comparação sem sentido.
      const result = validateBooking(
        makeRequest({
          startsAt: segunda("20:40"),
          endsAt: segunda("19:00"),
        }),
        makeContext({ conflictingBookings: [makeExisting()] })
      );

      expect(codesOf(result)).toEqual(["INVALID_PERIOD"]);
    });

    it("recusa quando a finalidade vem vazia", () => {
      const result = validateBooking(
        makeRequest({ purpose: "   " }),
        makeContext()
      );

      expect(codesOf(result)).toEqual(["EMPTY_PURPOSE"]);
    });

    it("recusa quando o espaço não existe mais", () => {
      const result = validateBooking(
        makeRequest(),
        makeContext({ room: null })
      );

      expect(codesOf(result)).toEqual(["ROOM_NOT_FOUND"]);
    });

    it("recusa quando a turma não existe mais", () => {
      const result = validateBooking(
        makeRequest(),
        makeContext({ classGroup: null })
      );

      expect(codesOf(result)).toEqual(["CLASS_NOT_FOUND"]);
    });

    it("recusa um início antes da abertura", () => {
      const result = validateBooking(
        makeRequest({ startsAt: segunda("06:30"), endsAt: segunda("08:00") }),
        makeContext()
      );

      expect(codesOf(result)).toContain("OUTSIDE_BUSINESS_HOURS");
    });

    it("recusa um término depois do fechamento", () => {
      const result = validateBooking(
        makeRequest({ startsAt: segunda("21:00"), endsAt: segunda("22:30") }),
        makeContext()
      );

      expect(codesOf(result)).toContain("OUTSIDE_BUSINESS_HOURS");
    });

    it("aceita o período que ocupa exatamente a abertura e o fechamento", () => {
      // Os limites são inclusivos: 07:00 e 22:00 são horários válidos, e não o
      // primeiro instante fora do expediente.
      const result = validateBooking(
        makeRequest({ startsAt: segunda("07:00"), endsAt: segunda("22:00") }),
        makeContext()
      );

      expect(result).toEqual({ valid: true });
    });

    it("recusa uma reserva que atravessa a virada do dia", () => {
      // O caso que uma comparação apenas de horas deixaria passar: 21h está
      // dentro do expediente, 8h também, cada um no seu dia. O que torna a
      // reserva impossível é o prédio fechar no meio dela.
      const result = validateBooking(
        makeRequest({
          startsAt: segunda("21:00"),
          endsAt: new Date("2026-09-15T08:00:00-03:00"),
        }),
        makeContext()
      );

      expect(codesOf(result)).toContain("OUTSIDE_BUSINESS_HOURS");
    });

    it("não reporta expediente quando o período está invertido", () => {
      // Em uma reserva invertida, o "início" é na verdade o fim. Comparar essas
      // pontas com o expediente produziria uma segunda mensagem que só
      // confundiria: o problema é o período, e INVALID_PERIOD já o descreve.
      const result = validateBooking(
        makeRequest({ startsAt: segunda("20:00"), endsAt: segunda("19:00") }),
        makeContext()
      );

      expect(codesOf(result)).toEqual(["INVALID_PERIOD"]);
    });

    it("recusa um horário que já passou", () => {
      const result = validateBooking(
        makeRequest(),
        // "Agora" adiantado para depois da reserva de referência.
        makeContext({ now: new Date("2026-09-20T12:00:00-03:00") })
      );

      expect(codesOf(result)).toContain("STARTS_IN_THE_PAST");
    });
  });

  describe("acúmulo de violações", () => {
    it("reporta todos os problemas de uma vez, e não apenas o primeiro", () => {
      // Decisão de usabilidade: recusar por um motivo, e depois por outro
      // quando o professor corrige o primeiro, transforma o formulário em
      // adivinhação.
      const ocupada = makeExisting({
        professorId: PROF_CARLOS,
        classId: CLASS_ENG2,
      });

      const result = validateBooking(
        makeRequest({ requiredResourceIds: [RES_COMPUTADORES] }),
        makeContext({
          room: makeRoom({ capacity: 20, resourceIds: [] }),
          classGroup: makeClass({ studentCount: 55 }),
          conflictingBookings: [ocupada],
        })
      );

      expect(codesOf(result)).toEqual([
        "ROOM_CONFLICT",
        "INSUFFICIENT_CAPACITY",
        "MISSING_RESOURCES",
      ]);
    });
  });
});
