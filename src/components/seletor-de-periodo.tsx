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
  gradeDoMes,
  inicioDaSemana,
  mesmoMes,
  numeroDoDia,
  periodoVizinho,
  somarDias,
  tituloDoPeriodo,
} from "@/domain/agenda/navegacao-da-agenda";
import { cn } from "@/lib/utils";

export type Periodo = { de: string; ate: string };

type Atalho = { rotulo: string; periodo: Periodo };

const CABECALHO = ["S", "T", "Q", "Q", "S", "S", "D"];

const curta = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
  year: "numeric",
});

const porExtenso = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatar(chave: string): string {
  return curta.format(new Date(`${chave}T00:00:00Z`)).replace(/\./g, "");
}

function exibir(chave: string | null): string {
  if (!chave) return "dd/mm/aaaa";
  const [ano, mes, dia] = chave.split("-");
  return `${dia}/${mes}/${ano}`;
}

function primeiroDoMes(chave: string): string {
  return `${chave.slice(0, 7)}-01`;
}

function ultimoDoMes(chave: string): string {
  return somarDias(periodoVizinho("mes", chave, 1), -1);
}

function atalhosDe(hoje: string): Atalho[] {
  const semana = inicioDaSemana(hoje);
  const mesAnterior = periodoVizinho("mes", hoje, -1);

  return [
    { rotulo: "Hoje", periodo: { de: hoje, ate: hoje } },
    {
      rotulo: "Ontem",
      periodo: { de: somarDias(hoje, -1), ate: somarDias(hoje, -1) },
    },
    {
      rotulo: "Esta semana",
      periodo: { de: semana, ate: somarDias(semana, 6) },
    },
    {
      rotulo: "Semana passada",
      periodo: { de: somarDias(semana, -7), ate: somarDias(semana, -1) },
    },
    {
      rotulo: "Últimos 7 dias",
      periodo: { de: somarDias(hoje, -6), ate: hoje },
    },
    {
      rotulo: "Últimos 30 dias",
      periodo: { de: somarDias(hoje, -29), ate: hoje },
    },
    {
      rotulo: "Últimos 90 dias",
      periodo: { de: somarDias(hoje, -89), ate: hoje },
    },
    {
      rotulo: "Este mês",
      periodo: { de: primeiroDoMes(hoje), ate: ultimoDoMes(hoje) },
    },
    {
      rotulo: "Mês anterior",
      periodo: { de: primeiroDoMes(mesAnterior), ate: ultimoDoMes(mesAnterior) },
    },
    {
      rotulo: "Este ano",
      periodo: { de: `${hoje.slice(0, 4)}-01-01`, ate: `${hoje.slice(0, 4)}-12-31` },
    },
  ];
}

