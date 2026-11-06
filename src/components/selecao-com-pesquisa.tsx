"use client";

import { useId, useState } from "react";
import { CheckIcon, ChevronDownIcon, Search } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { normalizar } from "@/domain/tabela/busca";
import { cn } from "@/lib/utils";

export type OpcaoComPesquisa = { id: string; nome: string; detalhe?: string };

const comparar = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true })
  .compare;

function rotuloDa(opcao: OpcaoComPesquisa): string {
  return opcao.detalhe ? `${opcao.nome} (${opcao.detalhe})` : opcao.nome;
}

export function SelecaoComPesquisa({
  id,
  name,
  opcoes,
  opcoesFixas = [],
  value,
  valorInicial = "",
  placeholder,
  rotuloDaPesquisa,
  invalido = false,
  disabled = false,
  ordenar = true,
  onChange,
}: {
  id: string;
  name?: string;
  opcoes: OpcaoComPesquisa[];
  opcoesFixas?: OpcaoComPesquisa[];
  value?: string;
  valorInicial?: string;
  placeholder: string;
  rotuloDaPesquisa: string;
  invalido?: boolean;
  disabled?: boolean;
  ordenar?: boolean;
  onChange?: (valor: string) => void;
}) {
  const [valorInterno, setValorInterno] = useState(valorInicial);
  const [aberta, setAberta] = useState(false);
  const [busca, setBusca] = useState("");
  const idDaLista = useId();

  const valor = value ?? valorInterno;
  const ordenadas = ordenar
    ? [...opcoes].sort((a, b) => comparar(a.nome, b.nome))
    : opcoes;
  const todas = [...opcoesFixas, ...ordenadas];

  const termo = normalizar(busca);
  const visiveis = todas.filter((opcao) =>
    normalizar(rotuloDa(opcao)).includes(termo)
  );
  const escolhida = todas.find((opcao) => opcao.id === valor);

  function mudarAbertura(aberto: boolean) {
    setAberta(aberto);
    if (!aberto) setBusca("");
  }

  function escolher(idDaOpcao: string) {
    if (value === undefined) setValorInterno(idDaOpcao);
    onChange?.(idDaOpcao);
    mudarAbertura(false);
  }

  return (
    <>
      <Popover open={aberta} onOpenChange={mudarAbertura} modal>
        <PopoverTrigger asChild>
          <button
            type="button"
            id={id}
            role="combobox"
            aria-expanded={aberta}
            aria-controls={idDaLista}
            disabled={disabled}
            data-invalido={invalido || undefined}
            className="border-input bg-card focus-visible:border-ring focus-visible:ring-ring/50 data-invalido:border-destructive data-invalido:ring-destructive/20 flex h-9 w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className={cn("truncate", !escolhida && "text-muted-foreground")}>
              {escolhida ? rotuloDa(escolhida) : placeholder}
            </span>
            <ChevronDownIcon
              aria-hidden
              className="text-muted-foreground size-4 shrink-0 opacity-50"
            />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          className="w-(--radix-popover-trigger-width) min-w-56 p-0"
        >
          <div className="flex items-center gap-2 border-b px-3">
            <Search aria-hidden className="text-muted-foreground size-4 shrink-0" />
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

          <ul id={idDaLista} role="listbox" className="max-h-60 overflow-y-auto p-1">
            {visiveis.map((opcao) => {
              const selecionada = opcao.id === valor;

              return (
                <li
                  key={opcao.id}
                  role="option"
                  aria-selected={selecionada}
                  tabIndex={0}
                  onClick={() => escolher(opcao.id)}
                  onKeyDown={(evento) => {
                    if (evento.key === "Enter" || evento.key === " ") {
                      evento.preventDefault();
                      escolher(opcao.id);
                    }
                  }}
                  className="hover:bg-accent hover:text-accent-foreground focus:bg-accent flex cursor-pointer items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm outline-none"
                >
                  <span>
                    {opcao.nome}
                    {opcao.detalhe && (
                      <span className="text-muted-foreground"> ({opcao.detalhe})</span>
                    )}
                  </span>
                  {selecionada && <CheckIcon aria-hidden className="size-4 shrink-0" />}
                </li>
              );
            })}

            {visiveis.length === 0 && (
              <li className="text-muted-foreground px-2 py-6 text-center text-sm">
                Nenhum resultado
              </li>
            )}
          </ul>
        </PopoverContent>
      </Popover>

      {name && <input type="hidden" name={name} value={valor} />}
    </>
  );
}
