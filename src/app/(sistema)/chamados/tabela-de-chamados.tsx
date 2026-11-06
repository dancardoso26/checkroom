"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2, Hand, Trash2, X } from "lucide-react";

import {
  BarraDeFerramentas,
  BarraDeSelecao,
  CabecalhoDaSelecao,
  CelulaDaSelecao,
  LinhaVazia,
  MenuDeAcoes,
} from "@/components/cadastro";
import { CabecalhoOrdenavel } from "@/components/cabecalho-ordenavel";
import { FiltroMultiplo, passaNoFiltro } from "@/components/filtro-multiplo";
import { ConfirmarExclusao } from "@/components/formulario";
import { RodapeDaTabela } from "@/components/paginacao";
import { StatusBadge } from "@/components/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PRIORIDADES,
  ROTULO_DA_PRIORIDADE,
  ROTULO_DA_SITUACAO,
  SITUACOES,
  STATUS_DA_PRIORIDADE,
  STATUS_DA_SITUACAO,
} from "@/domain/chamados/chamado";
import { formatDateTime } from "@/lib/datetime";
import { usePesquisa } from "@/hooks/use-pesquisa";
import { useOrdenacao } from "@/hooks/use-ordenacao";
import { executarEmLote, usePaginacao, useSelecao } from "@/hooks/use-tabela";

import { assumirChamado, cancelarChamado, excluirChamado } from "./acoes";
import { DialogoResolverEmLote } from "./dialogos-de-chamado";
import { PESO_DA_PRIORIDADE, type Linha } from "./tipos";

