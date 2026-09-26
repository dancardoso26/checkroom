"use client";

import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ehChaveValida,
  gradeDoMes,
  mesmoMes,
  numeroDoDia,
  periodoVizinho,
  tituloDoPeriodo,
} from "@/lib/calendario";
import { cn } from "@/lib/utils";

// A semana começa na segunda, como na agenda.
const CABECALHO = ["S", "T", "Q", "Q", "S", "S", "D"];

const porExtenso = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function exibir(chave: string): string {
  if (!ehChaveValida(chave)) return "dd/mm/aaaa";
  const [ano, mes, dia] = chave.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function SeletorDeData({
  id,
  value,
  onChange,
  minimo,
  hoje,
}: {
  id: string;
  /** "AAAA-MM-DD" */
  value: string;
  onChange: (chave: string) => void;
  /** Dias anteriores a este ficam desabilitados. */
  minimo?: string;
  /** O dia de hoje, marcado na grade. Vem do servidor, no fuso de Brasília. */
  hoje: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [mes, setMes] = useState(value || hoje);

  function alternar(abrir: boolean) {
    // Reabrir volta ao mês do valor: navegar por outros meses não deve deixar
    // o balão preso onde parou da última vez.
    if (abrir) setMes(ehChaveValida(value) ? value : hoje);
    setAberto(abrir);
  }

  function escolher(chave: string) {
    onChange(chave);
    setAberto(false);
  }

  const anteriorPermitido =
    !minimo || periodoVizinho("mes", mes, -1) >= `${minimo.slice(0, 7)}-01`;

  return (
    <Popover open={aberto} onOpenChange={alternar}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          // Anuncia como controle de seleção, e não como botão comum.
          role="combobox"
          aria-expanded={aberto}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground"
          )}
        >
          {exibir(value)}
          <CalendarDays className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-72 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="pl-1 text-sm font-semibold first-letter:uppercase">
            {tituloDoPeriodo("mes", mes)}
          </p>

          <div className="flex">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label="Mês anterior"
              disabled={!anteriorPermitido}
              onClick={() => setMes(periodoVizinho("mes", mes, -1))}
            >
              <ChevronLeft />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label="Próximo mês"
              onClick={() => setMes(periodoVizinho("mes", mes, 1))}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-y-1 text-center">
          {CABECALHO.map((letra, i) => (
            <span
              key={i}
              aria-hidden
              className="text-muted-foreground py-1 text-xs font-medium"
            >
              {letra}
            </span>
          ))}

          {gradeDoMes(mes).map((dia) => {
            const bloqueado = minimo !== undefined && dia < minimo;
            const selecionado = dia === value;
            const noMes = mesmoMes(dia, mes);

            return (
              <button
                key={dia}
                type="button"
                disabled={bloqueado}
                aria-label={porExtenso.format(new Date(`${dia}T00:00:00Z`))}
                aria-pressed={selecionado}
                aria-current={dia === hoje ? "date" : undefined}
                onClick={() => escolher(dia)}
                className={cn(
                  "mx-auto flex size-9 items-center justify-center rounded-full text-sm transition-colors",
                  selecionado
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "hover:bg-accent",
                  !selecionado && !noMes && "text-muted-foreground/60",
                  !selecionado &&
                    dia === hoje &&
                    "text-primary font-semibold ring-1 ring-primary",
                  bloqueado &&
                    "cursor-not-allowed opacity-30 hover:bg-transparent"
                )}
              >
                {numeroDoDia(dia)}
              </button>
            );
          })}
        </div>

        <div className="mt-2 flex justify-between border-t pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-primary"
            disabled={minimo !== undefined && hoje < minimo}
            onClick={() => escolher(hoje)}
          >
            Hoje
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
