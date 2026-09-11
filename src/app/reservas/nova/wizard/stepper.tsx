"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const ETAPAS = [
  "Atividade",
  "Data e horário",
  "Necessidades",
  "Espaço",
  "Confirmação",
] as const;

export function Stepper({ etapaAtual }: { etapaAtual: number }) {
  return (
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