function MesDoPeriodo({
  mes,
  inicio,
  fim,
  alvo,
  hoje,
  onEscolher,
  onPassar,
}: {
  mes: string;
  inicio: string | null;
  fim: string | null;
  alvo: string | null;
  hoje: string;
  onEscolher: (dia: string) => void;
  onPassar: (dia: string | null) => void;
}) {
  const limite = fim ?? alvo;
  const [de, ate] =
    inicio && limite
      ? inicio <= limite
        ? [inicio, limite]
        : [limite, inicio]
      : [inicio, inicio];

  return (
    <div className="w-[17.5rem]">
      <p className="mb-2 text-center text-sm font-semibold first-letter:uppercase">
        {tituloDoPeriodo("mes", mes)}
      </p>

      <div className="grid grid-cols-7 text-center">
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
          if (!mesmoMes(dia, mes)) {
            return <span key={dia} aria-hidden className="size-10" />;
          }

          const ehInicio = dia === de;
          const ehFim = dia === ate;
          const nosLimites = ehInicio || ehFim;
          const dentro = de !== null && ate !== null && dia > de && dia < ate;

          return (
            <div
              key={dia}
              className={cn(
                "flex size-10 items-center justify-center",
                dentro && "bg-accent",
                ehInicio && ate !== de && "bg-accent rounded-l-full",
                ehFim && ate !== de && "bg-accent rounded-r-full"
              )}
            >
              <button
                type="button"
                aria-label={porExtenso.format(new Date(`${dia}T00:00:00Z`))}
                aria-pressed={nosLimites}
                aria-current={dia === hoje ? "date" : undefined}
                onClick={() => onEscolher(dia)}
                onMouseEnter={() => onPassar(dia)}
                onMouseLeave={() => onPassar(null)}
                className={cn(
                  "flex size-9 items-center justify-center rounded-full text-sm transition-colors",
                  nosLimites
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "hover:bg-accent",
                  !nosLimites &&
                    dia === hoje &&
                    "text-primary ring-primary font-semibold ring-1"
                )}
              >
                {numeroDoDia(dia)}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SeletorDePeriodo({
  de,
  ate,
  hoje,
  onAplicar,
}: {
  de: string;
  ate: string;
  hoje: string;
  onAplicar: (periodo: Periodo) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [mes, setMes] = useState(primeiroDoMes(de));
  const [inicio, setInicio] = useState<string | null>(de);
  const [fim, setFim] = useState<string | null>(ate);
  const [alvo, setAlvo] = useState<string | null>(null);

  const atalhos = atalhosDe(hoje);
  const atual = atalhos.find((a) => a.periodo.de === de && a.periodo.ate === ate);
  const rascunho = atalhos.find(
    (a) => a.periodo.de === inicio && a.periodo.ate === fim
  );

  function alternar(abrir: boolean) {
    if (abrir) {
      setInicio(de);
      setFim(ate);
      setAlvo(null);
      setMes(primeiroDoMes(de));
    }
    setAberto(abrir);
  }

  function escolherDia(dia: string) {
    if (inicio === null || fim !== null) {
      setInicio(dia);
      setFim(null);
      return;
    }

    if (dia < inicio) {
      setFim(inicio);
      setInicio(dia);
    } else {
      setFim(dia);
    }
  }

  function escolherAtalho(periodo: Periodo) {
    setInicio(periodo.de);
    setFim(periodo.ate);
    setMes(primeiroDoMes(periodo.de));
  }

  function aplicar() {
    if (!inicio || !fim) return;
    onAplicar({ de: inicio, ate: fim });
    setAberto(false);
  }

  const proximoMes = periodoVizinho("mes", mes, 1);

  return (
    <div className="flex items-center gap-3">
      <span className="text-muted-foreground hidden text-xs sm:inline">
        {formatar(de)} a {formatar(ate)}
      </span>

      <Popover open={aberto} onOpenChange={alternar}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Escolher o período"
            aria-expanded={aberto}
          >
            <CalendarDays />
            {atual?.rotulo ?? "Personalizado"}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          className="flex w-auto max-w-[calc(100vw-1rem)] flex-col p-0 md:flex-row"
        >
          <ul className="flex shrink-0 gap-1 overflow-x-auto border-b p-2 md:w-44 md:flex-col md:overflow-visible md:border-r md:border-b-0">
            {atalhos.map(({ rotulo, periodo }) => (
              <li key={rotulo} className="shrink-0">
                <button
                  type="button"
                  onClick={() => escolherAtalho(periodo)}
                  aria-pressed={rascunho?.rotulo === rotulo}
                  className={cn(
                    "hover:bg-accent w-full rounded-md px-3 py-2 text-left text-sm whitespace-nowrap transition-colors",
                    rascunho?.rotulo === rotulo && "bg-accent font-medium"
                  )}
                >
                  {rotulo}
                </button>
              </li>
            ))}
          </ul>

          <div className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="Mês anterior"
                onClick={() => setMes(periodoVizinho("mes", mes, -1))}
              >
                <ChevronLeft />
              </Button>

              <div className="flex items-center gap-2 text-sm">
                <span className="rounded-md border px-3 py-1.5">
                  {exibir(inicio)}
                </span>
                <span className="text-muted-foreground">a</span>
                <span className="rounded-md border px-3 py-1.5">
                  {exibir(fim)}
                </span>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="Próximo mês"
                onClick={() => setMes(proximoMes)}
              >
                <ChevronRight />
              </Button>
            </div>

            <div className="flex flex-col gap-4 md:flex-row md:gap-6">
              <MesDoPeriodo
                mes={mes}
                inicio={inicio}
                fim={fim}
                alvo={alvo}
                hoje={hoje}
                onEscolher={escolherDia}
                onPassar={setAlvo}
              />
              <div className="hidden md:block">
                <MesDoPeriodo
                  mes={proximoMes}
                  inicio={inicio}
                  fim={fim}
                  alvo={alvo}
                  hoje={hoje}
                  onEscolher={escolherDia}
                  onPassar={setAlvo}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAberto(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!inicio || !fim}
                onClick={aplicar}
              >
                Aplicar
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
