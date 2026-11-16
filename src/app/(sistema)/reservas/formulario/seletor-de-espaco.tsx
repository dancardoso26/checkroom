"use client";

import { useRef } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { OpcaoDeEspaco } from "@/lib/repositories/repositorio-de-espacos";
import type { OpcaoDeRecurso } from "@/lib/repositories/repositorio-de-recursos";
import type { VeredictoDoEspaco } from "./analise";

type PropsDoSeletorDeEspaco = {
  espacos: OpcaoDeEspaco[];
  recursos: OpcaoDeRecurso[];
  veredictos: VeredictoDoEspaco[];
  espacoEscolhidoId: string;
  aoEscolher: (espacoId: string) => void;
};

export function SeletorDeEspaco({
  espacos,
  recursos,
  veredictos,
  espacoEscolhidoId,
  aoEscolher: onSelect,
}: PropsDoSeletorDeEspaco) {
  const nomeDoRecurso = new Map(recursos.map((r) => [r.id, r.nome]));

  const analisados = veredictos
    .map((veredicto) => ({
      veredicto,
      espaco: espacos.find((r) => r.id === veredicto.espacoId),
    }))
    .filter(
      (item): item is { veredicto: VeredictoDoEspaco; espaco: OpcaoDeEspaco } =>
        Boolean(item.espaco),
    );

  const itens = analisados.filter((i) => i.veredicto.compativel);
  const descartados = analisados.filter((i) => !i.veredicto.compativel);

  const cartoes = useRef<(HTMLDivElement | null)[]>([]);

  const indiceFocalizavel = (() => {
    const selecionado = itens.findIndex(
      (i) => i.espaco.id === espacoEscolhidoId && i.veredicto.compativel,
    );
    if (selecionado >= 0) return selecionado;

    return itens.findIndex((i) => i.veredicto.compativel);
  })();

  function navegar(deIndice: number, direcao: 1 | -1) {
    const total = itens.length;
    if (total === 0) return;

    for (let passo = 1; passo <= total; passo++) {
      const alvo = (deIndice + direcao * passo + total * passo) % total;

      if (itens[alvo].veredicto.compativel) {
        onSelect(itens[alvo].espaco.id);
        cartoes.current[alvo]?.focus();
        return;
      }
    }
  }

  return (
    <div className="space-y-4">
      {itens.length > 0 ? (
        <p className="text-muted-foreground text-sm">
          {itens.length === 1
            ? "1 espaço disponível"
            : `${itens.length} espaços disponíveis`}
        </p>
      ) : (
        <div className="space-y-1">
          <p className="font-medium">Nenhum espaço disponível</p>
          <p className="text-muted-foreground text-sm">
            {descartados.length === 0
              ? "Nenhum espaço cadastrado."
              : "Nenhum espaço atende a esta atividade. Volte aos detalhes e ajuste a turma, o horário ou os itens."}
          </p>
        </div>
      )}

      <div
        role="radiogroup"
        aria-label="Espaços disponíveis"
        className="space-y-3"
      >
        {itens.map(({ espaco, veredicto }, indice) => (
          <CartaoEspaco
            key={espaco.id}
            ref={(elemento) => {
              cartoes.current[indice] = elemento;
            }}
            espaco={espaco}
            veredicto={veredicto}
            recomendado={indice === 0}
            selecionado={espacoEscolhidoId === espaco.id}
            focalizavel={indice === indiceFocalizavel}
            onSelect={() => onSelect(espaco.id)}
            onNavegar={(direcao) => navegar(indice, direcao)}
            nomeDoRecurso={nomeDoRecurso}
          />
        ))}
      </div>

      {itens.length === 0 && descartados.length > 0 && (
        <div className="space-y-3" aria-label="Espaços descartados">
          {descartados.map(({ espaco, veredicto }) => (
            <CartaoEspaco
              key={espaco.id}
              ref={() => undefined}
              espaco={espaco}
              veredicto={veredicto}
              recomendado={false}
              selecionado={false}
              focalizavel={false}
              onSelect={() => undefined}
              onNavegar={() => undefined}
              nomeDoRecurso={nomeDoRecurso}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CartaoEspaco({
  ref,
  espaco,
  veredicto,
  recomendado,
  selecionado,
  focalizavel,
  onSelect: aoEscolher,
  onNavegar,
  nomeDoRecurso,
}: {
  ref: (elemento: HTMLDivElement | null) => void;
  espaco: OpcaoDeEspaco;
  veredicto: VeredictoDoEspaco;
  recomendado: boolean;
  selecionado: boolean;
  focalizavel: boolean;
  onSelect: () => void;
  onNavegar: (direcao: 1 | -1) => void;
  nomeDoRecurso: Map<string, string>;
}) {
  const disponivel = veredicto.compativel;

  return (
    <div
      ref={ref}
      role="radio"
      aria-checked={selecionado}
      aria-disabled={!disponivel}
      tabIndex={disponivel && focalizavel ? 0 : -1}
      onClick={disponivel ? aoEscolher : undefined}
      onKeyDown={(evento) => {
        if (!disponivel) return;

        if (evento.key === "ArrowDown" || evento.key === "ArrowRight") {
          evento.preventDefault();
          onNavegar(1);
          return;
        }

        if (evento.key === "ArrowUp" || evento.key === "ArrowLeft") {
          evento.preventDefault();
          onNavegar(-1);
          return;
        }

        if (evento.key === " " || evento.key === "Enter") {
          evento.preventDefault();
          aoEscolher();
        }
      }}
      className={cn(
        "rounded-lg border p-4 transition-colors",
        disponivel
          ? "bg-card hover:border-primary/40 cursor-pointer"
          : "border-destructive/25 bg-destructive-subtle/40 cursor-not-allowed",
        selecionado && "border-primary ring-primary/25 ring-2",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{espaco.nome}</p>
            {recomendado && (
              <Badge className="bg-success-subtle text-success border-success/30 border">
                Recomendado
              </Badge>
            )}
          </div>

          <p className="text-muted-foreground text-sm">
            {espaco.predio} · {espaco.capacidade} lugares
          </p>

          <div className="flex flex-wrap gap-1.5">
            {espaco.recursoIds.map((id) => (
              <Badge key={id} variant="secondary">
                {nomeDoRecurso.get(id) ?? id}
              </Badge>
            ))}
            {espaco.recursoIds.length === 0 && (
              <span className="text-muted-foreground text-xs">
                Sem recursos cadastrados
              </span>
            )}
          </div>
        </div>

        <Badge
          variant="outline"
          className={cn(
            "whitespace-nowrap",
            disponivel
              ? "border-success/30 bg-success-subtle text-success"
              : "border-destructive/30 text-destructive",
          )}
        >
          {disponivel ? "Disponível" : "Incompatível"}
        </Badge>
      </div>

      {veredicto.motivos.length > 0 && (
        <ul className="text-destructive mt-3 space-y-1 text-sm">
          {veredicto.motivos.map((motivo) => (
            <li key={motivo}>{motivo}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
