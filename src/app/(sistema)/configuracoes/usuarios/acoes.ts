"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  PAPEIS_ATRIBUIVEIS,
  podeAlterarUsuario,
  podeGerenciarUsuarios,
  type Papel,
} from "@/domain/auth/permissoes";
import { registrarEventoDeAutenticacao } from "@/lib/auditoria";
import { enderecoDoSite } from "@/lib/endereco-do-site";
import {
  bloquearContaRemovida,
  convidar,
  reenviarConvite,
  definirAtivo,
  alvoDoUsuario,
} from "@/lib/repositories/userRepository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sessaoAtual } from "@/lib/sessao";

export type ResultadoDaAcao = { ok: true } | { ok: false; mensagem: string };

// A verificação é refeita aqui, e não só na tela: uma server action pode ser
// chamada direto, sem passar pelo menu que a esconde.
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

  // Pela sessão do admin, e não pela chave secreta: a função confere eh_admin()
  // e grava o autor na auditoria a partir de auth.uid().
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

export async function alterarPapel(
  alvoId: string,
  papel: Papel
): Promise<ResultadoDaAcao> {
  const sessao = await autorizar(alvoId);
  if (!sessao || !PAPEIS_ATRIBUIVEIS.includes(papel)) {
    return { ok: false, mensagem: "Este papel não pode ser atribuído." };
  }

  // Pela sessão do admin: a função confere eh_admin() e registra a auditoria.
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("alterar_papel", {
    p_alvo: alvoId,
    p_papel: papel,
  });

  if (error)
    return { ok: false, mensagem: "Não foi possível alterar o papel agora." };

  revalidatePath("/configuracoes/usuarios");
  return { ok: true };
}

const schemaDoConvite = z.object({
  nome: z.string().trim().min(3, "Informe o nome completo."),
  email: z.email("Informe um e-mail válido."),
  papel: z.enum(PAPEIS_ATRIBUIVEIS as [Papel, ...Papel[]]),
  professorId: z.uuid().nullable(),
});

export async function convidarUsuario(dados: {
  nome: string;
  email: string;
  papel: Papel;
  professorId: string | null;
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

  // Só professor tem vínculo docente; em outro papel o vínculo é descartado.
  const { nome, email, papel } = parsed.data;
  const professorId = papel === "professor" ? parsed.data.professorId : null;

  const redirecionarPara = await destinoDoConvite();

  const resultado = await convidar({
    nome,
    email,
    papel,
    professorId,
    redirecionarPara,
  });

  if (!resultado.ok) {
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

// Mesmo caminho da recuperação: o link vira sessão e a pessoa cria a senha.
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
