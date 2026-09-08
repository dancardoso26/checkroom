"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * As cinco etapas, na ordem. Vive aqui porque o indicador é quem as desenha, e
 * o orquestrador só precisa saber quantas são.
 */
export const ETAPAS = [
  "Atividade",
  "Data e horário",
  "Necessidades",
  "Espaço",
  "Confirmação",
] as const;

export function Stepper({ etapaAtual }: { etapaAtual: number }) {
  return (
    // ol, e não uma linha de divs: é uma sequência ordenada, e o leitor de tela
    // anuncia "item 2 de 5" sem precisar de nenhum atributo extra.
    // justify-between espalha as cinco etapas da borda esquerda à direita, em
    // vez de agrupá-las no início. Com isso a barra passa a comunicar progresso
    // pela posição: a etapa atual ocupa um ponto proporcional ao avanço.
    //
    // O flex-wrap continua para telas estreitas, e o gap-y separa as linhas
    // quando a quebra acontece.
    <ol className="bg-card flex flex-wrap justify-between gap-x-6 gap-y-3 rounded-lg border px-6 py-4">
      {ETAPAS.map((nome, indice) => {
        const concluida = indice < etapaAtual;
        const atual = indice === etapaAtual;

        return (
          <li
            key={nome}
            aria-current={atual ? "step" : undefined}
            className="flex items-center gap-2"
          >
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-xs font-semibold",
                concluida && "bg-success-subtle text-success",
                atual && "bg-primary text-primary-foreground",
                !concluida && !atual && "bg-muted text-muted-foreground"
              )}
              aria-hidden
            >
              {concluida ? <Check className="size-3.5" /> : indice + 1}
            </span>

            <span
              className={cn(
                "text-sm",
                atual ? "font-medium" : "text-muted-foreground"
              )}
            >
              {nome}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Etapa 1
// ---------------------------------------------------------------------------
