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
import { SelecaoComPesquisa } from "@/components/selecao-com-pesquisa";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Bloqueio } from "@/domain/calendario/calendario";
import { useOrdenacao } from "@/hooks/use-ordenacao";
import { usePesquisa } from "@/hooks/use-pesquisa";
import { executarEmLote, usePaginacao, useSelecao } from "@/hooks/use-tabela";

import { excluirBloqueio, salvarBloqueio } from "./acoes";
import { CabecalhoDaSecao } from "./cabecalho-da-secao";
import { intervalo } from "./datas";
import { DatasDoIntervalo } from "./datas-do-intervalo";

const TODOS_OS_ESPACOS = "todos";

export function SecaoDeBloqueios({
  bloqueios,
  espacos,
}: {
  bloqueios: Bloqueio[];
  espacos: { id: string; nome: string }[];
}) {
  const [editando, setEditando] = useState<Bloqueio | "novo" | null>(null);
  const [excluindo, setExcluindo] = useState<Bloqueio | null>(null);
  const [excluindoEmLote, setExcluindoEmLote] = useState(false);
  const [espacosEscolhidos, setEspacosEscolhidos] = useState<string[]>([]);

  const nomeDoEspaco = new Map(espacos.map((e) => [e.id, e.nome]));
  const bloqueioEmEdicao = editando === "novo" ? null : editando;
  const espacoDoBloqueio = (b: Bloqueio) =>
    b.espacoId ? (nomeDoEspaco.get(b.espacoId) ?? "Espaço removido") : "Todos";

  const doFiltro = bloqueios.filter((b) =>
    passaNoFiltro(espacosEscolhidos, b.espacoId ?? "todos"),
  );
  const busca = usePesquisa(
    doFiltro,
    (b) => [intervalo(b.inicio, b.fim), espacoDoBloqueio(b), b.motivo],
    "Pesquisar bloqueios",
  );
  const ordem = useOrdenacao(busca.filtrados, {
    datas: (b) => b.inicio,
    espaco: (b) => espacoDoBloqueio(b),
    motivo: (b) => b.motivo,
  });
  const pagina = usePaginacao(ordem.ordenados);
  const selecao = useSelecao(
    bloqueios.map((b) => b.id),
    pagina.visiveis.map((b) => b.id),
  );
  const marcados = bloqueios.filter((b) => selecao.estaMarcado(b.id));

  return (
    <section className="space-y-3">
      <CabecalhoDaSecao
        titulo="Bloqueios"
        descricao="Feriados e recessos valem para todos os espaços; a manutenção de um espaço bloqueia só ele."
        rotulo="Novo bloqueio"
        onNovo={() => setEditando("novo")}
        pesquisa={busca.pesquisa}
        filtros={
          <FiltroMultiplo
            rotulo="Espaço"
            opcoes={[
              { id: "todos", nome: "Todos os espaços" },
              ...espacos.map((e) => ({ id: e.id, nome: e.nome })),
            ]}
            valor={espacosEscolhidos}
            onChange={setEspacosEscolhidos}
          />
        }
      />
      <div className="bg-card rounded-lg border">
        <BarraDeSelecao
          quantidade={marcados.length}
          singular="bloqueio"
          plural="bloqueios"
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
                coluna="datas"
                className="w-[25%]"
                rotulo="Datas"
                controle={ordem.controle}
              />
              <CabecalhoOrdenavel
                coluna="espaco"
                className="w-[22%]"
                rotulo="Espaço"
                controle={ordem.controle}
              />
              <CabecalhoOrdenavel
                coluna="motivo"
                rotulo="Motivo"
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
                {bloqueios.length === 0
                  ? "Nenhum bloqueio cadastrado."
                  : "Nenhum bloqueio corresponde à pesquisa."}
              </LinhaVazia>
            )}
            {pagina.visiveis.map((b) => (
              <TableRow key={b.id} data-bloqueio={b.motivo}>
                <CelulaDaSelecao
                  selecao={selecao}
                  id={b.id}
                  descricao={b.motivo}
                />
                <TableCell className="whitespace-nowrap">
                  {intervalo(b.inicio, b.fim)}
                </TableCell>
                <TableCell>{espacoDoBloqueio(b)}</TableCell>
                <TableCell>{b.motivo}</TableCell>
                <TableCell>
                  <AcoesDaLinha
                    descricao={b.motivo}
                    onEditar={() => setEditando(b)}
                    onExcluir={() => setExcluindo(b)}
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
          titulo={bloqueioEmEdicao ? "Editar bloqueio" : "Novo bloqueio"}
          descricao="Reservas e palestras já registradas nas datas continuam; o bloqueio impede as novas."
          acao={salvarBloqueio}
          onFechar={() => setEditando(null)}
        >
          {(estado) => (
            <>
              <input
                type="hidden"
                name="id"
                value={bloqueioEmEdicao?.id ?? ""}
              />
              <DatasDoIntervalo
                prefixo="bloqueio"
                estado={estado}
                inicio={bloqueioEmEdicao?.inicio}
                fim={bloqueioEmEdicao?.fim}
              />
              <Campo
                id="bloqueioEspaco"
                rotulo="Espaço"
                estado={estado}
                campo="espacoId"
              >
                <SelecaoComPesquisa
                  id="bloqueioEspaco"
                  name="espacoId"
                  valorInicial={bloqueioEmEdicao?.espacoId ?? TODOS_OS_ESPACOS}
                  opcoesFixas={[
                    { id: TODOS_OS_ESPACOS, nome: "Todos os espaços" },
                  ]}
                  opcoes={espacos}
                  placeholder="Selecione o espaço"
                  rotuloDaPesquisa="Pesquisar espaços"
                />
              </Campo>
              <Campo
                id="bloqueioMotivo"
                rotulo="Motivo"
                estado={estado}
                campo="motivo"
              >
                <Input
                  id="bloqueioMotivo"
                  name="motivo"
                  defaultValue={bloqueioEmEdicao?.motivo}
                  placeholder="Feriado de Finados"
                />
              </Campo>
            </>
          )}
        </DialogoDeFormulario>
      )}

      {excluindoEmLote && (
        <ConfirmarExclusao
          titulo={`Excluir ${marcados.length} ${marcados.length === 1 ? "bloqueio" : "bloqueios"}?`}
          descricao={marcados.map((b) => b.motivo).join(", ")}
          aviso="As datas voltam a aceitar reservas e palestras."
          acao={() =>
            executarEmLote(
              marcados,
              (b) => excluirBloqueio(b.id),
              (b) => b.motivo,
            )
          }
          onFechar={() => setExcluindoEmLote(false)}
        />
      )}

      {excluindo && (
        <ConfirmarExclusao
          titulo="Excluir bloqueio?"
          descricao={`${excluindo.motivo}, ${intervalo(excluindo.inicio, excluindo.fim)}`}
          aviso="As datas voltam a aceitar reservas e palestras."
          acao={() => excluirBloqueio(excluindo.id)}
          onFechar={() => setExcluindo(null)}
        />
      )}
    </section>
  );
}
