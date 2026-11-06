import { redirect } from "next/navigation";

import { podeGerenciarUsuarios } from "@/domain/auth/permissoes";
import { exigirSessao } from "@/lib/sessao";

export default async function ConfiguracoesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessao = await exigirSessao();
  if (!podeGerenciarUsuarios(sessao)) redirect("/reservas");

  return children;
}
