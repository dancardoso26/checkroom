import { describe, expect, it } from "vitest";

import { mesmoNome, professorDoPalestrante } from "./palestrante";

const PROFESSORES = [
  { id: "1", name: "Daniel Cardoso Leão" },
  { id: "2", name: "Carlos Eduardo Lima" },
];

describe("professorDoPalestrante", () => {
  it("reconhece o professor escolhido da lista", () => {
    expect(professorDoPalestrante("Carlos Eduardo Lima", PROFESSORES)).toEqual(
      PROFESSORES[1],
    );
  });

  it("ignora maiúsculas e espaços a mais", () => {
    expect(
      professorDoPalestrante("  daniel   cardoso leão ", PROFESSORES),
    ).toEqual(PROFESSORES[0]);
  });

  it("não reconhece um convidado externo", () => {
    expect(professorDoPalestrante("Dra. Fulana", PROFESSORES)).toBeNull();
  });

  it("não reconhece texto vazio", () => {
    expect(professorDoPalestrante("   ", PROFESSORES)).toBeNull();
  });

  it("não escolhe quando dois professores têm o mesmo nome", () => {
    const repetidos = [
      { id: "1", name: "Ana Souza" },
      { id: "2", name: "Ana Souza" },
    ];
    expect(professorDoPalestrante("Ana Souza", repetidos)).toBeNull();
  });
});

describe("mesmoNome", () => {
  it("compara sem diferenciar maiúsculas nem espaços", () => {
    expect(mesmoNome(" Ana  Souza", "ana souza")).toBe(true);
    expect(mesmoNome("Ana Souza", "Ana Sousa")).toBe(false);
  });
});
