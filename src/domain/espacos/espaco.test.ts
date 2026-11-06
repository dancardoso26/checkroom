import { describe, expect, it } from "vitest";

import {
  codigoDoEspaco,
  rotuloDoAndar,
  validarEspaco,
  validarRecurso,
  type DadosDoEspaco,
} from "./espaco";

function espaco(overrides: Partial<DadosDoEspaco> = {}): DadosDoEspaco {
  return {
    id: null,
    predio: 3,
    andar: "T",
    sala: 12,
    capacidade: 30,
    tipo: "laboratory",
    recursoIds: [],
    ...overrides,
  };
}

const EXISTENTES = [{ id: "lab", predio: 2, andar: "1", sala: 4 }];

describe("codigoDoEspaco", () => {
  it("monta o código no padrão prédio, andar e sala", () => {
    expect(codigoDoEspaco(3, "T", 12)).toBe("3T-12");
    expect(codigoDoEspaco(2, "3", 5)).toBe("23-05");
    expect(codigoDoEspaco(4, "s", 1)).toBe("4S-01");
    expect(codigoDoEspaco(1, "T", 105)).toBe("1T-105");
  });

  it("nomeia o andar por extenso", () => {
    expect(rotuloDoAndar("T")).toBe("Térreo");
    expect(rotuloDoAndar("S")).toBe("Subsolo");
    expect(rotuloDoAndar("3")).toBe("3º andar");
  });
});

describe("validarEspaco", () => {
  it("aceita um espaço completo", () => {
    expect(validarEspaco(espaco(), EXISTENTES)).toEqual({});
  });

  it("recusa capacidade zero ou negativa", () => {
    expect(validarEspaco(espaco({ capacidade: 0 }), []).capacidade).toHaveLength(1);
    expect(validarEspaco(espaco({ capacidade: -5 }), []).capacidade).toHaveLength(1);
  });

  it("recusa capacidade fracionada ou exagerada", () => {
    expect(validarEspaco(espaco({ capacidade: 2.5 }), []).capacidade).toBeDefined();
    expect(validarEspaco(espaco({ capacidade: 20000 }), []).capacidade).toBeDefined();
  });

  it("exige prédio, andar e sala válidos", () => {
    const erros = validarEspaco(espaco({ predio: 0, andar: "X", sala: Number.NaN }), []);

    expect(erros.predio).toBeDefined();
    expect(erros.andar).toBeDefined();
    expect(erros.sala).toBeDefined();
  });

  it("recusa o mesmo código, sem diferenciar a caixa do andar", () => {
    const erros = validarEspaco(espaco({ predio: 2, andar: "1", sala: 4 }), EXISTENTES);
    expect(erros.sala).toEqual(["Já existe o espaço 21-04."]);
  });

  it("aceita a mesma sala em outro andar", () => {
    expect(validarEspaco(espaco({ predio: 2, andar: "T", sala: 4 }), EXISTENTES)).toEqual({});
  });

  it("não acusa duplicidade do próprio espaço na edição", () => {
    expect(
      validarEspaco(espaco({ id: "lab", predio: 2, andar: "1", sala: 4 }), EXISTENTES)
    ).toEqual({});
  });
});

describe("validarRecurso", () => {
  const recursos = [{ id: "r1", nome: "Projetor" }];

  it("exige nome", () => {
    expect(validarRecurso({ id: null, nome: " " }, recursos).nome).toBeDefined();
  });

  it("recusa nome repetido, sem diferenciar acento", () => {
    expect(validarRecurso({ id: null, nome: "projetor" }, recursos).nome).toBeDefined();
  });

  it("aceita renomear o próprio recurso", () => {
    expect(validarRecurso({ id: "r1", nome: "Projetor" }, recursos)).toEqual({});
  });
});
