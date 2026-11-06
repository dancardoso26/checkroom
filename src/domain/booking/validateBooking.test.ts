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

const ROOM_101 = "room-101";
const ROOM_LAB = "room-lab";
const PROF_ANA = "prof-ana";
const PROF_CARLOS = "prof-carlos";
const CLASS_SI8 = "class-si8";
const CLASS_ENG2 = "class-eng2";
const RES_PROJETOR = "res-projetor";
const SUBJECT_ES = "subject-engenharia-software";
const RES_COMPUTADORES = "res-computadores";

const NOW = new Date("2026-09-01T12:00:00-03:00");

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
    subjectId: SUBJECT_ES,
    activityType: "class" as const,
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
    teachingAssignment: {
      professorId: PROF_ANA,
      subjectId: SUBJECT_ES,
      classId: CLASS_SI8,
      term: "2026.2",
    },
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

function codesOf(result: ReturnType<typeof validateBooking>): string[] {
  return result.valid
    ? []
    : result.violations.map((violation: BookingViolation) => violation.code);
}

describe("validateBooking", () => {
  describe("pedido válido", () => {
    it("aceita uma reserva sem conflito e compatível com o espaço", () => {
      const result = validateBooking(makeRequest(), makeContext());

      expect(result).toEqual({ valid: true });
    });

    it("aceita reservas simultâneas quando não compartilham espaço, professor nem turma", () => {
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
      const ocupada = makeExisting({
        id: "b-alvo",
        purpose: "Prova de recuperação",
        professorId: PROF_CARLOS,
        classId: CLASS_ENG2,
      });

      const result = validateBooking(
        makeRequest(),
        makeContext({ conflictingBookings: [ocupada] })
      );

      expect(result.valid).toBe(false);
      if (result.valid) return;

      const violation = result.violations[0];
      expect(violation).toMatchObject({
        code: "ROOM_CONFLICT",
        conflict: { id: "b-alvo", purpose: "Prova de recuperação" },
      });
    });
  });

  describe("limites do intervalo", () => {
    it("aceita uma reserva que começa exatamente quando a anterior termina", () => {
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
      const result = validateBooking(
        makeRequest({ startsAt: segunda("07:00"), endsAt: segunda("22:00") }),
        makeContext()
      );

      expect(result).toEqual({ valid: true });
    });

    it("recusa uma reserva que atravessa a virada do dia", () => {
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
      const result = validateBooking(
        makeRequest({ startsAt: segunda("20:00"), endsAt: segunda("19:00") }),
        makeContext()
      );

      expect(codesOf(result)).toEqual(["INVALID_PERIOD"]);
    });

    it("recusa um horário que já passou", () => {
      const result = validateBooking(
        makeRequest(),
        makeContext({ now: new Date("2026-09-20T12:00:00-03:00") })
      );

      expect(codesOf(result)).toContain("STARTS_IN_THE_PAST");
    });
  });

  describe("vínculo acadêmico", () => {
    it("recusa quando o professor não leciona a disciplina para a turma", () => {
      const result = validateBooking(
        makeRequest(),
        makeContext({ teachingAssignment: null })
      );

      expect(codesOf(result)).toEqual(["NO_TEACHING_ASSIGNMENT"]);
    });

    it("informa o período letivo na violação", () => {
      const result = validateBooking(
        makeRequest(),
        makeContext({ teachingAssignment: null })
      );

      expect(result.valid).toBe(false);
      if (result.valid) return;

      expect(result.violations[0]).toMatchObject({
        code: "NO_TEACHING_ASSIGNMENT",
        term: expect.stringMatching(/^\d{4}\.\d$/),
      });
    });

    it("aceita prova sem disciplina nem vínculo", () => {
      const result = validateBooking(
        makeRequest({
          activityType: "exam",
          subjectId: null,
          purpose: "Prova de recuperação",
        }),
        makeContext({ teachingAssignment: null })
      );

      expect(result).toEqual({ valid: true });
    });

    it("exige disciplina quando a atividade é aula", () => {
      const result = validateBooking(
        makeRequest({ subjectId: null }),
        makeContext({ teachingAssignment: null })
      );

      expect(codesOf(result)).toEqual(["SUBJECT_REQUIRED"]);
    });

    it("não exige vínculo em palestra, prova nem evento", () => {
      for (const tipo of ["lecture", "exam", "event"] as const) {
        const result = validateBooking(
          makeRequest({ activityType: tipo, subjectId: null }),
          makeContext({ teachingAssignment: null })
        );

        expect(result, `tipo ${tipo}`).toEqual({ valid: true });
      }
    });

    it("aceita quando o vínculo existe", () => {
      const result = validateBooking(makeRequest(), makeContext());

      expect(result).toEqual({ valid: true });
    });
  });

  describe("acúmulo de violações", () => {
    it("reporta todos os problemas de uma vez, e não apenas o primeiro", () => {
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

describe("calendário letivo", () => {
  const LETIVO = { periodo: { codigo: "2026.2" }, bloqueios: [] };

  function codigos(context: Partial<BookingContext>) {
    const resultado = validateBooking(makeRequest(), makeContext(context));
    return resultado.valid ? [] : resultado.violations.map((v) => v.code);
  }

  it("aceita a reserva dentro do período letivo e sem bloqueio", () => {
    expect(codigos({ calendario: LETIVO })).toEqual([]);
  });

  it("recusa data fora de qualquer período letivo", () => {
    expect(codigos({ calendario: { periodo: null, bloqueios: [] } })).toEqual([
      "OUTSIDE_ACADEMIC_TERM",
    ]);
  });

  it("recusa data com feriado, que vale para todos os espaços", () => {
    expect(
      codigos({
        calendario: { ...LETIVO, bloqueios: [{ espacoId: null, motivo: "Finados" }] },
      })
    ).toEqual(["DATE_BLOCKED"]);
  });

  it("o bloqueio de um espaço recusa só aquele espaço", () => {
    const bloqueioDoLab = { espacoId: ROOM_LAB, motivo: "Manutenção" };

    expect(codigos({ calendario: { ...LETIVO, bloqueios: [bloqueioDoLab] } })).toEqual([]);
    expect(
      codigos({
        room: makeRoom({ id: ROOM_LAB }),
        calendario: { ...LETIVO, bloqueios: [bloqueioDoLab] },
      })
    ).toEqual([]);

    const resultado = validateBooking(
      makeRequest({ roomId: ROOM_LAB }),
      makeContext({
        room: makeRoom({ id: ROOM_LAB }),
        calendario: { ...LETIVO, bloqueios: [bloqueioDoLab] },
      })
    );
    expect(resultado.valid ? [] : resultado.violations).toEqual([
      { code: "ROOM_BLOCKED", reason: "Manutenção" },
    ]);
  });

  it("procura o vínculo de professor no período da data", () => {
    const resultado = validateBooking(
      makeRequest(),
      makeContext({
        teachingAssignment: null,
        calendario: { periodo: { codigo: "2027.1" }, bloqueios: [] },
      })
    );

    expect(resultado.valid ? [] : resultado.violations).toContainEqual({
      code: "NO_TEACHING_ASSIGNMENT",
      term: "2027.1",
    });
  });
});
