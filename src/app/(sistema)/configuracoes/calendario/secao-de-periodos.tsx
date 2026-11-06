"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import {
  AcoesDaLinha,
  BarraDeSelecao,
  CabecalhoDaSelecao,
  CelulaDaSelecao,
  LinhaVazia,
} from "@/components/cadastro";
import { CabecalhoOrdenavel } from "@/components/cabecalho-ordenavel";
import { FiltroMultiplo, passaNoFiltro } from "@/components/filtro-multiplo";
import {
  Campo,
  ConfirmarExclusao,
  DialogoDeFormulario,
} from "@/components/formulario";
import { RodapeDaTabela } from "@/components/paginacao";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PeriodoLetivo } from "@/domain/calendario/calendario";
import { localDayKey } from "@/lib/datetime";
import { useOrdenacao } from "@/hooks/use-ordenacao";
import { usePesquisa } from "@/hooks/use-pesquisa";
import { executarEmLote, usePaginacao, useSelecao } from "@/hooks/use-tabela";

import { excluirPeriodo, salvarPeriodo } from "./acoes";
import { CabecalhoDaSecao } from "./cabecalho-da-secao";
import { dia, intervalo } from "./datas";
import { DatasDoIntervalo } from "./datas-do-intervalo";

export function SecaoDePeriodos({ periodos }: { periodos: PeriodoLetivo[] }) {
  const [editando, setEditando] = useState<PeriodoLetivo | "novo" | null>(null);
  const [excluindo, setExcluindo] = useState<PeriodoLetivo | null>(null);
  const [excluindoEmLote, setExcluindoEmLote] = useState(false);
  const [situacoes, setSituacoes] = useState<string[]>([]);

  const periodoEmEdicao = editando === "novo" ? null : editando;

  const hoje = localDayKey(new Date());
  const situacaoDoPeriodo = (p: PeriodoLetivo) =>
    hoje < p.inicio ? "futuro" : hoje > p.fim ? "encerrado" : "andamento";

  const doFiltro = periodos.filter((p) =>
    passaNoFiltro(situacoes, situacaoDoPeriodo(p)),
  );
  const busca = usePesquisa(
    doFiltro,
    (p) => [p.codigo, dia(p.inicio), dia(p.fim)],
    "Pesquisar períodos letivos",
  );
  const ordem = useOrdenacao(busca.filtrados, {
    codigo: (p) => p.codigo,
    inicio: (p) => p.inicio,
    fim: (p) => p.fim,
  });
  const pagina = usePaginacao(ordem.ordenados);
  const selecao = useSelecao(
    periodos.map((p) => p.id),
    pagina.visiveis.map((p) => p.id),
  );
  const marcados = periodos.filter((p) => selecao.estaMarcado(p.id));

  return (
    <section className="space-y-3">
      <CabecalhoDaSecao
        titulo="Períodos letivos"
        descricao="Uma reserva só é aceita em data dentro de um período, e o vínculo de professor é procurado no período da data."
        rotulo="Novo período"
        onNovo={() => setEditando("novo")}
        pesquisa={busca.pesquisa}
        filtros={
          <FiltroMultiplo
            rotulo="Status"
            opcoes={[
              { id: "andamento", nome: "Em andamento" },
              { id: "futuro", nome: "Futuro" },
              { id: "encerrado", nome: "Encerrado" },
            ]}
            valor={situacoes}
            onChange={setSituacoes}
          />
        }
      />
      <div className="bg-card rounded-lg border">
        <BarraDeSelecao
          quantidade={marcados.length}
          singular="período"
          plural="períodos"
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
              <CabecalhoOrdenavel
                coluna="codigo"
                rotulo="Período letivo"
                controle={ordem.controle}
              />
              <CabecalhoOrdenavel
                coluna="inicio"
                className="w-[20%]"
                rotulo="Início"
                controle={ordem.controle}
              />
              <CabecalhoOrdenavel
                coluna="fim"
                className="w-[20%]"
                rotulo="Término"
                controle={ordem.controle}
              />
              <TableHead className="w-[72px]">
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {busca.filtrados.length === 0 && (
              <LinhaVazia colunas={5}>
                {periodos.length === 0
                  ? "Nenhum período cadastrado: nenhuma reserva será aceita."
                  : "Nenhum período corresponde à pesquisa."}
              </LinhaVazia>
            )}
            {pagina.visiveis.map((p) => (
              <TableRow key={p.id} data-periodo={p.codigo}>
                <CelulaDaSelecao
                  selecao={selecao}
                  id={p.id}
                  descricao={`período ${p.codigo}`}
                />
                <TableCell className="font-medium">{p.codigo}</TableCell>
                <TableCell>{dia(p.inicio)}</TableCell>
                <TableCell>{dia(p.fim)}</TableCell>
                <TableCell>
                  <AcoesDaLinha
                    descricao={`período ${p.codigo}`}
                    onEditar={() => setEditando(p)}
                    onExcluir={() => setExcluindo(p)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <RodapeDaTabela {...pagina.rodape} fixo={false} />
      </div>

      {editando && (
        <DialogoDeFormulario
          titulo={
            periodoEmEdicao ? "Editar período letivo" : "Novo período letivo"
          }
          acao={salvarPeriodo}
          onFechar={() => setEditando(null)}
        >
          {(estado) => (
            <>
              <input
                type="hidden"
                name="id"
                value={periodoEmEdicao?.id ?? ""}
              />
              <Campo
                id="periodoCodigo"
                rotulo="Período letivo"
                estado={estado}
                campo="codigo"
                ajuda="Ano e semestre, como 2027.1."
              >
                <Input
                  id="periodoCodigo"
                  name="codigo"
                  defaultValue={periodoEmEdicao?.codigo}
                />
              </Campo>
              <DatasDoIntervalo
                prefixo="periodo"
                estado={estado}
                inicio={periodoEmEdicao?.inicio}
                fim={periodoEmEdicao?.fim}
              />
            </>
          )}
        </DialogoDeFormulario>
      )}

      {excluindoEmLote && (
        <ConfirmarExclusao
          titulo={`Excluir ${marcados.length} ${marcados.length === 1 ? "período letivo" : "períodos letivos"}?`}
          descricao={marcados.map((p) => p.codigo).join(", ")}
          aviso="Sem o período, nenhuma reserva nova é aceita nas datas dele. Os vínculos de professores continuam cadastrados."
          acao={() =>
            executarEmLote(
              marcados,
              (p) => excluirPeriodo(p.id),
              (p) => p.codigo,
            )
          }
          onFechar={() => setExcluindoEmLote(false)}
        />
      )}

      {excluindo && (
        <ConfirmarExclusao
          titulo="Excluir período letivo?"
          descricao={`${excluindo.codigo}, ${intervalo(excluindo.inicio, excluindo.fim)}`}
          aviso="Sem o período, nenhuma reserva nova é aceita nestas datas. Os vínculos de professores do período continuam cadastrados."
          acao={() => excluirPeriodo(excluindo.id)}
          onFechar={() => setExcluindo(null)}
        />
      )}
    </section>
  );
}
