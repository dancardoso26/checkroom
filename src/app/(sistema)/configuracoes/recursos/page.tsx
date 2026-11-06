import { redirect } from "next/navigation";

import { podeGerenciarCadastros } from "@/domain/auth/permissoes";
import { listarRecursosParaGestao } from "@/lib/repositories/repositorio-de-recursos";
import { exigirSessao } from "@/lib/sessao";

import { CadastroDeRecursos } from "./cadastro-de-recursos";

export const metadata = { title: "Recursos | CheckRoom" };
export const dynamic = "force-dynamic";

export default async function RecursosPage() {
  const sessao = await exigirSessao();
  if (!podeGerenciarCadastros(sessao)) redirect("/reservas");

  return <CadastroDeRecursos recursos={await listarRecursosParaGestao()} />;
}
