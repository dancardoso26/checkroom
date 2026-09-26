"use client";

import { ChevronDown } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { ResourceOption } from "@/lib/repositories/resourceRepository";
import { cn } from "@/lib/utils";

export function SeletorDeRecursos({
  id,
  recursos,
  selecionados,
  alternar,
}: {
  id: string;
  recursos: ResourceOption[];
  selecionados: string[];
  alternar: (id: string, marcado: boolean) => void;
}) {
  const nomes = recursos
    .filter((r) => selecionados.includes(r.id))
    .map((r) => r.name);

  return (
    <Popover>
      <PopoverTrigger
        id={id}
        className={cn(
          "border-input flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 text-left text-sm shadow-xs",
          nomes.length === 0 && "text-muted-foreground"
        )}
      >
        <span className="truncate">
          {nomes.length === 0 ? "Nenhum item necessário" : nomes.join(", ")}
        </span>
        <ChevronDown aria-hidden className="size-4 shrink-0 opacity-50" />
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) p-1"
      >
        <fieldset>
          <legend className="sr-only">Itens necessários</legend>
          {recursos.map((recurso) => (
            <label
              key={recurso.id}
              htmlFor={`res-${recurso.id}`}
              className="hover:bg-accent flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
            >
              <Checkbox
                id={`res-${recurso.id}`}
                checked={selecionados.includes(recurso.id)}
                onCheckedChange={(v) => alternar(recurso.id, v === true)}
              />
              {recurso.name}
            </label>
          ))}
        </fieldset>
      </PopoverContent>
    </Popover>
  );
}
