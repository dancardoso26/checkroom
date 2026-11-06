"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  validarCurso,
  validarDisciplina,
  validarTurma,
  validarVinculo,
} from "@/domain/academico/academico";
import { podeGerenciarCadastros } from "@/domain/auth/permissoes";
import { semErros, type ErrosPorCampo } from "@/domain/formulario/validacao";
import {
  falha,
  falhaDeValidacao,
  SUCESSO,
  texto,
  type EstadoDoFormulario,
  type ResultadoDaAcao,
} from "@/lib/formulario";
import {
  carregarCadastroAcademico,
  excluirEntidade,
  gravarEntidade,
  type EntidadeAcademica,
} from "@/lib/repositories/repositorio-academico";
import type { ResultadoDaGravacao } from "@/lib/repositories/erros";
import { sessaoAtual } from "@/lib/sessao";

const SEM_PERMISSAO = "Apenas a administração mantém o cadastro acadêmico.";

const id = z.union([z.uuid(), z.literal("")]).transform((v) => v || null);
const nome = z.string().trim().max(120, "Use no máximo 120 caracteres.");
const referencia = z.union([z.uuid(), z.literal("")]);

async function autorizado(): Promise<boolean> {
  const sessao = await sessaoAtual();
  return sessao !== null && podeGerenciarCadastros(sessao);
}

function campos(formData: FormData, nomes: string[]): Record<string, string> {
  return Object.fromEntries(nomes.map((n) => [n, texto(formData.get(n))]));
}

function concluir(
  resultado: ResultadoDaGravacao,
  duplicado: ErrosPorCampo
): EstadoDoFormulario {
  if (resultado.ok) {
    revalidatePath("/configuracoes/academico");
    return SUCESSO;
  }

  switch (resultado.falha) {
    case "duplicado":
      return falha(null, duplicado);
    case "em_uso":
      return falha("Um dos itens selecionados não existe mais. Atualize a página.");
    case "nao_encontrado":
      return falha("Este registro não existe mais. Atualize a página.");
    default:
      return falha("Não foi possível salvar agora.");
  }
}

async function salvarCom<T extends { id: string | null }>(
  formData: FormData,
  schema: z.ZodType<T>,
  nomes: string[],
  validar: (
    dados: T,
    cadastro: Awaited<ReturnType<typeof carregarCadastroAcademico>>
  ) => ErrosPorCampo,
  gravar: (dados: T) => Promise<ResultadoDaGravacao>,
  duplicado: ErrosPorCampo
): Promise<EstadoDoFormulario> {
  if (!(await autorizado())) return falha(SEM_PERMISSAO);

  const parsed = schema.safeParse(campos(formData, ["id", ...nomes]));
  if (!parsed.success) return falhaDeValidacao(parsed.error);

  const erros = validar(parsed.data, await carregarCadastroAcademico());
  if (!semErros(erros)) return falha(null, erros);

  return concluir(await gravar(parsed.data), duplicado);
}

export async function salvarCurso(
  _estado: EstadoDoFormulario,
  formData: FormData
): Promise<EstadoDoFormulario> {
  return salvarCom(
    formData,
    z.object({ id, nome, departamento: nome }),
    ["nome", "departamento"],
    (dados, cadastro) => validarCurso(dados, cadastro.cursos),
    (dados) =>
      gravarEntidade("courses", dados.id, {
        name: dados.nome,
        department: dados.departamento,
      }),
    { nome: ["Já existe um curso com este nome neste departamento."] }
  );
}

export async function salvarDisciplina(
  _estado: EstadoDoFormulario,
  formData: FormData
): Promise<EstadoDoFormulario> {
  return salvarCom(
    formData,
    z.object({ id, nome, cursoId: referencia }),
    ["nome", "cursoId"],
    (dados, cadastro) => validarDisciplina(dados, cadastro.disciplinas),
    (dados) =>
      gravarEntidade("subjects", dados.id, {
        name: dados.nome,
        course_id: dados.cursoId,
      }),
    { nome: ["Este curso já tem uma disciplina com este nome."] }
  );
}

export async function salvarTurma(
  _estado: EstadoDoFormulario,
  formData: FormData
): Promise<EstadoDoFormulario> {
  return salvarCom(
    formData,
    z.object({ id, nome, cursoId: referencia }),
    ["nome", "cursoId"],
    (dados, cadastro) => validarTurma(dados, cadastro.turmas),
    (dados) =>
      gravarEntidade("classes", dados.id, {
        name: dados.nome,
        course_id: dados.cursoId,
      }),
    { nome: ["Este curso já tem uma turma com este nome."] }
  );
}

export async function salvarVinculo(
  _estado: EstadoDoFormulario,
  formData: FormData
): Promise<EstadoDoFormulario> {
  return salvarCom(
    formData,
    z.object({
      id,
      professorId: referencia,
      disciplinaId: referencia,
      turmaId: referencia,
      periodo: z.string().trim(),
    }),
    ["professorId", "disciplinaId", "turmaId", "periodo"],
    (dados, cadastro) =>
      validarVinculo(dados, {
        existentes: cadastro.vinculos,
        disciplinas: cadastro.disciplinas,
        turmas: cadastro.turmas,
      }),
    (dados) =>
      gravarEntidade("teaching_assignments", dados.id, {
        professor_id: dados.professorId,
        subject_id: dados.disciplinaId,
        class_id: dados.turmaId,
        term: dados.periodo,
      }),
    { professorId: ["Este vínculo já está cadastrado para o período."] }
  );
}

const EM_USO: Record<EntidadeAcademica, string> = {
  courses:
    "Este curso tem turmas, disciplinas, alunos ou palestras e não pode ser excluído.",
  subjects: "Esta disciplina tem vínculos ou reservas e não pode ser excluída.",
  classes: "Esta turma tem vínculos ou reservas e não pode ser excluída.",
  professors: "Este professor tem vínculos ou reservas e não pode ser excluído.",
  teaching_assignments: "Este vínculo não pode ser excluído.",
};

export async function excluirDoCadastro(
  entidade: EntidadeAcademica,
  registroId: string
): Promise<ResultadoDaAcao> {
  if (!(await autorizado())) return { ok: false, mensagem: SEM_PERMISSAO };

  const resultado = await excluirEntidade(entidade, registroId);

  if (!resultado.ok) {
    return {
      ok: false,
      mensagem:
        resultado.falha === "em_uso"
          ? EM_USO[entidade]
          : resultado.falha === "nao_encontrado"
            ? "Este registro não existe mais. Atualize a página."
            : "Não foi possível excluir agora.",
    };
  }

  revalidatePath("/configuracoes/academico");
  return { ok: true };
}
