"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OPCOES_POR_PAGINA } from "@/domain/tabela/tabela";

const semAssinatura = () => () => {};

function useAlvoDoRodape(): HTMLElement | null {
  return useSyncExternalStore(
    semAssinatura,
    () => document.getElementById("rodape-fixo"),
    () => null
  );
}

export type PropsDoRodape = {
  pagina: number;
  totalDePaginas: number;
  porPagina: number;
  total?: number;
  onPagina: (pagina: number) => void;
  onPorPagina: (porPagina: number) => void;
  fixo?: boolean;
};

function intervaloExibido(pagina: number, porPagina: number, total: number) {
  if (total === 0) return "Nenhum item";
  const de = (pagina - 1) * porPagina + 1;
  const ate = Math.min(pagina * porPagina, total);
  return `${de}–${ate} de ${total}`;
}

export function RodapeDaTabela({
  pagina,
  totalDePaginas,
  porPagina,
  total,
  onPagina,
  onPorPagina,
  fixo = true,
}: PropsDoRodape) {
  const alvo = useAlvoDoRodape();
  const [digitada, setDigitada] = useState({
    base: pagina,
    valor: String(pagina),
  });
  const valor = digitada.base === pagina ? digitada.valor : String(pagina);

  function confirmar() {
    const numero = Math.trunc(Number(valor));

    if (!Number.isFinite(numero) || numero < 1 || numero > totalDePaginas) {
      setDigitada({ base: pagina, valor: String(pagina) });
      return;
    }

    if (numero !== pagina) onPagina(numero);
  }

  const conteudo = (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Itens por página</span>
        <Select
          value={String(porPagina)}
          onValueChange={(v) => onPorPagina(Number(v))}
        >
          <SelectTrigger size="sm" className="w-20" aria-label="Itens por página">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" side="top">
            {OPCOES_POR_PAGINA.map((opcao) => (
              <SelectItem key={opcao} value={String(opcao)}>
                {opcao}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {total !== undefined && (
          <span className="text-muted-foreground hidden sm:inline">
            {intervaloExibido(pagina, porPagina, total)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 text-sm">
        <Button
          variant="outline"
          size="sm"
          disabled={pagina <= 1}
          onClick={() => onPagina(pagina - 1)}
        >
          <ChevronLeft />
          Anterior
        </Button>

        <form
          onSubmit={(evento) => {
            evento.preventDefault();
            confirmar();
          }}
          className="flex items-center gap-1.5"
        >
          <span className="text-muted-foreground">Página</span>
          <Input
            aria-label="Número da página"
            inputMode="numeric"
            value={valor}
            onChange={(e) =>
              setDigitada({
                base: pagina,
                valor: e.target.value.replace(/\D/g, ""),
              })
            }
            onBlur={confirmar}
            className="h-8 w-14 text-center"
          />
          <span className="text-muted-foreground">de {totalDePaginas}</span>
        </form>

        <Button
          variant="outline"
          size="sm"
          disabled={pagina >= totalDePaginas}
          onClick={() => onPagina(pagina + 1)}
        >
          Seguinte
          <ChevronRight />
        </Button>
      </div>
    </div>
  );

  if (!fixo) {
    return (
      <nav aria-label="Paginação" className="border-t">
        {conteudo}
      </nav>
    );
  }

  if (!alvo) return null;

  return createPortal(
    <nav
      aria-label="Paginação"
      className="bg-card border-t px-3 shadow-[0_-1px_3px_rgb(0_0_0/0.04)] sm:px-4"
    >
      {conteudo}
    </nav>,
    alvo
  );
}

export function Paginacao({
  pagina,
  totalDePaginas,
  porPagina,
  total,
}: {
  pagina: number;
  totalDePaginas: number;
  porPagina: number;
  total?: number;
}) {
  const router = useRouter();
  const caminho = usePathname();
  const parametros = useSearchParams();

  function ir(mudancas: { pagina?: number; porPagina?: number }) {
    const novos = new URLSearchParams(parametros);

    if (mudancas.porPagina !== undefined)
      novos.set("porPagina", String(mudancas.porPagina));
    const destino = mudancas.pagina ?? 1;
    if (destino > 1) novos.set("pagina", String(destino));
    else novos.delete("pagina");

    router.push(novos.size ? `${caminho}?${novos}` : caminho, {
      scroll: false,
    });
  }

  return (
    <RodapeDaTabela
      pagina={pagina}
      totalDePaginas={totalDePaginas}
      porPagina={porPagina}
      total={total}
      onPagina={(destino) => ir({ pagina: destino })}
      onPorPagina={(novo) => ir({ porPagina: novo })}
    />
  );
}
