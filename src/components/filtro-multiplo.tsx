"use client";

import { ChevronDown, Search } from "lucide-react";
import { useState } from "react";

import { RotuloDeCampo } from "@/components/rotulo-de-campo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { normalizar } from "@/domain/tabela/busca";
import { cn } from "@/lib/utils";

export type OpcaoDoFiltro = { id: string; nome: string; marcador?: string };

export function passaNoFiltro(selecionados: string[], valor: string | null) {
  return (
    selecionados.length === 0 ||
    (valor !== null && selecionados.includes(valor))
  );
}

export function FiltroMultiplo({
  rotulo,
  opcoes,
  valor,
  onChange,
}: {
  rotulo: string;
  opcoes: OpcaoDoFiltro[];
  valor: string[];
  onChange: (valor: string[]) => void;
}) {
  const [busca, setBusca] = useState("");

  const termo = normalizar(busca);
  const visiveis = opcoes.filter((opcao) =>
    normalizar(opcao.nome).includes(termo),
  );

  function alternar(id: string, marcado: boolean) {
    onChange(marcado ? [...valor, id] : valor.filter((atual) => atual !== id));
  }

  return (
    <Popover onOpenChange={() => setBusca("")}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`Filtrar por ${rotulo.toLowerCase()}`}
        >
          <RotuloDeCampo rotulo={rotulo} />
          {valor.length > 0 && (
            <span className="bg-primary text-primary-foreground rounded-full px-1.5 text-xs">
              {valor.length}
            </span>
          )}
          <ChevronDown aria-hidden className="text-muted-foreground size-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-60 p-0">
        <div className="relative border-b">
          <Search
            aria-hidden
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          />
          <Input
            type="search"
            aria-label={`Pesquisar em ${rotulo.toLowerCase()}`}
            placeholder="Pesquisar"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            className="h-10 rounded-none rounded-t-md border-0 bg-transparent pl-9 shadow-none focus-visible:border-0 focus-visible:ring-0 focus-visible:outline-none!"
          />
        </div>

        <ul className="max-h-64 overflow-y-auto p-1">
          {visiveis.length === 0 && (
            <li className="text-muted-foreground px-2 py-3 text-center text-sm">
              Nenhuma opção encontrada.
            </li>
          )}
          {visiveis.map((opcao) => (
            <li key={opcao.id}>
              <label className="hover:bg-accent hover:text-accent-foreground flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm">
                <Checkbox
                  checked={valor.includes(opcao.id)}
                  onCheckedChange={(marcado) =>
                    alternar(opcao.id, marcado === true)
                  }
                />
                {opcao.marcador && (
                  <span
                    aria-hidden
                    className={cn(
                      "size-2.5 shrink-0 rounded-full",
                      opcao.marcador,
                    )}
                  />
                )}
                {opcao.nome}
              </label>
            </li>
          ))}
        </ul>

        {valor.length > 0 && (
          <div className="border-t p-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => onChange([])}
            >
              Limpar
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
