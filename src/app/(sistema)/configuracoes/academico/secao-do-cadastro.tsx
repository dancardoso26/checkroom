"use client";

import { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Plus, Trash2 } from "lucide-react";

import {
  AcoesDaLinha,
  BarraDeFerramentas,
  BarraDeSelecao,
  CabecalhoDaSelecao,
  CelulaDaSelecao,
  LinhaVazia,
} from "@/components/cadastro";
import { CabecalhoOrdenavel } from "@/components/cabecalho-ordenavel";
import {
  FiltroMultiplo,
  passaNoFiltro,
  type OpcaoDoFiltro,
} from "@/components/filtro-multiplo";
import { ConfirmarExclusao } from "@/components/formulario";
import { RodapeDaTabela } from "@/components/paginacao";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { EntidadeAcademica } from "@/lib/repositories/repositorio-academico";
import { useOrdenacao } from "@/hooks/use-ordenacao";
import { usePesquisa } from "@/hooks/use-pesquisa";
import { executarEmLote, usePaginacao, useSelecao } from "@/hooks/use-tabela";

import { excluirDoCadastro } from "./acoes";

export const ID_DA_ACAO_DO_TITULO = "acao-do-cadastro-academico";

const semAssinatura = () => () => {};

function NaLinhaDoTitulo({ children }: { children: React.ReactNode }) {
  const alvo = useSyncExternalStore(
    semAssinatura,
    () => document.getElementById(ID_DA_ACAO_DO_TITULO),
    () => null,
  );

  return alvo ? createPortal(children, alvo) : null;
}

type Coluna<T> = {
  titulo: string;
  valor: (item: T) => React.ReactNode;
  destaque?: boolean;
  numerica?: boolean;
};

type FiltroDaSecao<T> = {
  rotulo: string;
  opcoes: OpcaoDoFiltro[];
  valor: (item: T) => string | null;
};

function textoDe(no: React.ReactNode): string {
  if (typeof no === "string" || typeof no === "number") return String(no);
  if (Array.isArray(no)) return no.map(textoDe).join(" ");
  return "";
}

export function Secao<T extends { id: string }>({
  entidade,
  itens,
  singular,
  plural,
  rotuloDoNovo,
  colunas,
  descrever,
  avisoDeExclusao,
  formulario,
  filtros = [],
}: {
  filtros?: FiltroDaSecao<T>[];
  entidade: EntidadeAcademica;
  itens: T[];
  singular: string;
  plural: string;
  rotuloDoNovo?: string;
  colunas: Coluna<T>[];
  descrever: (item: T) => string;
  avisoDeExclusao: string;
  formulario: (item: T | null, onFechar: () => void) => React.ReactNode;
}) {
  const [editando, setEditando] = useState<T | "novo" | null>(null);
  const [excluindo, setExcluindo] = useState<T | null>(null);

  const [escolhas, setEscolhas] = useState<Record<string, string[]>>({});

  const doFiltro = itens.filter((item) =>
    filtros.every((f) =>
      passaNoFiltro(escolhas[f.rotulo] ?? [], f.valor(item)),
    ),
  );

  const { filtrados, pesquisa } = usePesquisa(
    doFiltro,
    (item) => [descrever(item), ...colunas.map((c) => textoDe(c.valor(item)))],
    `Pesquisar ${plural}`,
  );

  const { ordenados, controle } = useOrdenacao(
    filtrados,
    Object.fromEntries(
      colunas.map((c) => [
        c.titulo,
        (item: T) =>
          c.numerica ? Number(textoDe(c.valor(item))) : textoDe(c.valor(item)),
      ]),
    ),
  );
  const { visiveis, rodape } = usePaginacao(ordenados);
  const selecao = useSelecao(
    itens.map((item) => item.id),
    visiveis.map((item) => item.id),
  );
  const [excluindoEmLote, setExcluindoEmLote] = useState(false);
  const marcados = itens.filter((item) => selecao.estaMarcado(item.id));

  return (
    <div className="space-y-3 pt-2">
      {rotuloDoNovo && (
        <NaLinhaDoTitulo>
          <Button onClick={() => setEditando("novo")}>
            <Plus />
            {rotuloDoNovo}
          </Button>
        </NaLinhaDoTitulo>
      )}

      <BarraDeFerramentas
        pesquisa={pesquisa}
        filtros={
          filtros.length > 0 && (
            <>
              {filtros.map((f) => (
                <FiltroMultiplo
                  key={f.rotulo}
                  rotulo={f.rotulo}
                  opcoes={f.opcoes}
                  valor={escolhas[f.rotulo] ?? []}
                  onChange={(valor) =>
                    setEscolhas((atual) => ({ ...atual, [f.rotulo]: valor }))
                  }
                />
              ))}
            </>
          )
        }
      />

      <div className="bg-card rounded-lg border">
        <BarraDeSelecao
          quantidade={marcados.length}
          singular={singular}
          plural={plural}
          onLimpar={selecao.limpar}
          acoes={[
            {
              rotulo: "Excluir",
              icone: Trash2,
              destrutiva: true,
              onExecutar: () => setExcluindoEmLote(true),
            },
          ]}
        />
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <CabecalhoDaSelecao selecao={selecao} />
              {colunas.map((c) => (
                <CabecalhoOrdenavel
                  key={c.titulo}
                  coluna={c.titulo}
                  rotulo={c.titulo}
                  controle={controle}
                  className={c.numerica ? "text-right" : undefined}
                />
              ))}
              <TableHead className="w-[72px]">
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.length === 0 && (
              <LinhaVazia colunas={colunas.length + 2}>
                {itens.length === 0
                  ? "Nenhum registro cadastrado."
                  : "Nenhum registro corresponde à pesquisa."}
              </LinhaVazia>
            )}
            {visiveis.map((item) => (
              <TableRow key={item.id} data-registro={descrever(item)}>
                <CelulaDaSelecao
                  selecao={selecao}
                  id={item.id}
                  descricao={descrever(item)}
                />
                {colunas.map((c) => (
                  <TableCell
                    key={c.titulo}
                    className={
                      c.destaque
                        ? "font-medium"
                        : c.numerica
                          ? "text-right tabular-nums"
                          : undefined
                    }
                  >
                    {c.valor(item)}
                  </TableCell>
                ))}
                <TableCell>
                  <AcoesDaLinha
                    descricao={descrever(item)}
                    onEditar={() => setEditando(item)}
                    onExcluir={() => setExcluindo(item)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <RodapeDaTabela {...rodape} />
      </div>

      {excluindoEmLote && (
        <ConfirmarExclusao
          titulo={`Excluir ${marcados.length} ${marcados.length === 1 ? singular : plural}?`}
          descricao={marcados.map(descrever).join(", ")}
          aviso={avisoDeExclusao}
          acao={() =>
            executarEmLote(
              marcados,
              (item) => excluirDoCadastro(entidade, item.id),
              descrever,
            )
          }
          onFechar={() => setExcluindoEmLote(false)}
        />
      )}

      {editando &&
        formulario(editando === "novo" ? null : editando, () =>
          setEditando(null),
        )}

      {excluindo && (
        <ConfirmarExclusao
          titulo={`Excluir ${singular}?`}
          descricao={descrever(excluindo)}
          aviso={avisoDeExclusao}
          acao={() => excluirDoCadastro(entidade, excluindo.id)}
          onFechar={() => setExcluindo(null)}
        />
      )}
    </div>
  );
}
