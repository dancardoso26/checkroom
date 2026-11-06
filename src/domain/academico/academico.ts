import { normalizar } from "@/domain/tabela/busca";
import type { ErrosPorCampo } from "@/domain/formulario/validacao";

export type Curso = { id: string; nome: string; departamento: string };
export type Disciplina = { id: string; nome: string; cursoId: string };
export type Turma = {
  id: string;
  nome: string;
  cursoId: string;
  quantidadeDeAlunos: number;
};
export type Professor = { id: string; nome: string; email: string };
export type Vinculo = {
  id: string;
  professorId: string;
  disciplinaId: string;
  turmaId: string;
  periodo: string;
};

type Novo<T> = Omit<T, "id"> & { id: string | null };

const FORMATO_DO_PERIODO = /^\d{4}\.[12]$/;

function obrigatorio(
  erros: ErrosPorCampo,
  campo: string,
  valor: string,
  mensagem: string
) {
  if (valor.trim() === "") erros[campo] = [mensagem];
}

function mesmo(a: string, b: string): boolean {
  return normalizar(a) === normalizar(b);
}

export function validarCurso(dados: Novo<Curso>, existentes: Curso[]): ErrosPorCampo {
  const erros: ErrosPorCampo = {};
  obrigatorio(erros, "nome", dados.nome, "Informe o nome do curso.");
  obrigatorio(erros, "departamento", dados.departamento, "Informe o departamento.");

  if (
    !erros.nome &&
    existentes.some(
      (c) =>
        c.id !== dados.id &&
        mesmo(c.nome, dados.nome) &&
        mesmo(c.departamento, dados.departamento)
    )
  ) {
    erros.nome = ["Já existe um curso com este nome neste departamento."];
  }

  return erros;
}

export function validarDisciplina(
  dados: Novo<Disciplina>,
  existentes: Disciplina[]
): ErrosPorCampo {
  const erros: ErrosPorCampo = {};
  obrigatorio(erros, "nome", dados.nome, "Informe o nome da disciplina.");
  obrigatorio(erros, "cursoId", dados.cursoId, "Selecione o curso.");

  if (
    !erros.nome &&
    existentes.some(
      (d) =>
        d.id !== dados.id &&
        d.cursoId === dados.cursoId &&
        mesmo(d.nome, dados.nome)
    )
  ) {
    erros.nome = ["Este curso já tem uma disciplina com este nome."];
  }

  return erros;
}

export function validarTurma(
  dados: Omit<Novo<Turma>, "quantidadeDeAlunos">,
  existentes: Turma[]
): ErrosPorCampo {
  const erros: ErrosPorCampo = {};
  obrigatorio(erros, "nome", dados.nome, "Informe o nome da turma.");
  obrigatorio(erros, "cursoId", dados.cursoId, "Selecione o curso.");

  if (
    !erros.nome &&
    existentes.some(
      (t) =>
        t.id !== dados.id &&
        t.cursoId === dados.cursoId &&
        mesmo(t.nome, dados.nome)
    )
  ) {
    erros.nome = ["Este curso já tem uma turma com este nome."];
  }

  return erros;
}

export function validarVinculo(
  dados: Novo<Vinculo>,
  contexto: {
    existentes: Vinculo[];
    disciplinas: Disciplina[];
    turmas: Turma[];
  }
): ErrosPorCampo {
  const erros: ErrosPorCampo = {};
  obrigatorio(erros, "professorId", dados.professorId, "Selecione o professor.");
  obrigatorio(erros, "disciplinaId", dados.disciplinaId, "Selecione a disciplina.");
  obrigatorio(erros, "turmaId", dados.turmaId, "Selecione a turma.");

  if (!FORMATO_DO_PERIODO.test(dados.periodo.trim())) {
    erros.periodo = ["Informe o período no formato ano.semestre, como 2026.2."];
  }

  const disciplina = contexto.disciplinas.find((d) => d.id === dados.disciplinaId);
  const turma = contexto.turmas.find((t) => t.id === dados.turmaId);

  if (disciplina && turma && disciplina.cursoId !== turma.cursoId) {
    erros.turmaId = ["A turma precisa ser do mesmo curso da disciplina."];
  }

  const duplicado = contexto.existentes.some(
    (v) =>
      v.id !== dados.id &&
      v.professorId === dados.professorId &&
      v.disciplinaId === dados.disciplinaId &&
      v.turmaId === dados.turmaId &&
      v.periodo === dados.periodo.trim()
  );

  if (duplicado) {
    erros.professorId = ["Este vínculo já está cadastrado para o período."];
  }

  return erros;
}
