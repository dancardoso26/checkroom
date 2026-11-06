import { describe, expect, it } from "vitest";

import {
  calendarioDoDia,
  periodoDoDia,
  validarBloqueio,
  validarPeriodo,
  type Bloqueio,
  type PeriodoLetivo,
} from "./calendario";

const PERIODOS: PeriodoLetivo[] = [
  { id: "p1", codigo: "2026.2", inicio: "2026-08-03", fim: "2026-12-19" },
];

const BLOQUEIOS: Bloqueio[] = [
  { id: "b1", inicio: "2026-11-02", fim: "2026-11-02", espacoId: null, motivo: "Finados" },
  { id: "b2", inicio: "2026-10-19", fim: "2026-10-23", espacoId: "lab", motivo: "Manutenção" },
];

describe("calendarioDoDia", () => {
  it("encontra o período e os bloqueios que contêm o dia, com as pontas", () => {
    expect(calendarioDoDia(PERIODOS, BLOQUEIOS, "2026-10-23")).toEqual({
      periodo: { codigo: "2026.2" },
      bloqueios: [{ espacoId: "lab", motivo: "Manutenção" }],
    });
    expect(calendarioDoDia(PERIODOS, BLOQUEIOS, "2026-11-02").bloqueios).toEqual([
      { espacoId: null, motivo: "Finados" },
    ]);
  });

  it("dia fora de qualquer período não tem período", () => {
    expect(periodoDoDia(PERIODOS, "2026-12-20")).toBeNull();
    expect(calendarioDoDia(PERIODOS, [], "2027-01-10").periodo).toBeNull();
  });
});

describe("validarPeriodo", () => {
  it("aceita um período novo que não cruza os demais", () => {
    expect(
      validarPeriodo({ id: null, codigo: "2027.1", inicio: "2027-02-01", fim: "2027-06-30" }, PERIODOS)
    ).toEqual({});
  });

  it("recusa período que cruza outro", () => {
    expect(
      validarPeriodo({ id: null, codigo: "2027.1", inicio: "2026-12-01", fim: "2027-06-30" }, PERIODOS)
        .inicio
    ).toEqual(["As datas cruzam o período 2026.2."]);
  });

  it("recusa código repetido, fora do formato ou datas invertidas", () => {
    expect(
      validarPeriodo({ id: null, codigo: "2026.2", inicio: "2027-02-01", fim: "2027-06-30" }, PERIODOS)
        .codigo
    ).toBeDefined();
    expect(
      validarPeriodo({ id: null, codigo: "2027/1", inicio: "2027-02-01", fim: "2027-06-30" }, [])
        .codigo
    ).toBeDefined();
    expect(
      validarPeriodo({ id: null, codigo: "2027.1", inicio: "2027-06-30", fim: "2027-02-01" }, []).fim
    ).toBeDefined();
  });

  it("edita o próprio período sem acusar sobreposição consigo mesmo", () => {
    expect(
      validarPeriodo({ id: "p1", codigo: "2026.2", inicio: "2026-08-01", fim: "2026-12-20" }, PERIODOS)
    ).toEqual({});
  });
});

describe("validarBloqueio", () => {
  it("aceita bloqueio de um dia só", () => {
    expect(
      validarBloqueio({ id: null, inicio: "2026-11-20", fim: "2026-11-20", espacoId: null, motivo: "Consciência Negra" })
    ).toEqual({});
  });

  it("exige motivo e datas em ordem", () => {
    const erros = validarBloqueio({ id: null, inicio: "2026-11-21", fim: "2026-11-20", espacoId: null, motivo: " " });
    expect(erros.motivo).toBeDefined();
    expect(erros.fim).toBeDefined();
  });
});
