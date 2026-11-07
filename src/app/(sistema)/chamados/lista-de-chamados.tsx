"use client";

import { SquareKanban, Table2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { CabecalhoDoCadastro } from "@/components/cadastro";
import { FiltroMultiplo, passaNoFiltro } from "@/components/filtro-multiplo";
import { ConfirmarExclusao } from "@/components/formulario";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  PRIORIDADES,
  ROTULO_DA_PRIORIDADE,
  ROTULO_DA_SITUACAO,
  SITUACOES,
  STATUS_DA_SITUACAO,
} from "@/domain/chamados/chamado";
import { PontoDeStatus } from "@/components/status-badge";
import { usePesquisa } from "@/hooks/use-pesquisa";
import { formatDateTime } from "@/lib/datetime";

import {
  assumirChamado,
  cancelarChamado,
  devolverChamado,
  excluirChamado,
} from "./acoes";
import { CartaoDoChamado } from "./cartao-do-chamado";
import { DetalheDoChamado } from "./detalhe-do-chamado";
import { RolagemComContinuidade } from "./rolagem-com-continuidade";
import {
  DialogoAbrirChamado,
  DialogoResolverChamado,
} from "./dialogos-de-chamado";
import { TabelaDeChamados } from "./tabela-de-chamados";
import {
  chamadosDaColuna,
  COLUNAS_DO_PIPELINE,
  visaoDoChamado,
  type Linha,
  type VisaoDosChamados,
} from "./tipos";

