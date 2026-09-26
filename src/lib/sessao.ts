import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Ator } from "@/domain/auth/permissoes";

export type Sessao = Ator & {
  nome: string;
  email: string;
  aceitouTermosEm: string | null;
  ehMaster: boolean;
};

// cache: o layout e a página pedem a sessão na mesma requisição, e sem isto
// seriam duas idas ao servidor de autenticação para a mesma resposta.
export const sessaoAtual = cache(
  async function sessaoAtual(): Promise<Sessao | null> {
    const supabase = await createSupabaseServerClient();

    // getUser valida o token junto ao servidor de autenticação. getSession leria
    // o cookie, que é controlado por quem faz a requisição.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, role, full_name, professor_id, terms_accepted_at, user_master")
      .eq("id", user.id)
      .maybeSingle();

    if (error || !data) return null;

    return {
      profileId: data.id,
      papel: data.role,
      professorId: data.professor_id,
      nome: data.full_name,
      email: user.email ?? "",
      aceitouTermosEm: data.terms_accepted_at,
      ehMaster: data.user_master,
    };
  }
);

// O aceite é barrado aqui, e não no middleware: ele roda no edge e teria de
// consultar o banco a cada requisição, inclusive as de arquivo estático.
export async function exigirSessao(): Promise<Sessao> {
  const sessao = await sessaoAtual();

  if (!sessao) redirect("/login");
  if (!sessao.aceitouTermosEm) redirect("/aceitar-termos");

  return sessao;
}
