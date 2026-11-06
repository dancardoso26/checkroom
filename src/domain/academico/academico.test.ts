import { describe, expect, it } from "vitest";

import {
  validarCurso,
  validarDisciplina,
  validarTurma,
  validarVinculo,
  type Disciplina,
  type Turma,
  type Vinculo,
} from "./academico";

const SI = "curso-si";
const ENF = "curso-enf";

const disciplinas: Disciplina[] = [
  { id: "bd2", nome: "Banco de Dados II", cursoId: SI },
  { id: "saude", nome: "Saúde Coletiva", cursoId: ENF },
];

const turmas: Turma[] = [
  { id: "si8a", nome: "SI 8º semestre A", cursoId: SI, quantidadeDeAlunos: 42 },
  { id: "enf6a", nome: "ENF 6º semestre A", cursoId: ENF, quantidadeDeAlunos: 30 },
];

const vinculos: Vinculo[] = [
  { id: "v1", professorId: "ana", disciplinaId: "bd2", turmaId: "si8a", periodo: "2026.2" },
];

describe("validarCurso", () => {
  const cursos = [{ id: SI, nome: "Sistemas de Informação", departamento: "Ciências Exatas" }];

  it("exige nome e departamento", () => {
    const erros = validarCurso({ id: null, nome: "", departamento: " " }, cursos);
    expect(erros.nome).toBeDefined();
    expect(erros.departamento).toBeDefined();
  });

  it("recusa o mesmo curso no mesmo departamento, sem diferenciar acento", () => {
    const erros = validarCurso(
      { id: null, nome: "sistemas de informacao", departamento: "Ciências Exatas" },
      cursos
    );
    expect(erros.nome).toBeDefined();
  });
});

describe("validarDisciplina", () => {
  it("recusa nome repetido no mesmo curso", () => {
    expect(
      validarDisciplina({ id: null, nome: "Banco de dados II", cursoId: SI }, disciplinas).nome
    ).toBeDefined();
  });

  it("aceita o mesmo nome em outro curso", () => {
    expect(
      validarDisciplina({ id: null, nome: "Banco de Dados II", cursoId: ENF }, disciplinas)
    ).toEqual({});
  });
});

describe("validarTurma", () => {
  it("recusa turma sem nome", () => {
    expect(
      validarTurma({ id: null, nome: " ", cursoId: SI }, turmas).nome
    ).toHaveLength(1);
  });

  it("recusa nome repetido no mesmo curso", () => {
    expect(
      validarTurma({ id: null, nome: "SI 8º semestre A", cursoId: SI }, turmas).nome
    ).toHaveLength(1);
  });

  it("aceita a edição da própria turma com o mesmo nome", () => {
    expect(
      validarTurma({ id: "si8a", nome: "SI 8º semestre A", cursoId: SI }, turmas)
    ).toEqual({});
  });
});

describe("validarVinculo", () => {
  const contexto = { existentes: vinculos, disciplinas, turmas };

  it("aceita um vínculo novo e coerente", () => {
    expect(
      validarVinculo(
        { id: null, professorId: "carlos", disciplinaId: "bd2", turmaId: "si8a", periodo: "2026.2" },
        contexto
      )
    ).toEqual({});
  });

  it("recusa um vínculo idêntico já existente", () => {
    const erros = validarVinculo(
      { id: null, professorId: "ana", disciplinaId: "bd2", turmaId: "si8a", periodo: "2026.2" },
      contexto
    );
    expect(erros.professorId).toEqual(["Este vínculo já está cadastrado para o período."]);
  });

  it("aceita o mesmo vínculo em outro período", () => {
    expect(
      validarVinculo(
        { id: null, professorId: "ana", disciplinaId: "bd2", turmaId: "si8a", periodo: "2027.1" },
        contexto
      )
    ).toEqual({});
  });

  it("recusa disciplina e turma de cursos diferentes", () => {
    const erros = validarVinculo(
      { id: null, professorId: "ana", disciplinaId: "bd2", turmaId: "enf6a", periodo: "2026.2" },
      contexto
    );
    expect(erros.turmaId).toBeDefined();
  });

  it("recusa período fora do formato", () => {
    const erros = validarVinculo(
      { id: null, professorId: "ana", disciplinaId: "bd2", turmaId: "si8a", periodo: "2026/2" },
      contexto
    );
    expect(erros.periodo).toBeDefined();
  });
});
