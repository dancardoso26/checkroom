"use client";

import { Separator } from "@/components/ui/separator";
import { combineDateTime, formatFullDate, formatTimeRange } from "@/lib/datetime";
import { cn } from "@/lib/utils";

import type { RoomOption } from "@/lib/repositories/roomRepository";
import type { ClassOption } from "@/lib/repositories/classRepository";
import type { ProfessorOption } from "@/lib/repositories/professorRepository";
import type { ResourceOption } from "@/lib/repositories/resourceRepository";
import { ehPeriodoValido } from "./campos";

export function Resumo({
  professor,
  turma,
  espaco,
  campos,
  recursos,
  resources,
}: {
  professor?: ProfessorOption;
  turma?: ClassOption;
  espaco?: RoomOption;
  campos: { date: string; startTime: string; endTime: string };
  recursos: string[];
  resources: ResourceOption[];
}) {
  const temPeriodo = ehPeriodoValido(campos);

  return (
    // A ordem no DOM é depois do formulário, e o CSS o posiciona ao lado. Assim
    // quem navega por teclado percorre os campos antes do resumo, que é apenas
    // leitura.
    <aside className="bg-card h-fit space-y-4 rounded-lg border p-5">
      <p className="text-sm font-semibold">Resumo</p>
      <Separator />

      <dl className="space-y-3 text-sm">
        <LinhaResumo termo="Professor" valor={professor?.name} />
        <LinhaResumo termo="Turma" valor={turma?.name} />
        <LinhaResumo
          termo="Data e horário"
          valor={
            temPeriodo
              ? `${formatFullDate(combineDateTime(campos.date, campos.startTime))}, ${formatTimeRange(
                  combineDateTime(campos.date, campos.startTime),
                  combineDateTime(campos.date, campos.endTime)
                )}`
              : undefined
          }
        />
        <LinhaResumo
          termo="Necessidades"
          valor={
            recursos.length === 0
              ? undefined
              : recursos
                  .map((id) => resources.find((r) => r.id === id)?.name ?? id)
                  .join(", ")
          }
        />
        <LinhaResumo
          termo="Espaço"
          valor={espaco && `${espaco.building} · ${espaco.name}`}
        />
      </dl>

    </aside>
  );
}

export function LinhaResumo({ termo, valor }: { termo: string; valor?: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{termo}</dt>
      <dd className={cn("font-medium", !valor && "text-muted-foreground")}>
        {valor ?? "A definir"}
      </dd>
    </div>
  );
}
