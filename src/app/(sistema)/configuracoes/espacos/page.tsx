import { redirect } from "next/navigation";

import { podeGerenciarCadastros } from "@/domain/auth/permissoes";
import { listResources } from "@/lib/repositories/repositorio-de-recursos";
import { listarEspacosParaGestao } from "@/lib/repositories/repositorio-de-espacos";
import { exigirSessao } from "@/lib/sessao";

import { CadastroDeEspacos } from "./cadastro-de-espacos";

export const metadata = { title: "Espaços | CheckRoom" };
export const dynamic = "force-dynamic";

export default async function EspacosPage() {
  const sessao = await exigirSessao();
  if (!podeGerenciarCadastros(sessao)) redirect("/reservas");

  const [espacos, recursos] = await Promise.all([
    listarEspacosParaGestao(),
    listResources(),
  ]);

  return <CadastroDeEspacos espacos={espacos} recursos={recursos} />;
}
