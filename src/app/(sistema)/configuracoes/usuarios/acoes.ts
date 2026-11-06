"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { validarVinculo } from "@/domain/academico/academico";
import {
  PAPEIS_ATRIBUIVEIS,
  podeAlterarUsuario,
  podeGerenciarUsuarios,
  type Papel,
} from "@/domain/auth/permissoes";
import { registrarEventoDeAutenticacao } from "@/lib/auditoria";
import { enderecoDoSite } from "@/lib/endereco-do-site";
import { carregarCadastroAcademico, gravarEntidade } from "@/lib/repositories/repositorio-academico";
import { periodoLetivoVigente } from "@/lib/repositories/repositorio-do-calendario";
import {
  alvoDoUsuario,
  bloquearContaRemovida,
  contaDoUsuario,
  convidar,
  definirAtivo,
  desfazerProfessor,
  professorDoUsuario,
  reenviarConvite,
  vincularProfessor,
} from "@/lib/repositories/repositorio-de-usuarios";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sessaoAtual } from "@/lib/sessao";

export type ResultadoDaAcao = { ok: true } | { ok: false; mensagem: string };

async function autorizar(alvoId: string) {
  const sessao = await sessaoAtual();
  const alvo = await alvoDoUsuario(alvoId);

  if (!sessao || !alvo || !podeAlterarUsuario(sessao, alvo)) return null;
  return sessao;
}

export async function alterarAtivo(
  alvoId: string,
  ativo: boolean
): Promise<ResultadoDaAcao> {
  const sessao = await autorizar(alvoId);
  if (!sessao)
    return { ok: false, mensagem: "Esta conta não pode ser alterada." };

  try {
    await definirAtivo(alvoId, ativo);
  } catch {
    return { ok: false, mensagem: "Não foi possível alterar a conta agora." };
  }

  await registrarEventoDeAutenticacao(
    ativo ? "user_reactivated" : "user_deactivated",
    sessao.profileId,
    { alvo: alvoId }
  );

  revalidatePath("/configuracoes/usuarios");
  return { ok: true };
}

