import { describe, expect, it } from "vitest";

import {
  caixasDoStatus,
  contarFiltrosAtivos,
  lerFiltros,
  statusDasCaixas,
} from "./filtros";

const PROFESSOR = "11111111-1111-1111-1111-111111111111";

describe("leitura dos filtros", () => {
  it("mostra só as agendadas quando a URL não diz nada", () => {
    expect(lerFiltros({})).toEqual({ status: "agendadas", professor: null });
  });

  it("aceita os status conhecidos e ignora o resto", () => {
    expect(lerFiltros({ status: "todas" }).status).toBe("todas");
    expect(lerFiltros({ status: "canceladas" }).status).toBe("canceladas");
    expect(lerFiltros({ status: "qualquer" }).status).toBe("agendadas");
  });

  // O id vai direto para a consulta: texto arbitrário faria o banco recusar.
  it("só aceita professor com formato de identificador", () => {
    expect(lerFiltros({ professor: PROFESSOR }).professor).toBe(PROFESSOR);
    expect(lerFiltros({ professor: "ana" }).professor).toBeNull();
  });
});

describe("caixas de status", () => {
  it("vai e volta entre as caixas e o valor da URL", () => {
    for (const status of ["agendadas", "canceladas", "todas"] as const) {
      expect(statusDasCaixas(caixasDoStatus(status))).toBe(status);
    }
  });

  it("volta ao padrão quando nenhuma caixa está marcada", () => {
    expect(statusDasCaixas({ agendadas: false, canceladas: false })).toBe(
      "agendadas"
    );
  });
});

it("conta só os filtros que fogem do padrão", () => {
  expect(contarFiltrosAtivos({ status: "agendadas", professor: null })).toBe(0);
  expect(contarFiltrosAtivos({ status: "todas", professor: PROFESSOR })).toBe(
    2
  );
});
