import "server-only";

import type { AlvoDeGestao, Papel } from "@/domain/auth/permissoes";
import { supabaseAdmin } from "@/lib/supabase/server";

export type UsuarioItem = {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  criadoEm: Date;
  ultimoAcessoEm: Date | null;
  ativo: boolean;
  /** Convidado que ainda não abriu o link e criou a senha. */
  convitePendente: boolean;
  ehMaster: boolean;
};

// Chave secreta porque e-mail, último acesso e bloqueio moram em auth.users,
// que não é exposto à API. Quem chama precisa ter conferido que é admin.
export async function listarUsuarios(): Promise<UsuarioItem[]> {
  const [contas, perfis] = await Promise.all([
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
    supabaseAdmin
      .from("profiles")
      .select("id, role, full_name, anonymized_at, user_master")
      .is("anonymized_at", null),
  ]);

  if (contas.error)
    throw new Error(`Falha ao listar contas: ${contas.error.message}`);
  if (perfis.error)
    throw new Error(`Falha ao listar perfis: ${perfis.error.message}`);

  const porId = new Map(contas.data.users.map((u) => [u.id, u]));
  const agora = Date.now();

  return perfis.data
    .flatMap((perfil) => {
      const conta = porId.get(perfil.id);
      if (!conta) return [];

      const banidoAte = conta.banned_until ? Date.parse(conta.banned_until) : 0;

      return [
        {
          id: perfil.id,
          nome: perfil.full_name,
          email: conta.email ?? "",
          papel: perfil.role,
          criadoEm: new Date(conta.created_at),
          ultimoAcessoEm: conta.last_sign_in_at
            ? new Date(conta.last_sign_in_at)
            : null,
          ativo: banidoAte <= agora,
          convitePendente: !conta.email_confirmed_at,
          ehMaster: perfil.user_master,
        },
      ];
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function alvoDoUsuario(id: string): Promise<AlvoDeGestao | null> {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("role, user_master")
    .eq("id", id)
    .maybeSingle();

  return data ? { id, papel: data.role, ehMaster: data.user_master } : null;
}

// Desativar é bloquear o login no Auth, reversível. O token já emitido vale
// até expirar, em no máximo uma hora.
export async function definirAtivo(id: string, ativo: boolean): Promise<void> {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
    ban_duration: ativo ? "none" : "876000h",
  });

  if (error) throw new Error(`Falha ao alterar a conta: ${error.message}`);
}

// A linha em auth.users fica, porque o profile não pode ser apagado; o e-mail é
// trocado para liberar o original e o login é bloqueado de vez.
export async function bloquearContaRemovida(id: string): Promise<void> {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
    email: `removido-${id}@checkroom.invalid`,
    ban_duration: "876000h",
  });

  if (error)
    throw new Error(`Falha ao bloquear a conta removida: ${error.message}`);
}

export type DocenteSemConta = { id: string; nome: string };

// Docentes cadastrados que ainda não têm conta ligada: um mesmo professor não
// pode ter duas contas, e o banco recusaria (professor_id é único em profiles).
export async function docentesSemConta(): Promise<DocenteSemConta[]> {
  const [docentes, perfis] = await Promise.all([
    supabaseAdmin.from("professors").select("id, name").order("name"),
    supabaseAdmin
      .from("profiles")
      .select("professor_id")
      .not("professor_id", "is", null),
  ]);

  if (docentes.error)
    throw new Error(`Falha ao listar docentes: ${docentes.error.message}`);

  const vinculados = new Set((perfis.data ?? []).map((p) => p.professor_id));
  return docentes.data
    .filter((d) => !vinculados.has(d.id))
    .map((d) => ({ id: d.id, nome: d.name }));
}

// O Supabase cria a conta e manda o e-mail com o link; a trigger
// on_auth_user_created monta o perfil a partir destes metadados.
export async function convidar(convite: {
  email: string;
  nome: string;
  papel: Papel;
  professorId: string | null;
  redirecionarPara: string;
}): Promise<{ ok: true } | { ok: false; jaExiste: boolean }> {
  // Só o nome vai nos metadados do usuário. O papel e o vínculo são gravados
  // depois, pelo servidor: a trigger não confia no que o cadastro informa.
  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    convite.email,
    { data: { full_name: convite.nome }, redirectTo: convite.redirecionarPara }
  );

  if (error) {
    console.error("Falha ao convidar usuário:", error);
    return {
      ok: false,
      jaExiste: error.code === "email_exists" || /already/i.test(error.message),
    };
  }

  const { error: falha } = await supabaseAdmin
    .from("profiles")
    .update({ role: convite.papel, professor_id: convite.professorId })
    .eq("id", data.user.id);

  if (falha) {
    // Sem o papel certo a conta ficaria como aluno: melhor desfazer o convite.
    console.error("Falha ao definir o papel do convidado:", falha);
    await supabaseAdmin.auth.admin.deleteUser(data.user.id);
    return { ok: false, jaExiste: false };
  }

  return { ok: true };
}

// Reenvia o link para quem ainda não criou a senha. O Supabase aceita convidar
// de novo um e-mail já convidado, desde que a conta não tenha sido confirmada;
// o link anterior deixa de valer.
export async function reenviarConvite(
  id: string,
  redirecionarPara: string
): Promise<"reenviado" | "ja_ativo" | "falhou"> {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(id);
  if (error || !data.user?.email) return "falhou";
  if (data.user.email_confirmed_at) return "ja_ativo";

  const { error: falha } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    data.user.email,
    {
      data: { full_name: data.user.user_metadata.full_name },
      redirectTo: redirecionarPara,
    }
  );

  if (falha) {
    console.error("Falha ao reenviar convite:", falha);
    return "falhou";
  }

  return "reenviado";
}
