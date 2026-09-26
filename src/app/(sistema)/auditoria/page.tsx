import { redirect } from "next/navigation";

import { Paginacao } from "@/components/paginacao";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { podeVerAuditoria } from "@/domain/auth/permissoes";
import { correspondeABusca } from "@/domain/auditoria/busca";
import { descreverEvento } from "@/domain/auditoria/descricao";
import { formatDateTime } from "@/lib/datetime";
import {
  carregarCatalogoDeAuditoria,
  listAuditLogs,
} from "@/lib/repositories/auditRepository";
import { exigirSessao } from "@/lib/sessao";
import { lerPorPagina, paginar } from "@/lib/tabela";

import { BuscaNaAuditoria } from "./busca";

// A busca percorre os eventos mais recentes já descritos, porque a descrição é
// montada aqui a partir do JSON gravado, e não existe como coluna no banco.
const JANELA_DA_BUSCA = 1000;

export const metadata = { title: "Trilha de auditoria | CheckRoom" };
export const dynamic = "force-dynamic";

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pagina?: string; porPagina?: string }>;
}) {
  const sessao = await exigirSessao();
  const { q = "", pagina = "1", porPagina: pedido } = await searchParams;
  const porPagina = lerPorPagina(pedido);

  // A tela repete a verificação do banco porque uma política que nega devolve
  // lista vazia, e lista vazia parece sistema sem registro, não acesso negado.
  if (!podeVerAuditoria(sessao)) redirect("/reservas");

  const [registros, catalogo] = await Promise.all([
    listAuditLogs(JANELA_DA_BUSCA),
    carregarCatalogoDeAuditoria(),
  ]);

  const linhas = registros
    .map((registro) => ({ registro, ...descreverEvento(registro, catalogo) }))
    .filter(({ registro, acao, detalhe }) =>
      correspondeABusca(
        [
          formatDateTime(registro.occurredAt),
          registro.actorName ?? "Sistema",
          registro.actorEmail,
          acao,
          detalhe,
        ],
        q
      )
    );

  const paginacao = paginar(linhas.length, Number(pagina), porPagina);
  const visiveis = linhas.slice(paginacao.de, paginacao.ate + 1);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
            Trilha de auditoria
          </h1>
          <span className="text-muted-foreground text-sm">
            {q
              ? `${linhas.length} ${linhas.length === 1 ? "resultado" : "resultados"}`
              : `${linhas.length} ${linhas.length === 1 ? "evento" : "eventos"}`}
          </span>
        </div>

        <BuscaNaAuditoria />
      </div>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Descrição</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {visiveis.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center">
                  <p className="font-medium">
                    {q
                      ? "Nenhum evento corresponde à pesquisa"
                      : "Nenhum evento registrado ainda"}
                  </p>
                </TableCell>
              </TableRow>
            )}

            {visiveis.map(({ registro, acao, detalhe }) => (
              <TableRow key={registro.id}>
                <TableCell className="whitespace-nowrap">
                  {formatDateTime(registro.occurredAt)}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {registro.actorName ?? (
                    <span className="text-muted-foreground">Sistema</span>
                  )}
                </TableCell>
                <TableCell>
                  {registro.actorEmail ?? (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="font-normal">
                    {acao}
                  </Badge>
                </TableCell>
                {/* Quebra em várias linhas em vez de alargar a tabela: a
                    descrição de uma reserva é o texto mais longo da tela. */}
                <TableCell className="min-w-72 whitespace-normal">
                  {detalhe}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {linhas.length > 0 && (
          <Paginacao
            pagina={paginacao.pagina}
            totalDePaginas={paginacao.totalDePaginas}
            porPagina={porPagina}
          />
        )}
      </div>
    </div>
  );
}
