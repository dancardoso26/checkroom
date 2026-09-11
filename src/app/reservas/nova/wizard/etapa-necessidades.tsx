"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

import type { ClassOption } from "@/lib/repositories/classRepository";
import type { ResourceOption } from "@/lib/repositories/resourceRepository";
import { Cabecalho } from "./ui";

export function EtapaNecessidades({
  resources,
  selecionados,
  alternar,
  turma,
}: {
  resources: ResourceOption[];
  selecionados: string[];
  alternar: (id: string, marcado: boolean) => void;
  turma?: ClassOption;
}) {
  return (
    <>
      <Cabecalho
        titulo="O que a atividade precisa?"
        descricao="Só aparecem na próxima etapa os espaços que oferecem tudo o que for marcado aqui."
      />

      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="sr-only">Recursos necessários</legend>

        {resources.map((recurso) => (
          <label
            key={recurso.id}
            htmlFor={`res-${recurso.id}`}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors",
              selecionados.includes(recurso.id)
                ? "border-primary bg-primary-subtle"
                : "bg-card hover:border-primary/30"
            )}
          >
            <Checkbox
              id={`res-${recurso.id}`}
              checked={selecionados.includes(recurso.id)}
              onCheckedChange={(v) => alternar(recurso.id, v === true)}
            />
            <span className="text-sm font-medium">{recurso.name}</span>
          </label>
        ))}
      </fieldset>

      {turma && (
        <p className="text-muted-foreground text-sm">
          A capacidade mínima de {turma.studentCount} lugares, vinda da turma
          {" "}
          {turma.name}, é aplicada automaticamente.
        </p>
      )}
    </>
  );
}