export function TabelaDeChamados({
  chamados,
  veTodos,
  podeExcluir,
  pendente,
  onErro,
  onDetalhe,
  onAssumir,
  onResolver,
  onCancelar,
  onExcluir,
}: {
  chamados: Linha[];
  veTodos: boolean;
  podeExcluir: boolean;
  pendente: boolean;
  onErro: (mensagem: string | null) => void;
  onDetalhe: (chamado: Linha) => void;
  onAssumir: (chamado: Linha) => void;
  onResolver: (chamado: Linha) => void;
  onCancelar: (chamado: Linha) => void;
  onExcluir: (chamado: Linha) => void;
}) {
  const colunas = veTodos ? 8 : 7;

  const [situacoes, setSituacoes] = useState<string[]>([]);
  const [prioridades, setPrioridades] = useState<string[]>([]);
  const [pendenteEmLote, iniciarEmLote] = useTransition();
  const [resolvendoEmLote, setResolvendoEmLote] = useState(false);
  const [excluindoEmLote, setExcluindoEmLote] = useState(false);
  const [cancelandoEmLote, setCancelandoEmLote] = useState(false);

  const doFiltro = chamados.filter(
    (c) =>
      passaNoFiltro(situacoes, c.situacao) &&
      passaNoFiltro(prioridades, c.prioridade),
  );

  const { filtrados, pesquisa } = usePesquisa(
    doFiltro,
    (chamado) => [
      chamado.espaco,
      chamado.descricao,
      ROTULO_DA_PRIORIDADE[chamado.prioridade],
      ROTULO_DA_SITUACAO[chamado.situacao],
      veTodos ? chamado.solicitanteNome : null,
      formatDateTime(chamado.abertoEm),
    ],
    "Pesquisar chamados",
  );

  const emLote = (chamado: Linha) =>
    podeExcluir ||
    chamado.acoes.includes("assumir") ||
    chamado.acoes.includes("resolver") ||
    chamado.acoes.includes("cancelar");
  const { ordenados, controle } = useOrdenacao(filtrados, {
    espaco: (c) => c.espaco,
    problema: (c) => c.descricao,
    prioridade: (c) => PESO_DA_PRIORIDADE[c.prioridade],
    status: (c) => SITUACOES.indexOf(c.situacao),
    solicitante: (c) => c.solicitanteNome,
    criadoEm: (c) => c.abertoEm,
  });
  const { visiveis, rodape } = usePaginacao(ordenados);
  const selecao = useSelecao(
    chamados.filter(emLote).map((c) => c.id),
    visiveis.filter(emLote).map((c) => c.id),
  );
  const marcados = chamados.filter((c) => selecao.estaMarcado(c.id));
  const aAssumir = marcados.filter((c) => c.acoes.includes("assumir"));
  const aResolver = marcados.filter((c) => c.acoes.includes("resolver"));
  const aCancelar = marcados.filter((c) => c.acoes.includes("cancelar"));

  function assumirEmLote() {
    onErro(null);
    iniciarEmLote(async () => {
      const resultado = await executarEmLote(
        aAssumir,
        (c) => assumirChamado(c.id),
        (c) => c.descricao,
      );
      if (resultado.ok) {
        toast.success("Chamados assumidos.");
        selecao.limpar();
      } else onErro(resultado.mensagem);
    });
  }

  return (
    <>
      <BarraDeFerramentas
        pesquisa={pesquisa}
        filtros={
          <div className="flex flex-wrap gap-2">
            <FiltroMultiplo
              rotulo="Status"
              opcoes={SITUACOES.map((s) => ({
                id: s,
                nome: ROTULO_DA_SITUACAO[s],
              }))}
              valor={situacoes}
              onChange={setSituacoes}
            />
            <FiltroMultiplo
              rotulo="Prioridade"
              opcoes={PRIORIDADES.map((p) => ({
                id: p,
                nome: ROTULO_DA_PRIORIDADE[p],
              }))}
              valor={prioridades}
              onChange={setPrioridades}
            />
          </div>
        }
      />

      <div className="bg-card rounded-lg border">
        <BarraDeSelecao
          quantidade={marcados.length}
          singular="chamado"
          plural="chamados"
          onLimpar={selecao.limpar}
          acoes={[
            ...(aAssumir.length > 0
              ? [
                  {
                    rotulo: `Assumir (${aAssumir.length})`,
                    icone: Hand,
                    desabilitada: pendente || pendenteEmLote,
                    onExecutar: assumirEmLote,
                  },
                ]
              : []),
            ...(aResolver.length > 0
              ? [
                  {
                    rotulo: `Resolver (${aResolver.length})`,
                    icone: CheckCircle2,
                    onExecutar: () => setResolvendoEmLote(true),
                  },
                ]
              : []),
            ...(podeExcluir && marcados.length > 0
              ? [
                  {
                    rotulo: `Excluir (${marcados.length})`,
                    icone: Trash2,
                    destrutiva: true,
                    onExecutar: () => setExcluindoEmLote(true),
                  },
                ]
              : []),
            ...(aCancelar.length > 0
              ? [
                  {
                    rotulo: `Cancelar (${aCancelar.length})`,
                    icone: X,
                    destrutiva: true,
                    onExecutar: () => setCancelandoEmLote(true),
                  },
                ]
              : []),
          ]}
        />
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <CabecalhoDaSelecao selecao={selecao} />
              <CabecalhoOrdenavel
                coluna="problema"
                rotulo="Problema"
                controle={controle}
              />
              <CabecalhoOrdenavel
                coluna="criadoEm"
                className="w-[16%]"
                rotulo="Criado em"
                controle={controle}
              />
              <CabecalhoOrdenavel
                coluna="espaco"
                className="w-[11%]"
                rotulo="Espaço"
                controle={controle}
              />
              <CabecalhoOrdenavel
                coluna="status"
                className="w-[12%]"
                rotulo="Status"
                controle={controle}
              />
              <CabecalhoOrdenavel
                coluna="prioridade"
                className="w-[12%]"
                rotulo="Prioridade"
                controle={controle}
              />
              {veTodos && (
                <CabecalhoOrdenavel
                  coluna="solicitante"
                  className="w-[16%]"
                  rotulo="Solicitante"
                  controle={controle}
                />
              )}
              <TableHead className="w-[72px] text-right">
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filtrados.length === 0 && (
              <LinhaVazia colunas={colunas}>
                {chamados.length === 0
                  ? "Nenhum chamado encontrado."
                  : "Nenhum chamado corresponde à pesquisa."}
              </LinhaVazia>
            )}
            {visiveis.map((chamado) => (
              <TableRow
                key={chamado.id}
                data-chamado={chamado.descricao}
                tabIndex={0}
                className="cursor-pointer"
                onClick={() => onDetalhe(chamado)}
                onKeyDown={(evento) => {
                  if (evento.target !== evento.currentTarget) return;
                  if (evento.key === "Enter" || evento.key === " ") {
                    evento.preventDefault();
                    onDetalhe(chamado);
                  }
                }}
              >
                <CelulaDaSelecao
                  selecao={selecao}
                  id={chamado.id}
                  descricao={chamado.descricao}
                  desabilitada={!emLote(chamado)}
                />
                <TableCell className="max-w-xs truncate">
                  {chamado.descricao}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatDateTime(chamado.abertoEm)}
                </TableCell>
                <TableCell className="font-medium whitespace-nowrap">
                  {chamado.espaco}
                </TableCell>
                <TableCell>
                  <StatusBadge status={STATUS_DA_SITUACAO[chamado.situacao]} />
                </TableCell>
                <TableCell>
                  <StatusBadge
                    status={STATUS_DA_PRIORIDADE[chamado.prioridade]}
                  />
                </TableCell>
                {veTodos && <TableCell>{chamado.solicitanteNome}</TableCell>}
                <TableCell className="text-right">
                  <MenuDeAcoes
                    descricao={chamado.descricao}
                    acoes={[
                      ...(chamado.acoes.includes("assumir")
                        ? [
                            {
                              rotulo: "Assumir",
                              icone: Hand,
                              desabilitada: pendente,
                              onSelect: () => onAssumir(chamado),
                            },
                          ]
                        : []),
                      ...(chamado.acoes.includes("resolver")
                        ? [
                            {
                              rotulo: "Resolver",
                              icone: CheckCircle2,
                              onSelect: () => onResolver(chamado),
                            },
                          ]
                        : []),
                      ...(chamado.acoes.includes("cancelar")
                        ? [
                            {
                              rotulo: "Cancelar",
                              icone: X,
                              destrutiva: true,
                              onSelect: () => onCancelar(chamado),
                            },
                          ]
                        : []),
                      ...(podeExcluir
                        ? [
                            {
                              rotulo: "Excluir",
                              icone: Trash2,
                              destrutiva: true,
                              onSelect: () => onExcluir(chamado),
                            },
                          ]
                        : []),
                    ]}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <RodapeDaTabela {...rodape} />
      </div>

      {resolvendoEmLote && (
        <DialogoResolverEmLote
          chamados={aResolver}
          onFechar={() => {
            setResolvendoEmLote(false);
            selecao.limpar();
          }}
        />
      )}

      {excluindoEmLote && (
        <ConfirmarExclusao
          titulo={`Excluir ${marcados.length} ${marcados.length === 1 ? "chamado" : "chamados"}?`}
          descricao={marcados
            .map((c) => `${c.espaco}: ${c.descricao}`)
            .join("; ")}
          aviso="O registro é removido de vez e não aparece mais na fila."
          acao={() =>
            executarEmLote(
              marcados,
              (c) => excluirChamado(c.id),
              (c) => c.descricao,
            )
          }
          onFechar={() => {
            setExcluindoEmLote(false);
            selecao.limpar();
          }}
        />
      )}

      {cancelandoEmLote && (
        <ConfirmarExclusao
          titulo={`Cancelar ${aCancelar.length} ${aCancelar.length === 1 ? "chamado" : "chamados"}?`}
          descricao={aCancelar
            .map((c) => `${c.espaco}: ${c.descricao}`)
            .join("; ")}
          aviso="Só é possível cancelar enquanto ninguém da TI assumiu o chamado."
          acao={() =>
            executarEmLote(
              aCancelar,
              (c) => cancelarChamado(c.id),
              (c) => c.descricao,
            )
          }
          onFechar={() => setCancelandoEmLote(false)}
          rotuloDoBotao="Cancelar chamados"
          sucesso="Chamados cancelados."
        />
      )}
    </>
  );
}
