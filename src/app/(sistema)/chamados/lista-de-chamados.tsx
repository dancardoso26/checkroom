"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { CabecalhoDoCadastro } from "@/components/cadastro";
import { ConfirmarExclusao } from "@/components/formulario";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { assumirChamado, cancelarChamado, excluirChamado } from "./acoes";
import { CartaoDoChamado } from "./cartao-do-chamado";
import { DetalheDoChamado } from "./detalhe-do-chamado";
import {
  DialogoAbrirChamado,
  DialogoResolverChamado,
} from "./dialogos-de-chamado";
import { TabelaDeChamados } from "./tabela-de-chamados";
import {
  ABAS_DE_CARDS,
  abaDoChamado,
  type AbaDeChamados,
  type Linha,
} from "./tipos";

export function ListaDeChamados({
  chamadoEmFoco,
  chamados,
  espacos,
  podeAbrir,
  podeExcluir,
  veTodos,
}: {
  chamadoEmFoco: string | null;
  chamados: Linha[];
  espacos: { id: string; nome: string }[];
  podeAbrir: boolean;
  podeExcluir: boolean;
  veTodos: boolean;
}) {
  const [aba, setAba] = useState<AbaDeChamados>(() =>
    abaDoChamado(chamados.find((c) => c.id === chamadoEmFoco)?.situacao)
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

      {erro && (
        <p className="text-destructive text-sm" role="alert">
          {erro}
        </p>
      )}

      <Tabs value={aba} onValueChange={(valor) => setAba(valor as AbaDeChamados)}>
        <TabsList>
          {ABAS_DE_CARDS.map(({ id, rotulo, situacao }) => (
            <TabsTrigger key={id} value={id}>
              {rotulo}
              <span className="text-muted-foreground text-xs">
                {chamados.filter((c) => c.situacao === situacao).length}
              </span>
            </TabsTrigger>
          ))}
          <TabsTrigger value="todos">
            Todos
            <span className="text-muted-foreground text-xs">
              {chamados.length}
            </span>
          </TabsTrigger>
        </TabsList>

        {ABAS_DE_CARDS.map(({ id, situacao, vazio }) => {
          const daAba = chamados.filter((c) => c.situacao === situacao);

          return (
            <TabsContent key={id} value={id}>
              {daAba.length === 0 ? (
                <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
                  {vazio}
                </p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {daAba.map((chamado) => (
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
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}

        <TabsContent value="todos" className="space-y-4">
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
        </TabsContent>
      </Tabs>

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
