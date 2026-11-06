import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Ator } from "@/domain/auth/permissoes";
import { aceiteEmDia } from "@/domain/documentos/documentos";

export type Sessao = Ator & {
  nome: string;
  email: string;
  aceitouTermosEm: string | null;
  versaoAceita: string | null;
  ehMaster: boolean;
  cursoId: string | null;
  turmaId: string | null;
};

export const sessaoAtual = cache(
  async function sessaoAtual(): Promise<Sessao | null> {
    const supabase = await createSupabaseServerClient();

    const { data: token } = await supabase.auth.getClaims();
    const claims = token?.claims;

    if (!claims?.sub) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, role, full_name, professor_id, course_id, class_id, terms_accepted_at, terms_version, user_master"
      )
      .eq("id", claims.sub)
      .maybeSingle();

    if (error || !data) return null;

    return {
      profileId: data.id,
      papel: data.role,
      professorId: data.professor_id,
      nome: data.full_name,
      email: typeof claims.email === "string" ? claims.email : "",
      aceitouTermosEm: data.terms_accepted_at,
      versaoAceita: data.terms_version,
      ehMaster: data.user_master,
      cursoId: data.course_id,
      turmaId: data.class_id,
    };
  }
);

export async function exigirSessao(): Promise<Sessao> {
  const sessao = await sessaoAtual();

  if (!sessao) redirect("/login");
  if (!aceiteEmDia(sessao.versaoAceita)) redirect("/aceitar-termos");

  return sessao;
}
