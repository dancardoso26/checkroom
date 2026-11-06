"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { RotuloDeCampo } from "@/components/rotulo-de-campo";
import { TableHead } from "@/components/ui/table";
import { proximaOrdem, type Ordem } from "@/domain/tabela/ordenacao";
import type { ControleDeOrdem } from "@/hooks/use-ordenacao";
import { cn } from "@/lib/utils";

export function CabecalhoOrdenavel({
  coluna,
  rotulo,
  controle,
  className,
}: {
  coluna: string;
  rotulo: string;
  controle: ControleDeOrdem;
  className?: string;
}) {
  const ativa = controle.ordem?.coluna === coluna;
  const sentido = ativa ? controle.ordem?.sentido : undefined;
  const Seta = sentido === "desc" ? ArrowDown : ArrowUp;
  const aDireita = className?.includes("text-right");

  return (
    <TableHead
      className={className}
      aria-sort={
        sentido === "asc"
          ? "ascending"
          : sentido === "desc"
            ? "descending"
            : undefined
      }
    >
      <button
        type="button"
        onClick={() => controle.alternar(coluna)}
        className={cn(
          "hover:text-foreground -mx-1 inline-flex cursor-pointer items-center gap-1.5 rounded px-1",
          aDireita && "flex-row-reverse",
          ativa && "text-foreground",
        )}
      >
        <RotuloDeCampo rotulo={rotulo} />
        {ativa && <Seta aria-hidden className="size-3.5" />}
      </button>
    </TableHead>
  );
}

export function CabecalhoOrdenavelDaUrl({
  coluna,
  rotulo,
  className,
}: {
  coluna: string;
  rotulo: string;
  className?: string;
}) {
  const router = useRouter();
  const caminho = usePathname();
  const parametros = useSearchParams();

  const colunaAtual = parametros.get("ordenar");
  const ordem: Ordem | null = colunaAtual
    ? {
        coluna: colunaAtual,
        sentido: parametros.get("sentido") === "desc" ? "desc" : "asc",
      }
    : null;

  function alternar(alvo: string) {
    const novos = new URLSearchParams(parametros);
    const proxima = proximaOrdem(ordem, alvo);

    novos.delete("pagina");
    if (proxima) {
      novos.set("ordenar", proxima.coluna);
      novos.set("sentido", proxima.sentido);
    } else {
      novos.delete("ordenar");
      novos.delete("sentido");
    }

    router.replace(novos.size ? `${caminho}?${novos}` : caminho, {
      scroll: false,
    });
  }

  return (
    <CabecalhoOrdenavel
      coluna={coluna}
      rotulo={rotulo}
      className={className}
      controle={{ ordem, alternar }}
    />
  );
}