export function ListaDeChamados({
  chamadoEmFoco,
  chamados,
  espacos,
  podeAbrir,
  podeExcluir,
  veTodos,
  agora,
}: {
  chamadoEmFoco: string | null;
  chamados: Linha[];
  espacos: { id: string; nome: string }[];
  podeAbrir: boolean;
  podeExcluir: boolean;
  veTodos: boolean;
  agora: Date;
}) {
  const [visao, setVisao] = useState<VisaoDosChamados>(() =>
    visaoDoChamado(chamados.find((c) => c.id === chamadoEmFoco)?.situacao),
  );
  const [abrindo, setAbrindo] = useState(false);
  const [detalhe, setDetalhe] = useState<Linha | null>(null);
  const [resolvendo, setResolvendo] = useState<Linha | null>(null);
  const [cancelando, setCancelando] = useState<Linha | null>(null);
  const [excluindo, setExcluindo] = useState<Linha | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();
  const [situacoes, setSituacoes] = useState<string[]>([]);
  const [prioridades, setPrioridades] = useState<string[]>([]);

  const { filtrados: buscados, pesquisa } = usePesquisa(
    chamados,
    (chamado) => [
      chamado.espaco,
      chamado.descricao,
      ROTULO_DA_PRIORIDADE[chamado.prioridade],
      ROTULO_DA_SITUACAO[chamado.situacao],
      veTodos ? chamado.solicitanteNome : null,
      chamado.responsavelNome,
      formatDateTime(chamado.abertoEm),
    ],
    "Pesquisar chamados",
  );

  useEffect(() => {
    if (!chamadoEmFoco) return;
    document
      .getElementById(`chamado-${chamadoEmFoco}`)
      ?.scrollIntoView({ block: "center" });
  }, [chamadoEmFoco]);

  function assumir(chamado: Linha) {
    setErro(null);
    startTransition(async () => {
      const resultado = await assumirChamado(chamado.id);
      if (resultado.ok) toast.success("Chamado assumido.");
      else setErro(resultado.mensagem);
    });
  }

  function devolver(chamado: Linha) {
    setErro(null);
    startTransition(async () => {
      const resultado = await devolverChamado(chamado.id);
      if (resultado.ok) toast.success("Chamado devolvido à fila.");
      else setErro(resultado.mensagem);
    });
  }

  const filtrados = buscados.filter(
    (c) =>
      passaNoFiltro(situacoes, c.situacao) &&
      passaNoFiltro(prioridades, c.prioridade),
  );

  const colunas = COLUNAS_DO_PIPELINE.filter(
    ({ situacao }) => situacoes.length === 0 || situacoes.includes(situacao),
  );

  return (
    <div className="space-y-4">
      <CabecalhoDoCadastro
        titulo={veTodos ? "Chamados" : "Meus chamados"}
        rotuloDoNovo={podeAbrir ? "Abrir chamado" : undefined}
        onNovo={podeAbrir ? () => setAbrindo(true) : undefined}
        acao={
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={visao}
            onValueChange={(v) => v && setVisao(v as VisaoDosChamados)}
            aria-label="Visualização"
          >
            <ToggleGroupItem
              value="pipeline"
              aria-label="Pipeline"
              title="Pipeline"
            >
              <SquareKanban />
            </ToggleGroupItem>
            <ToggleGroupItem value="tabela" aria-label="Tabela" title="Tabela">
              <Table2 />
            </ToggleGroupItem>
          </ToggleGroup>
        }
        pesquisa={pesquisa}
        filtros={
          <>
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
          </>
        }
      />

      {erro && (
        <p className="text-destructive text-sm" role="alert">
          {erro}
        </p>
      )}

      {visao === "pipeline" ? (
        <div
          className="grid items-start gap-3"
          style={{
            gridTemplateColumns: `repeat(auto-fit, minmax(16rem, 1fr))`,
          }}
        >
          {colunas.map(({ id, rotulo, situacao, vazio }) => {
            const daColuna = chamadosDaColuna(filtrados, situacao, agora);

            return (
              <section
                key={id}
                data-coluna={id}
                aria-label={rotulo}
                className="bg-muted/40 flex h-[calc(100svh-8.5rem)] min-h-64 flex-col rounded-lg border"
              >
                <header className="flex items-center justify-between border-b px-3 py-2">
                  <h2 className="flex items-center gap-2 text-sm font-semibold">
                    <PontoDeStatus status={STATUS_DA_SITUACAO[situacao]} />
                    {rotulo}
                  </h2>
                  <span className="text-muted-foreground bg-background rounded-full border px-2 text-xs">
                    {daColuna.length}
                  </span>
                </header>

                <RolagemComContinuidade>
                  {daColuna.length === 0 ? (
                    <p className="text-muted-foreground p-4 text-center text-xs">
                      {vazio}
                    </p>
                  ) : (
                    daColuna.map((chamado) => (
                      <CartaoDoChamado
                        key={chamado.id}
                        chamado={chamado}
                        emFoco={chamado.id === chamadoEmFoco}
                        veTodos={veTodos}
                        pendente={pendente}
                        onDetalhe={() => setDetalhe(chamado)}
                        onAssumir={() => assumir(chamado)}
                        onDevolver={() => devolver(chamado)}
                        onResolver={() => setResolvendo(chamado)}
                        onCancelar={() => setCancelando(chamado)}
                      />
                    ))
                  )}
                </RolagemComContinuidade>
              </section>
            );
          })}
        </div>
      ) : (
        <TabelaDeChamados
          chamados={filtrados}
          total={chamados.length}
          veTodos={veTodos}
          podeExcluir={podeExcluir}
          pendente={pendente}
          onErro={setErro}
          onDetalhe={setDetalhe}
          onAssumir={assumir}
          onDevolver={devolver}
          onResolver={setResolvendo}
          onCancelar={setCancelando}
          onExcluir={setExcluindo}
        />
      )}

      {excluindo && (
        <ConfirmarExclusao
          titulo="Excluir este chamado?"
          descricao={`${excluindo.espaco}: ${excluindo.descricao}`}
          aviso="O registro é removido de vez e não aparece mais na fila."
          acao={() => excluirChamado(excluindo.id)}
          onFechar={() => setExcluindo(null)}
        />
      )}

      {abrindo && (
        <DialogoAbrirChamado
          espacos={espacos}
          onFechar={() => setAbrindo(false)}
        />
      )}

      {resolvendo && (
        <DialogoResolverChamado
          chamado={resolvendo}
          onFechar={() => setResolvendo(null)}
        />
      )}

      {cancelando && (
        <ConfirmarExclusao
          titulo="Cancelar este chamado?"
          descricao={`${cancelando.espaco}: ${cancelando.descricao}`}
          aviso="Só é possível cancelar enquanto ninguém da TI assumiu o chamado."
          acao={() => cancelarChamado(cancelando.id)}
          onFechar={() => setCancelando(null)}
          rotuloDoBotao="Cancelar chamado"
          sucesso="Chamado cancelado."
        />
      )}

      {detalhe && (
        <DetalheDoChamado chamado={detalhe} onFechar={() => setDetalhe(null)} />
      )}
    </div>
  );
}
