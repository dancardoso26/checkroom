import { describe, expect, it } from "vitest";

import { STATUS, statusDaReserva } from "./status";

const AGORA = new Date("2026-09-28T22:00:00Z");

describe("status da reserva", () => {
  it("cancelada vence qualquer horário", () => {
    expect(
      statusDaReserva(
        { cancelled: true, endsAt: new Date("2026-09-20T00:00:00Z") },
        AGORA
      )
    ).toBe("cancelada");
  });

  it("concluída quando o término já passou", () => {
    expect(statusDaReserva({ cancelled: false, endsAt: AGORA }, AGORA)).toBe(
      "concluida"
    );
  });

  it("agendada enquanto não terminou", () => {
    expect(
      statusDaReserva(
        { cancelled: false, endsAt: new Date("2026-09-29T00:00:00Z") },
        AGORA
      )
    ).toBe("agendada");
  });
});

it("segue o padrão de cores", () => {
  expect(STATUS.agendada.tom).toBe("informacao");
  expect(STATUS.concluida.tom).toBe("sucesso");
  expect(STATUS.ativo.tom).toBe("sucesso");
  expect(STATUS.cancelada.tom).toBe("perigo");
  expect(STATUS.inativo.tom).toBe("perigo");
});
