"use client";

import { SquareKanban, Table2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { CabecalhoDoCadastro } from "@/components/cadastro";
import { ConfirmarExclusao } from "@/components/formulario";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { assumirChamado, cancelarChamado, excluirChamado } from "./acoes";
import { CartaoDoChamado } from "./cartao-do-chamado";
import { DetalheDoChamado } from "./detalhe-do-chamado";
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
    visaoDoChamado(chamados.find((c) => c.id === chamadoEmFoco)?.situacao)
  );
  const [abrindo, setAbrindo] = useState(false);
  const [detalhe, setDetalhe] = useState<Linha | null>(null);
  const [resolvendo, setResolvendo] = useState<Linha | null>(null);
  const [cancelando, setCancelando] = useState<Linha | null>(null);
  const [excluindo, setExcluindo] = useState<Linha | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

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

  return (
    <div className="space-y-4">
      <CabecalhoDoCadastro
        titulo={veTodos ? "Chamados" : "Meus chamados"}
        rotuloDoNovo={podeAbrir ? "Abrir chamado" : undefined}
        onNovo={podeAbrir ? () => setAbrindo(true) : undefined}
      />

      <div className="flex justify-end">
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={visao}
          onValueChange={(v) => v && setVisao(v as VisaoDosChamados)}
          aria-label="Visualização"
        >
          <ToggleGroupItem value="pipeline" aria-label="Pipeline" title="Pipeline">
            <SquareKanban />
          </ToggleGroupItem>
          <ToggleGroupItem value="tabela" aria-label="Tabela" title="Tabela">
            <Table2 />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {erro && (
        <p className="text-destructive text-sm" role="alert">
          {erro}
        </p>
      )}

      {visao === "pipeline" ? (
        <div className="grid items-start gap-4 lg:grid-cols-3">
          {COLUNAS_DO_PIPELINE.map(({ id, rotulo, situacao, vazio }) => {
            const daColuna = chamadosDaColuna(chamados, situacao, agora);

            return (
              <section
                key={id}
                data-coluna={id}
                aria-label={rotulo}
                className="bg-muted/40 space-y-3 rounded-lg border p-3"
              >
                <header className="flex items-center justify-between px-1">
                  <h2 className="text-sm font-semibold">{rotulo}</h2>
                  <span className="text-muted-foreground bg-background rounded-full border px-2 text-xs">
                    {daColuna.length}
                  </span>
                </header>

                {daColuna.length === 0 ? (
                  <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
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
                      onResolver={() => setResolvendo(chamado)}
                      onCancelar={() => setCancelando(chamado)}
                    />
                  ))
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <TabelaDeChamados
          chamados={chamados}
          veTodos={veTodos}
          podeExcluir={podeExcluir}
          pendente={pendente}
          onErro={setErro}
          onDetalhe={setDetalhe}
          onAssumir={assumir}
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
        <DialogoAbrirChamado espacos={espacos} onFechar={() => setAbrindo(false)} />
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
