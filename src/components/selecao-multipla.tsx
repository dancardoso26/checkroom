"use client";

import { useState } from "react";
import { ChevronDownIcon, Search } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type OpcaoDaSelecao = { id: string; nome: string; marcador?: string };

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export function SelecaoMultipla({
  id,
  name,
  opcoes,
  iniciais = [],
  valor,
  placeholder,
  rotuloDaPesquisa,
  invalido = false,
  onChange,
}: {
  id: string;
  name: string;
  opcoes: OpcaoDaSelecao[];
  iniciais?: string[];
  valor?: string[];
  placeholder: string;
  rotuloDaPesquisa: string;
  invalido?: boolean;
  onChange?: (selecionados: string[]) => void;
}) {
  const [internos, setSelecionados] = useState<string[]>(iniciais);
  const selecionados = valor ?? internos;
  const [aberta, setAberta] = useState(false);
  const [busca, setBusca] = useState("");

  const termo = normalizar(busca);
  const visiveis = opcoes.filter((opcao) =>
    normalizar(opcao.nome).includes(termo),
  );
  const opcoesSelecionadas = opcoes.filter((opcao) =>
    selecionados.includes(opcao.id),
  );

  function alternar(idDaOpcao: string, marcado: boolean) {
    const novos = marcado
      ? [...selecionados, idDaOpcao]
      : selecionados.filter((atual) => atual !== idDaOpcao);
    setSelecionados(novos);
    onChange?.(novos);
  }

  function mudarAbertura(aberto: boolean) {
    setAberta(aberto);
    if (!aberto) setBusca("");
  }

  return (
    <div>
      <Popover open={aberta} onOpenChange={mudarAbertura} modal>
        <PopoverTrigger asChild>
          <button
            type="button"
            id={id}
            data-invalido={invalido || undefined}
            className="border-input bg-card focus-visible:border-ring focus-visible:ring-ring/50 data-invalido:border-destructive data-invalido:ring-destructive/20 flex h-9 w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px]"
          >
            {opcoesSelecionadas.length > 1 ? (
              <span className="truncate">
                {opcoesSelecionadas.length} selecionados
              </span>
            ) : opcoesSelecionadas.length === 1 ? (
              <span className="flex min-w-0 items-center gap-3 overflow-hidden whitespace-nowrap">
                {opcoesSelecionadas.map((opcao) => (
                  <span
                    key={opcao.id}
                    className="inline-flex items-center gap-1.5"
                  >
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
                  </span>
                ))}
              </span>
            ) : (
              <span className="text-muted-foreground truncate">
                {placeholder}
              </span>
            )}
            <ChevronDownIcon
              aria-hidden
              className="text-muted-foreground size-4 shrink-0 opacity-50"
            />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          className="w-(--radix-popover-trigger-width) p-0"
        >
          <div className="flex items-center gap-2 border-b px-3">
            <Search
              aria-hidden
              className="text-muted-foreground size-4 shrink-0"
            />
            <input
              type="search"
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
              aria-label={rotuloDaPesquisa}
              placeholder="Pesquisar"
              autoComplete="off"
              className="placeholder:text-muted-foreground h-10 w-full bg-transparent text-sm outline-none focus-visible:outline-none!"
            />
          </div>

          <ul className="max-h-60 overflow-y-auto p-1">
            {visiveis.map((opcao) => (
              <li key={opcao.id}>
                <label className="hover:bg-accent hover:text-accent-foreground flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm">
                  <Checkbox
                    checked={selecionados.includes(opcao.id)}
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

            {visiveis.length === 0 && (
              <li className="text-muted-foreground px-2 py-6 text-center text-sm">
                Nenhum resultado
              </li>
            )}
          </ul>
        </PopoverContent>
      </Popover>

      {selecionados.map((valor) => (
        <input key={valor} type="hidden" name={name} value={valor} />
      ))}
    </div>
  );
}
