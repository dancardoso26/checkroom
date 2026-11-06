"use server";

import { redirect } from "next/navigation";

import {
  createSupabaseServerClient,
  supabaseAdmin,
} from "@/lib/supabase/server";

export type ExclusaoDeContaState =
  { status: "idle" } | { status: "error"; message: string };

export async function excluirConta(): Promise<ExclusaoDeContaState> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase.rpc("anonimizar_conta");

  if (error) {
    return {
      status: "error",
      message: "Não foi possível remover a conta agora. Tente novamente.",
    };
  }

  await supabaseAdmin.auth.admin.updateUserById(user.id, {
    email: `removido-${user.id}@checkroom.invalid`,
    ban_duration: "876000h",
  });

  await supabase.auth.signOut();
  redirect("/login?conta=removida");
}
