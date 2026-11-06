import { redirect } from "next/navigation";

import {
  podeAbrirChamado,
  podeExcluirChamado,
  podeVerTodosOsChamados,
} from "@/domain/auth/permissoes";
import { acoesDisponiveis, ordenarFila } from "@/domain/chamados/chamado";
import { listRooms } from "@/lib/repositories/repositorio-de-espacos";
import { listarChamados } from "@/lib/repositories/repositorio-de-chamados";
import { exigirSessao } from "@/lib/sessao";

import { ListaDeChamados } from "./lista-de-chamados";

export const metadata = { title: "Chamados | CheckRoom" };
export const dynamic = "force-dynamic";

export default async function ChamadosPage({
  searchParams,
}: {
  searchParams: Promise<{ chamado?: string }>;
}) {
  const { chamado: chamadoEmFoco } = await searchParams;
  const sessao = await exigirSessao();
  const veTodos = podeVerTodosOsChamados(sessao);
  const abre = podeAbrirChamado(sessao);

  if (!veTodos && !abre) redirect("/reservas");

  const [chamados, espacos] = await Promise.all([
    listarChamados(),
    abre ? listRooms() : Promise.resolve([]),
  ]);

  return (
    <ListaDeChamados
      chamadoEmFoco={chamadoEmFoco ?? null}
      chamados={ordenarFila(chamados).map((c) => ({
        ...c,
        acoes: acoesDisponiveis(c, sessao),
      }))}
      espacos={espacos.map((e) => ({ id: e.id, nome: e.name }))}
      podeAbrir={abre}
      podeExcluir={podeExcluirChamado(sessao)}
      veTodos={veTodos}
    />
  );
}
