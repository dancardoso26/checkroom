import { describe, it, expect } from "vitest";
import { evaluateRooms, findScheduleConflicts } from "./evaluateRooms";
import type {
  BookingContext,
  BookingRequest,
  ClassSnapshot,
  ExistingBooking,
  RoomSnapshot,
} from "./types";

/**
 * TESTES DA AVALIAÇÃO DE ESPAÇOS
 *
 * Pelo mesmo motivo dos testes de validateBooking: nada aqui toca banco, rede
 * ou relógio. A função é pura, e cada caso é um objeto literal.
 */

const PROF_ANA = "prof-ana";
const PROF_CARLOS = "prof-carlos";
const CLASS_SI8 = "class-si8";
const CLASS_ENG2 = "class-eng2";
const RES_PROJETOR = "res-projetor";
const RES_COMPUTADORES = "res-computadores";

const NOW = new Date("2026-09-01T12:00:00-03:00");

function segunda(hora: string): Date {
  return new Date(`2026-09-14T${hora}:00-03:00`);
}

function sala(overrides: Partial<RoomSnapshot> & { id: string }): RoomSnapshot {
  return {
    name: overrides.id,
    building: "Bloco A",
    capacity: 40,
    resourceIds: [],
    ...overrides,
  };
}

function makeClass(overrides: Partial<ClassSnapshot> = {}): ClassSnapshot {
  return { id: CLASS_SI8, name: "SI 8º A", studentCount: 38, ...overrides };
}

function pedido(
  overrides: Partial<Omit<BookingRequest, "roomId">> = {}
): Omit<BookingRequest, "roomId"> {
  return {
    professorId: PROF_ANA,
    classId: CLASS_SI8,
    subjectId: null,
    // Palestra: a avaliação de espaços não depende de vínculo docente, e usar o
    // tipo que não o exige mantém cada teste medindo uma coisa só.
    activityType: "lecture" as const,
    purpose: "Aula de Banco de Dados II",
    startsAt: segunda("19:00"),
    endsAt: segunda("20:40"),
    requiredResourceIds: [],
    ...overrides,
  };
}

function contexto(
  overrides: Partial<Omit<BookingContext, "room">> = {}
): Omit<BookingContext, "room"> {
  return {
    classGroup: makeClass(),
    teachingAssignment: null,
    conflictingBookings: [],
    now: NOW,
    ...overrides,
  };
}

function reservaExistente(
  overrides: Partial<ExistingBooking> = {}
): ExistingBooking {
  return {
    id: "b1",
    roomId: "lab-01",
    professorId: PROF_CARLOS,
    classId: CLASS_ENG2,
    purpose: "Aula anterior",
    startsAt: segunda("19:00"),
    endsAt: segunda("20:40"),
    ...overrides,
  };
}

