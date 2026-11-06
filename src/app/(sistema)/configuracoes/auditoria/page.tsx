import { redirect } from "next/navigation";

import { CabecalhoOrdenavelDaUrl } from "@/components/cabecalho-ordenavel";
import { Paginacao } from "@/components/paginacao";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { podeVerAuditoria } from "@/domain/auth/permissoes";
import { correspondeABusca } from "@/domain/tabela/busca";
import { descreverEvento } from "@/domain/auditoria/descricao";
import { formatDateTime } from "@/lib/datetime";
import {
  carregarCatalogoDeAuditoria,
  listAuditLogs,
} from "@/lib/repositories/repositorio-de-auditoria";
import { ordenarPor } from "@/domain/tabela/ordenacao";
import { exigirSessao } from "@/lib/sessao";
import { lerPorPagina, paginar } from "@/domain/tabela/tabela";

import { BarraDaAuditoria } from "./busca";

const JANELA_DA_BUSCA = 1000;

export const metadata = { title: "Log de auditoria | CheckRoom" };
export const dynamic = "force-dynamic";

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    pagina?: string;
    porPagina?: string;
    acao?: string;
    usuario?: string;
    ordenar?: string;
    sentido?: string;
  }>;
}) {
  const sessao = await exigirSessao();
  const {
    q = "",
    pagina = "1",
    porPagina: pedido,
    acao: acoesPedidas = "",
    usuario: usuariosPedidos = "",
    ordenar,
    sentido,
  } = await searchParams;
  const acoesEscolhidas = acoesPedidas.split(",").filter(Boolean);
  const usuariosEscolhidos = usuariosPedidos.split(",").filter(Boolean);
  const porPagina = lerPorPagina(pedido);

  if (!podeVerAuditoria(sessao)) redirect("/reservas");

  const [registros, catalogo] = await Promise.all([
    listAuditLogs(JANELA_DA_BUSCA),
    carregarCatalogoDeAuditoria(),
  ]);

  const todas = registros.map((registro) => ({
    registro,
    ...descreverEvento(registro, catalogo),
  }));

  const opcoesDeAcao = [...new Set(todas.map((l) => l.acao))]
    .sort((a, b) => a.localeCompare(b, "pt-BR"))
    .map((acao) => ({ id: acao, nome: acao }));
  const opcoesDeUsuario = [
    ...new Set(todas.map((l) => l.registro.actorName ?? "Sistema")),
  ]
    .sort((a, b) => a.localeCompare(b, "pt-BR"))
    .map((nome) => ({ id: nome, nome }));

  const filtradas = todas
    .filter(
      ({ registro, acao }) =>
        (acoesEscolhidas.length === 0 || acoesEscolhidas.includes(acao)) &&
        (usuariosEscolhidos.length === 0 ||
          usuariosEscolhidos.includes(registro.actorName ?? "Sistema")),
    )
    .filter(({ registro, acao, detalhe }) =>
      correspondeABusca(
        [
          formatDateTime(registro.occurredAt),
          registro.actorName ?? "Sistema",
          registro.actorEmail,
          acao,
          detalhe,
        ],
        q,
      ),
    );

  const linhas = ordenarPor(
    filtradas,
    ordenar
      ? { coluna: ordenar, sentido: sentido === "desc" ? "desc" : "asc" }
      : null,
    {
      data: ({ registro }) => registro.occurredAt,
      usuario: ({ registro }) => registro.actorName ?? "Sistema",
      email: ({ registro }) => registro.actorEmail,
      acao: ({ acao }) => acao,
      descricao: ({ detalhe }) => detalhe,
    },
  );

  const paginacao = paginar(linhas.length, Number(pagina), porPagina);
  const visiveis = linhas.slice(paginacao.de, paginacao.ate + 1);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
        Log de auditoria
      </h1>

      <BarraDaAuditoria acoes={opcoesDeAcao} usuarios={opcoesDeUsuario} />

      <div className="bg-card rounded-lg border">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <CabecalhoOrdenavelDaUrl coluna="data" rotulo="Data e hora" className="w-[14%]" />
              <CabecalhoOrdenavelDaUrl coluna="usuario" rotulo="Usuário" className="w-[14%]" />
              <CabecalhoOrdenavelDaUrl coluna="email" rotulo="E-mail" className="w-[18%]" />
              <CabecalhoOrdenavelDaUrl coluna="acao" rotulo="Ação" className="w-[14%]" />
              <CabecalhoOrdenavelDaUrl coluna="descricao" rotulo="Descrição" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {visiveis.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center">
                  <p className="font-medium">
                    {q ||
                    acoesEscolhidas.length > 0 ||
                    usuariosEscolhidos.length > 0
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
                <TableCell className="min-w-72 whitespace-normal">
                  {detalhe}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Paginacao
          pagina={paginacao.pagina}
          totalDePaginas={paginacao.totalDePaginas}
          porPagina={porPagina}
          total={linhas.length}
        />
      </div>
    </div>
  );
}
