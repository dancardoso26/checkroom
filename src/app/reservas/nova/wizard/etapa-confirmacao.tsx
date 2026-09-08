"use client";

import { combineDateTime, formatFullDate, formatTimeRange } from "@/lib/datetime";

import type { RoomOption } from "@/lib/repositories/roomRepository";
import type { ClassOption } from "@/lib/repositories/classRepository";
import type { ProfessorOption } from "@/lib/repositories/professorRepository";
import type { ResourceOption } from "@/lib/repositories/resourceRepository";
import { Cabecalho } from "./ui";

export function EtapaConfirmacao({
  campos,
  professor,
  turma,
  espaco,
  recursos,
  resources,
}: {
  campos: { purpose: string; date: string; startTime: string; endTime: string };
  professor?: ProfessorOption;
  turma?: ClassOption;
  espaco?: RoomOption;
  recursos: string[];
  resources: ResourceOption[];
}) {
  const inicio = combineDateTime(campos.date, campos.startTime);
  const fim = combineDateTime(campos.date, campos.endTime);

  return (
    <>
      <Cabecalho
        titulo="Revise antes de confirmar"
        descricao="A verificação é refeita no envio, porque a agenda pode ter mudado desde a análise."
      />

      <dl className="grid gap-4 sm:grid-cols-2">
        <Item termo="Finalidade" valor={campos.purpose} />
        <Item termo="Professor" valor={professor?.name} />
        <Item termo="Turma" valor={turma && `${turma.name} · ${turma.studentCount} alunos`} />
        <Item termo="Curso" valor={turma?.courseName} />
        <Item termo="Data" valor={formatFullDate(inicio)} />
        <Item termo="Horário" valor={formatTimeRange(inicio, fim)} />
        <Item termo="Espaço" valor={espaco && `${espaco.building} · ${espaco.name}`} />
        <Item
          termo="Recursos"
          valor={
            recursos.length === 0
              ? "Nenhum"
              : recursos
                  .map((id) => resources.find((r) => r.id === id)?.name ?? id)
                  .join(", ")
          }
        />
      </dl>
    </>
  );
}

export function Item({ termo, valor }: { termo: string; valor?: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{termo}</dt>
      <dd className="font-medium">{valor ?? "—"}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Painel lateral e telas de apoio
// ---------------------------------------------------------------------------
