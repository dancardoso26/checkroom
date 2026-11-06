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
  convitePendente: boolean;
  ehMaster: boolean;
  cursoId: string | null;
  cursoNome: string | null;
  turmaId: string | null;
  turmaNome: string | null;
};

export async function listarUsuarios(): Promise<UsuarioItem[]> {
  const [contas, perfis] = await Promise.all([
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
    supabaseAdmin
      .from("profiles")
      .select("id, role, full_name, anonymized_at, user_master, course_id, courses(name), class_id, classes(name)")
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
          cursoId: perfil.course_id,
          cursoNome: perfil.courses?.name ?? null,
          turmaId: perfil.class_id,
          turmaNome: perfil.classes?.name ?? null,
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

export async function definirAtivo(id: string, ativo: boolean): Promise<void> {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
    ban_duration: ativo ? "none" : "876000h",
  });

  if (error) throw new Error(`Falha ao alterar a conta: ${error.message}`);
}

export async function bloquearContaRemovida(id: string): Promise<void> {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
    email: `removido-${id}@checkroom.invalid`,
    ban_duration: "876000h",
  });

  if (error)
    throw new Error(`Falha ao bloquear a conta removida: ${error.message}`);
}

export type ProfessorDoUsuario =
  | { ok: true; id: string; criado: boolean }
  | { ok: false; motivo: "ja_vinculado" | "falhou" };

function padraoExato(valor: string): string {
  return valor.replace(/[\\%_]/g, "\\$&");
}

export async function professorDoUsuario(
  nome: string,
  email: string
): Promise<ProfessorDoUsuario> {
  const emailNormalizado = email.trim().toLowerCase();

  const { data: existente, error } = await supabaseAdmin
    .from("professors")
    .select("id")
    .ilike("email", padraoExato(emailNormalizado))
    .maybeSingle();

  if (error) {
    console.error("Falha ao buscar o professor:", error);
    return { ok: false, motivo: "falhou" };
  }

  if (existente) {
    const { data: perfil } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("professor_id", existente.id)
      .maybeSingle();

    if (perfil) return { ok: false, motivo: "ja_vinculado" };
    return { ok: true, id: existente.id, criado: false };
  }

  const { data: novo, error: falha } = await supabaseAdmin
    .from("professors")
    .insert({ name: nome.trim(), email: emailNormalizado })
    .select("id")
    .single();

  if (falha) {
    console.error("Falha ao criar o professor:", falha);
    return { ok: false, motivo: "falhou" };
  }

  return { ok: true, id: novo.id, criado: true };
}

export async function desfazerProfessor(
  professorId: string | null,
  vinculos: string[]
): Promise<void> {
  if (vinculos.length > 0) {
    const { error } = await supabaseAdmin
      .from("teaching_assignments")
      .delete()
      .in("id", vinculos);
    if (error) console.error("Falha ao desfazer os vínculos:", error);
  }

  if (professorId) {
    const { error } = await supabaseAdmin
      .from("professors")
      .delete()
      .eq("id", professorId);
    if (error) console.error("Falha ao desfazer o professor:", error);
  }
}

export async function vincularProfessor(
  perfilId: string,
  professorId: string
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ professor_id: professorId })
    .eq("id", perfilId);

  if (error) console.error("Falha ao vincular o professor:", error);
  return !error;
}

export async function contaDoUsuario(
  id: string
): Promise<{ nome: string; email: string } | null> {
  const [conta, perfil] = await Promise.all([
    supabaseAdmin.auth.admin.getUserById(id),
    supabaseAdmin.from("profiles").select("full_name").eq("id", id).maybeSingle(),
  ]);

  const email = conta.data.user?.email;
  if (!email || !perfil.data) return null;
  return { nome: perfil.data.full_name, email };
}

export async function convidar(convite: {
  email: string;
  nome: string;
  papel: Papel;
  professorId: string | null;
  turmaId: string | null;
  redirecionarPara: string;
}): Promise<{ ok: true } | { ok: false; jaExiste: boolean }> {
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
    .update({
      role: convite.papel,
      professor_id: convite.professorId,
      class_id: convite.turmaId,
    })
    .eq("id", data.user.id);

  if (falha) {
    console.error("Falha ao definir o papel do convidado:", falha);
    await supabaseAdmin.auth.admin.deleteUser(data.user.id);
    return { ok: false, jaExiste: false };
  }

  return { ok: true };
}

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
