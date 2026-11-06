"use client";

import { useId, useState } from "react";

import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { normalizar } from "@/domain/tabela/busca";
import { cn } from "@/lib/utils";

const comparar = new Intl.Collator("pt-BR", { sensitivity: "base" }).compare;

export function CampoComSugestoes({
  id,
  name,
  sugestoes,
  valorInicial = "",
  placeholder,
  rotuloDasSugestoes,
  onChange,
}: {
  id: string;
  name: string;
  sugestoes: string[];
  valorInicial?: string;
  placeholder?: string;
  rotuloDasSugestoes: string;
  onChange?: (valor: string) => void;
}) {
  const [valor, setValor] = useState(valorInicial);
  const [aberta, setAberta] = useState(false);
  const [destacada, setDestacada] = useState(-1);
  const idDaLista = useId();

  const termo = normalizar(valor);
  const visiveis = [...new Set(sugestoes)]
    .sort(comparar)
    .filter((sugestao) => normalizar(sugestao).includes(termo))
    .slice(0, 50);

  const mostrar = aberta && visiveis.length > 0;

  function mudar(novo: string) {
    setValor(novo);
    onChange?.(novo);
  }

  function escolher(sugestao: string) {
    mudar(sugestao);
    setAberta(false);
    setDestacada(-1);
  }

  function aoTeclar(evento: React.KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setAberta(true);
      setDestacada((atual) => Math.min(atual + 1, visiveis.length - 1));
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setDestacada((atual) => Math.max(atual - 1, 0));
    } else if (evento.key === "Enter" && mostrar && destacada >= 0) {
      evento.preventDefault();
      escolher(visiveis[destacada]);
    } else if (evento.key === "Escape" && mostrar) {
      evento.preventDefault();
      evento.stopPropagation();
      setAberta(false);
    }
  }

  return (
    <Popover open={mostrar} onOpenChange={setAberta}>
      <PopoverAnchor asChild>
        <Input
          id={id}
          name={name}
          value={valor}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={mostrar}
          aria-controls={idDaLista}
          aria-autocomplete="list"
          onChange={(evento) => {
            mudar(evento.target.value);
            setAberta(true);
            setDestacada(-1);
          }}
          onFocus={() => setAberta(true)}
          onClick={() => setAberta(true)}
          onKeyDown={aoTeclar}
        />
      </PopoverAnchor>

      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) min-w-56 p-1"
        onOpenAutoFocus={(evento) => evento.preventDefault()}
        onInteractOutside={(evento) => {
          if ((evento.target as HTMLElement).id === id) evento.preventDefault();
        }}
      >
        <p className="text-muted-foreground px-2 py-1 text-xs">{rotuloDasSugestoes}</p>
        <ul id={idDaLista} role="listbox" className="max-h-56 overflow-y-auto">
          {visiveis.map((sugestao, i) => (
            <li
              key={sugestao}
              role="option"
              aria-selected={i === destacada}
              onMouseDown={(evento) => evento.preventDefault()}
              onClick={() => escolher(sugestao)}
              className={cn(
                "hover:bg-accent hover:text-accent-foreground cursor-pointer rounded-sm px-2 py-1.5 text-sm",
                i === destacada && "bg-accent text-accent-foreground"
              )}
            >
              {sugestao}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
