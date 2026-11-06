"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, DoorOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  diasDoPeriodo,
  gradeDoMes,
  mesmoMes,
  numeroDoDia,
  periodoVizinho,
  somarDias,
  tituloDoPeriodo,
} from "@/domain/agenda/navegacao-da-agenda";
import { formatTimeRange, localDayKey } from "@/lib/datetime";
import type { BookingListItem } from "@/lib/repositories/repositorio-de-reservas";
import { cn } from "@/lib/utils";

import {
  COR_DA_ATIVIDADE,
  COR_DA_INSCRICAO_ABERTA,
  corDaEncerrada,
} from "./estilo";
import type { EstadoDaAgenda } from "./url";

const CABECALHO = ["S", "T", "Q", "Q", "S", "S", "D"];

const porExtenso = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const cabecalhoDoDia = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
});

function rotuloDoDia(dia: string, hoje: string): string {
  const data = cabecalhoDoDia.format(new Date(`${dia}T00:00:00Z`));
  if (dia === hoje) return `Hoje, ${data}`;
  if (dia === somarDias(hoje, 1)) return `Amanhã, ${data}`;
  return data;
}

export function MenuLateral({
  estado,
  hoje,
  agora,
  proximos,
  onEscolherDia,
  onAbrirReserva,
}: {
  estado: EstadoDaAgenda;
  hoje: string;
  agora: Date;
  proximos: BookingListItem[];
  onEscolherDia: (dia: string) => void;
  onAbrirReserva: (id: string) => void;
}) {
  const [mes, setMes] = useState(estado.data);

  const destacados = diasDoPeriodo(estado.escala, estado.data);

  const dias = new Map<string, BookingListItem[]>();
  for (const item of proximos) {
    if (item.cancelled) continue;
    const dia = localDayKey(item.startsAt);
    dias.set(dia, [...(dias.get(dia) ?? []), item]);
  }

  return (
    <aside
      aria-label="Menu lateral da agenda"
      className="relative hidden w-64 shrink-0 overflow-hidden md:block"
    >
      <div className="absolute inset-0 flex flex-col">
        <div className="pb-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="pl-1 text-sm font-semibold first-letter:uppercase">
              {tituloDoPeriodo("mes", mes)}
            </p>
            <div className="flex">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label="Mês anterior"
                onClick={() => setMes(periodoVizinho("mes", mes, -1))}
              >
                <ChevronLeft />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label="Próximo mês"
                onClick={() => setMes(periodoVizinho("mes", mes, 1))}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-y-0.5 text-center">
            {CABECALHO.map((letra, i) => (
              <span
                key={i}
                aria-hidden
                className="text-muted-foreground py-1 text-xs font-medium"
              >
                {letra}
              </span>
            ))}

            {gradeDoMes(mes).map((dia) => (
              <button
                key={dia}
                type="button"
                aria-label={porExtenso.format(new Date(`${dia}T00:00:00Z`))}
                aria-current={dia === hoje ? "date" : undefined}
                onClick={() => onEscolherDia(dia)}
                className={cn(
                  "relative mx-auto flex size-7 items-center justify-center rounded-full text-xs transition-colors",
                  !mesmoMes(dia, mes) && "text-muted-foreground/60",
                  destacados.includes(dia) && "bg-primary-subtle text-primary",
                  dia === hoje &&
                    "bg-primary text-primary-foreground font-semibold",
                  dia !== hoje &&
                    !destacados.includes(dia) &&
                    "hover:bg-accent",
                )}
              >
                {numeroDoDia(dia)}
                {dias.has(dia) && dia !== hoje && (
                  <span
                    aria-hidden
                    className="bg-primary absolute bottom-0.5 size-1 rounded-full"
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-3 pr-2">
          <h2 className="text-sm font-semibold">Próximos eventos</h2>

          {dias.size === 0 && (
            <p className="text-muted-foreground text-sm">
              Nenhum evento nos próximos 30 dias.
            </p>
          )}

          {[...dias.entries()].map(([dia, itens]) => (
            <section key={dia} className="space-y-1.5">
              <h3 className="text-muted-foreground text-xs font-medium first-letter:uppercase">
                {rotuloDoDia(dia, hoje)}
              </h3>
              <ul className="space-y-1.5">
                {itens.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onAbrirReserva(item.id)}
                      className={cn(
                        "w-full rounded-md border border-l-4 px-2 py-1.5 text-left text-xs shadow-sm transition-shadow hover:shadow-md",
                        COR_DA_ATIVIDADE[item.activityType],
                        corDaEncerrada(item.endsAt, agora),
                        item.inscricaoAberta && COR_DA_INSCRICAO_ABERTA,
                      )}
                    >
                      <p className="truncate font-semibold">{item.purpose}</p>
                      <p className="truncate">
                        {formatTimeRange(item.startsAt, item.endsAt)}
                      </p>
                      <p className="text-muted-foreground flex items-center gap-1 truncate">
                        <DoorOpen aria-hidden className="size-3 shrink-0" />
                        {item.roomName}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </aside>
  );
}
