"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
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
import { OPCOES_POR_PAGINA } from "@/lib/tabela";

// Lê e escreve "pagina" e "porPagina" na URL, preservando os demais parâmetros,
// como a pesquisa: cada combinação continua tendo endereço próprio.
export function Paginacao({
  pagina,
  totalDePaginas,
  porPagina,
}: {
  pagina: number;
  totalDePaginas: number;
  porPagina: number;
}) {
  const router = useRouter();
  const caminho = usePathname();
  const parametros = useSearchParams();

  // Rascunho do campo: só vira navegação ao confirmar, e não a cada tecla.
  // A chave em "pagina" o reinicia quando a página muda por outro caminho.
  const [digitada, setDigitada] = useState({
    base: pagina,
    valor: String(pagina),
  });
  const valor = digitada.base === pagina ? digitada.valor : String(pagina);

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

  function confirmar() {
    const numero = Math.trunc(Number(valor));

    // Fora do intervalo ou inválido: o campo volta à página atual em vez de
    // navegar para um lugar que não existe.
    if (!Number.isFinite(numero) || numero < 1 || numero > totalDePaginas) {
      setDigitada({ base: pagina, valor: String(pagina) });
      return;
    }

    if (numero !== pagina) ir({ pagina: numero });
  }

  return (
    <nav
      aria-label="Paginação"
      className="flex flex-wrap items-center justify-between gap-3 border-t px-3 py-2"
    >
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Itens por página</span>
        <Select
          value={String(porPagina)}
          // Trocar o tamanho muda o que cada página contém; volta à primeira.
          onValueChange={(v) => ir({ porPagina: Number(v) })}
        >
          <SelectTrigger
            size="sm"
            className="w-20"
            aria-label="Itens por página"
          >
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
      </div>

      <div className="flex items-center gap-2 text-sm">
        <Button
          variant="outline"
          size="sm"
          disabled={pagina <= 1}
          onClick={() => ir({ pagina: pagina - 1 })}
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
          onClick={() => ir({ pagina: pagina + 1 })}
        >
          Seguinte
          <ChevronRight />
        </Button>
      </div>
    </nav>
  );
}