export async function removerUsuario(alvoId: string): Promise<ResultadoDaAcao> {
  const sessao = await autorizar(alvoId);
  if (!sessao)
    return { ok: false, mensagem: "Esta conta não pode ser removida." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("remover_usuario", { p_alvo: alvoId });

  if (error)
    return { ok: false, mensagem: "Não foi possível remover a conta agora." };

  try {
    await bloquearContaRemovida(alvoId);
  } catch {
    return {
      ok: false,
      mensagem:
        "A conta foi anonimizada, mas o login não foi bloqueado. Desative-a.",
    };
  }

  revalidatePath("/configuracoes/usuarios");
  return { ok: true };
}

const MENSAGEM_SEM_TURMA = "Informe a turma do aluno.";
const MENSAGEM_PROFESSOR_EM_USO =
  "Já existe um professor com este e-mail ligado a outra conta.";

export async function alterarPapel(
  alvoId: string,
  papel: Papel,
  turmaId: string | null = null
): Promise<ResultadoDaAcao> {
  const sessao = await autorizar(alvoId);
  if (!sessao || !PAPEIS_ATRIBUIVEIS.includes(papel)) {
    return { ok: false, mensagem: "Este papel não pode ser atribuído." };
  }

  const turma = papel === "student" ? turmaId : null;
  if (papel === "student" && !z.uuid().safeParse(turma).success) {
    return { ok: false, mensagem: MENSAGEM_SEM_TURMA };
  }

  const conta = papel === "professor" ? await contaDoUsuario(alvoId) : null;
  const professor = conta
    ? await professorDoUsuario(conta.nome, conta.email)
    : null;

  if (papel === "professor" && (!professor || !professor.ok)) {
    return {
      ok: false,
      mensagem:
        professor && professor.motivo === "ja_vinculado"
          ? MENSAGEM_PROFESSOR_EM_USO
          : "Não foi possível preparar o professor agora.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("alterar_papel", {
    p_alvo: alvoId,
    p_papel: papel,
    p_turma: turma,
  });

  if (error) {
    if (professor?.ok && professor.criado) await desfazerProfessor(professor.id, []);
    return { ok: false, mensagem: "Não foi possível alterar o papel agora." };
  }

  if (professor?.ok && !(await vincularProfessor(alvoId, professor.id))) {
    return {
      ok: false,
      mensagem:
        "O papel foi alterado, mas o vínculo de professor falhou. Tente de novo.",
    };
  }

  revalidatePath("/configuracoes/usuarios");
  return { ok: true };
}

const schemaDoConvite = z
  .object({
    nome: z.string().trim().min(3, "Informe o nome completo."),
    email: z.email("Informe um e-mail válido."),
    papel: z.enum(PAPEIS_ATRIBUIVEIS as [Papel, ...Papel[]]),
    turmaId: z.uuid().nullable(),
    vinculos: z
      .array(z.object({ disciplinaId: z.uuid(), turmaId: z.uuid() }))
      .max(30),
  })
  .refine((d) => d.papel !== "student" || d.turmaId !== null, {
    message: MENSAGEM_SEM_TURMA,
  });

export async function convidarUsuario(dados: {
  nome: string;
  email: string;
  papel: Papel;
  turmaId: string | null;
  vinculos: { disciplinaId: string; turmaId: string }[];
}): Promise<ResultadoDaAcao> {
  const sessao = await sessaoAtual();
  if (!sessao || !podeGerenciarUsuarios(sessao)) {
    return { ok: false, mensagem: "Apenas o administrador convida usuários." };
  }

  const parsed = schemaDoConvite.safeParse(dados);
  if (!parsed.success) {
    return {
      ok: false,
      mensagem: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const { nome, email, papel } = parsed.data;
  const turmaId = papel === "student" ? parsed.data.turmaId : null;
  const vinculos = papel === "professor" ? parsed.data.vinculos : [];

  const cadastro = await carregarCadastroAcademico();
  const periodo = await periodoLetivoVigente();

  const existente = cadastro.professores.find(
    (d) => d.email.toLowerCase() === email.trim().toLowerCase()
  );
  const existentes = cadastro.vinculos.filter(
    (v) => v.professorId === existente?.id && v.periodo === periodo
  );
  const pendentes = vinculos.filter(
    (v) =>
      !existentes.some(
        (e) => e.disciplinaId === v.disciplinaId && e.turmaId === v.turmaId
      )
  );

  const vistos = new Set<string>();
  for (const vinculo of pendentes) {
    const chave = `${vinculo.disciplinaId}:${vinculo.turmaId}`;
    if (vistos.has(chave)) {
      return { ok: false, mensagem: "Há vínculos repetidos na lista." };
    }
    vistos.add(chave);

    const erros = validarVinculo(
      {
        id: null,
        professorId: existente?.id ?? "novo",
        disciplinaId: vinculo.disciplinaId,
        turmaId: vinculo.turmaId,
        periodo,
      },
      {
        existentes: cadastro.vinculos,
        disciplinas: cadastro.disciplinas,
        turmas: cadastro.turmas,
      }
    );
    const mensagem = Object.values(erros).flat()[0];
    if (mensagem) return { ok: false, mensagem };
  }

  let professorId: string | null = null;
  let professorCriado = false;
  const vinculosCriados: string[] = [];

  if (papel === "professor") {
    const professor = await professorDoUsuario(nome, email);
    if (!professor.ok) {
      return {
        ok: false,
        mensagem:
          professor.motivo === "ja_vinculado"
            ? "Já existe uma conta com este e-mail."
            : "Não foi possível preparar o professor agora.",
      };
    }
    professorId = professor.id;
    professorCriado = professor.criado;

    for (const vinculo of pendentes) {
      const gravado = await gravarEntidade("teaching_assignments", null, {
        professor_id: professor.id,
        subject_id: vinculo.disciplinaId,
        class_id: vinculo.turmaId,
        term: periodo,
      });

      if (!gravado.ok) {
        await desfazerProfessor(
          professorCriado ? professorId : null,
          vinculosCriados
        );
        return {
          ok: false,
          mensagem: "Não foi possível gravar os vínculos do professor.",
        };
      }
      vinculosCriados.push(gravado.id);
    }
  }

  const redirecionarPara = await destinoDoConvite();

  const resultado = await convidar({
    nome,
    email,
    papel,
    professorId: professorId,
    turmaId,
    redirecionarPara,
  });

  if (!resultado.ok) {
    await desfazerProfessor(professorCriado ? professorId : null, vinculosCriados);
    return {
      ok: false,
      mensagem: resultado.jaExiste
        ? "Já existe uma conta com este e-mail."
        : "Não foi possível enviar o convite agora.",
    };
  }

  await registrarEventoDeAutenticacao("user_invited", sessao.profileId, {
    email,
    role: papel,
  });

  revalidatePath("/configuracoes/usuarios");
  return { ok: true };
}

async function destinoDoConvite(): Promise<string> {
  const origem = enderecoDoSite();
  return `${origem}/auth/confirmar?proximo=/nova-senha?convite=1`;
}

export async function reenviarConviteDoUsuario(
  alvoId: string
): Promise<ResultadoDaAcao> {
  const sessao = await autorizar(alvoId);
  if (!sessao)
    return { ok: false, mensagem: "Esta conta não pode ser alterada." };

  const resultado = await reenviarConvite(alvoId, await destinoDoConvite());

  if (resultado === "ja_ativo") {
    return {
      ok: false,
      mensagem: "Esta pessoa já criou a senha e não precisa de convite.",
    };
  }
  if (resultado === "falhou") {
    return {
      ok: false,
      mensagem: "Não foi possível reenviar o convite agora.",
    };
  }

  revalidatePath("/configuracoes/usuarios");
  return { ok: true };
}
