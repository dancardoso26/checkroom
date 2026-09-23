import "server-only";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Ator } from "@/domain/auth/permissoes";

export type Sessao = Ator & {
  nome: string;
  aceitouTermosEm: string | null;
};

export async function sessaoAtual(): Promise<Sessao | null> {
  const supabase = await createSupabaseServerClient();

  // getUser valida o token junto ao servidor de autenticação. getSession leria
  // o cookie, que é controlado por quem faz a requisição.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, full_name, professor_id, terms_accepted_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    profileId: data.id,
    papel: data.role,
    professorId: data.professor_id,
    nome: data.full_name,
    aceitouTermosEm: data.terms_accepted_at,
  };
}

export async function exigirSessao(): Promise<Sessao> {
  const sessao = await sessaoAtual();

  if (!sessao) redirect("/login");

  return sessao;
}
