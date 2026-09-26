import { redirect } from "next/navigation";

import { podeGerenciarUsuarios } from "@/domain/auth/permissoes";
import { exigirSessao } from "@/lib/sessao";

// As opções ficam na barra lateral, que entra em modo de configurações nesta
// rota. Aqui fica só a verificação de acesso, que vale para todas as telas.
export default async function ConfiguracoesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessao = await exigirSessao();
  if (!podeGerenciarUsuarios(sessao)) redirect("/reservas");

  return children;
}
