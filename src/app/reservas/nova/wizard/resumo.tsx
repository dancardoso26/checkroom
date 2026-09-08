"use client";

import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Clock,
  MapPin,
  Monitor,
  Tag,
  User,
  Users,
} from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { combineDateTime, formatFullDate, formatTimeRange } from "@/lib/datetime";
import { cn } from "@/lib/utils";

import type { RoomOption } from "@/lib/repositories/roomRepository";
import type { ClassOption } from "@/lib/repositories/classRepository";
import type { ProfessorOption } from "@/lib/repositories/professorRepository";
import type { ResourceOption } from "@/lib/repositories/resourceRepository";
import type { SubjectOption } from "@/lib/repositories/subjectRepository";
import { ROTULO_DA_ATIVIDADE, ehPeriodoValido } from "./campos";

export function Resumo({
  professor,
  turma,
  espaco,
  campos,
  recursos,
  resources,
  disciplina,
}: {
  professor?: ProfessorOption;
  turma?: ClassOption;
  espaco?: RoomOption;
  campos: {
    activityType: keyof typeof ROTULO_DA_ATIVIDADE;
    date: string;
    startTime: string;
    endTime: string;
  };
  recursos: string[];
  resources: ResourceOption[];
  disciplina?: SubjectOption;
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
        <LinhaResumo
          icone={Tag}
          termo="Tipo"
          valor={ROTULO_DA_ATIVIDADE[campos.activityType]}
        />
        <LinhaResumo icone={User} termo="Professor" valor={professor?.name} />
        <LinhaResumo icone={Users} termo="Turma" valor={turma?.name} />
        {campos.activityType === "class" && (
          <LinhaResumo
            icone={BookOpen}
            termo="Disciplina"
            valor={disciplina?.name}
          />
        )}
        <LinhaResumo
          icone={Clock}
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
          icone={Monitor}
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
          icone={MapPin}
          termo="Espaço"
          valor={espaco && `${espaco.building} · ${espaco.name}`}
        />
      </dl>
    </aside>
  );
}

/**
 * O ícone fica no azul da marca quando o campo está preenchido, e no cinza de
 * texto secundário quando não está. É a mesma distinção que o valor já faz, e
 * juntas elas permitem varrer o resumo pela cor, sem ler.
 *
 * aria-hidden porque o ícone repete o que o rótulo ao lado já diz: anunciá-lo
 * faria o leitor de tela dizer a mesma informação duas vezes.
 */
export function LinhaResumo({
  icone: Icone,
  termo,
  valor,
}: {
  icone: LucideIcon;
  termo: string;
  valor?: string;
}) {
  return (
    <div className="flex gap-2.5">
      <Icone
        aria-hidden
        className={cn(
          "mt-0.5 size-4 shrink-0",
          valor ? "text-primary" : "text-muted-foreground/60"
        )}
      />

      <div className="min-w-0">
        <dt className="text-muted-foreground text-xs">{termo}</dt>
        <dd className={cn("font-medium", !valor && "text-muted-foreground")}>
          {valor ?? "A definir"}
        </dd>
      </div>
    </div>
  );
}
