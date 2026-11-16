"use server";

import { redirect } from "next/navigation";

import {
  criarClienteDoServidor,
  clienteAdministrativo,
} from "@/lib/supabase/servidor";

export type EstadoDaExclusaoDeConta =
  { status: "inicial" } | { status: "erro"; message: string };

export async function excluirConta(): Promise<EstadoDaExclusaoDeConta> {
  const supabase = await criarClienteDoServidor();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase.rpc("anonimizar_conta");

  if (error) {
    return {
      status: "erro",
      message: "Não foi possível remover a conta agora. Tente novamente.",
    };
  }

  await clienteAdministrativo.auth.admin.updateUserById(user.id, {
    email: `removido-${user.id}@checkroom.invalid`,
    ban_duration: "876000h",
  });

  await supabase.auth.signOut();
  redirect("/login?conta=removida");
}