describe("evaluateRooms", () => {
  it("separa os espaços que servem dos que não servem", () => {
    const salas = [
      sala({ id: "pequena", capacity: 20 }),
      sala({ id: "serve", capacity: 40 }),
    ];

    const resultado = evaluateRooms(pedido(), salas, contexto());

    expect(resultado.map((a) => [a.room.id, a.compatible])).toEqual([
      ["serve", true],
      ["pequena", false],
    ]);
  });

  it("explica por que cada espaço incompatível foi descartado", () => {
    const salas = [
      sala({ id: "sem-projetor", capacity: 40, resourceIds: [] }),
      sala({ id: "pequena", capacity: 10, resourceIds: [RES_PROJETOR] }),
    ];

    const resultado = evaluateRooms(
      pedido({ requiredResourceIds: [RES_PROJETOR] }),
      salas,
      contexto()
    );

    const porId = Object.fromEntries(
      resultado.map((a) => [a.room.id, a.violations.map((v) => v.code)])
    );

    expect(porId["sem-projetor"]).toEqual(["MISSING_RESOURCES"]);
    expect(porId["pequena"]).toEqual(["INSUFFICIENT_CAPACITY"]);
  });

  it("marca como ocupado apenas o espaço que tem reserva no horário", () => {
    const salas = [sala({ id: "lab-01" }), sala({ id: "lab-02" })];

    const resultado = evaluateRooms(
      pedido(),
      salas,
      contexto({ conflictingBookings: [reservaExistente({ roomId: "lab-01" })] })
    );

    const porId = Object.fromEntries(
      resultado.map((a) => [a.room.id, a.violations.map((v) => v.code)])
    );

    expect(porId["lab-01"]).toEqual(["ROOM_CONFLICT"]);
    expect(porId["lab-02"]).toEqual([]);
  });

  it("não repete conflito de professor em cada espaço da lista", () => {
    // Este é o ponto do filtro. A professora está ocupada no horário, o que
    // vale para todos os espaços igualmente. Mostrar "a professora está
    // ocupada" em cada cartão sugeriria que trocar de sala resolveria.
    const salas = [sala({ id: "lab-01" }), sala({ id: "lab-02" })];

    const resultado = evaluateRooms(
      pedido(),
      salas,
      contexto({
        conflictingBookings: [
          reservaExistente({ roomId: "outro", professorId: PROF_ANA }),
        ],
      })
    );

    for (const avaliacao of resultado) {
      expect(avaliacao.violations).toEqual([]);
      // Mas nenhum espaço é apresentado como utilizável, porque o pedido
      // inteiro é inválido enquanto a professora estiver ocupada.
      expect(avaliacao.compatible).toBe(false);
    }
  });

  it("sugere o espaço mais justo antes do maior", () => {
    // Turma de 38 alunos. O auditório de 120 cabe, mas ocupá-lo inviabiliza o
    // evento grande que viesse depois. O laboratório de 40 é a escolha certa.
    const salas = [
      sala({ id: "auditorio", capacity: 120 }),
      sala({ id: "lab", capacity: 40 }),
      sala({ id: "sala-media", capacity: 60 }),
    ];

    const resultado = evaluateRooms(pedido(), salas, contexto());

    expect(resultado.map((a) => a.room.id)).toEqual([
      "lab",
      "sala-media",
      "auditorio",
    ]);
  });

  it("devolve lista vazia quando não há espaço cadastrado", () => {
    expect(evaluateRooms(pedido(), [], contexto())).toEqual([]);
  });

  it("considera todos incompatíveis quando o período é inválido", () => {
    const resultado = evaluateRooms(
      pedido({ startsAt: segunda("20:40"), endsAt: segunda("19:00") }),
      [sala({ id: "lab" })],
      contexto()
    );

    expect(resultado[0].compatible).toBe(false);
  });
});

describe("findScheduleConflicts", () => {
  it("encontra o conflito de professor, que independe do espaço", () => {
    const violacoes = findScheduleConflicts(
      pedido(),
      contexto({
        conflictingBookings: [
          reservaExistente({ roomId: "outro", professorId: PROF_ANA }),
        ],
      })
    );

    expect(violacoes.map((v) => v.code)).toEqual(["PROFESSOR_CONFLICT"]);
  });

  it("encontra o conflito de turma", () => {
    const violacoes = findScheduleConflicts(
      pedido(),
      contexto({
        conflictingBookings: [
          reservaExistente({ roomId: "outro", classId: CLASS_SI8 }),
        ],
      })
    );

    expect(violacoes.map((v) => v.code)).toEqual(["CLASS_CONFLICT"]);
  });

  it("ignora capacidade e recursos, que são assunto de cada espaço", () => {
    // Turma enorme e recurso exigido: nada disso deve aparecer aqui, porque a
    // resposta depende de qual espaço se está olhando.
    const violacoes = findScheduleConflicts(
      pedido({ requiredResourceIds: [RES_COMPUTADORES] }),
      contexto({ classGroup: makeClass({ studentCount: 5000 }) })
    );

    expect(violacoes).toEqual([]);
  });

  it("devolve o período inválido, que também independe do espaço", () => {
    const violacoes = findScheduleConflicts(
      pedido({ startsAt: segunda("20:40"), endsAt: segunda("19:00") }),
      contexto()
    );

    expect(violacoes.map((v) => v.code)).toEqual(["INVALID_PERIOD"]);
  });

  it("não devolve nada quando o horário está livre", () => {
    expect(findScheduleConflicts(pedido(), contexto())).toEqual([]);
  });
});
