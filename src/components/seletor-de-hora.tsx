"use client";

import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  ABERTURA_EM_MINUTOS,
  FECHAMENTO_EM_MINUTOS,
  PASSO_EM_MINUTOS,
  horaParaMinutos,
} from "@/domain/booking/businessHours";

type SeletorDeHoraProps = {
  id: string;
  value: string;
  onChange: (valor: string) => void;
  minimo?: string;
  maximo?: string;
};

function horasDisponiveis(
  minimoEmMinutos: number,
  maximoEmMinutos: number
): string[] {
  const horas: string[] = [];

  for (
    let hora = Math.floor(ABERTURA_EM_MINUTOS / 60);
    hora <= Math.floor(FECHAMENTO_EM_MINUTOS / 60);
    hora++
  ) {
    const primeiroMinutoDaHora = hora * 60;
    const ultimoMinutoDaHora = Math.min(hora * 60 + 59, maximoEmMinutos);

    if (
      ultimoMinutoDaHora > minimoEmMinutos &&
      primeiroMinutoDaHora <= maximoEmMinutos
    ) {
      horas.push(String(hora).padStart(2, "0"));
    }
  }

  return horas;
}

function minutosDisponiveis(
  hora: string | null,
  minimoEmMinutos: number,
  maximoEmMinutos: number
): string[] {
  if (hora === null) return [];

  const base = Number(hora) * 60;
  const minutos: string[] = [];

  for (let minuto = 0; minuto < 60; minuto += PASSO_EM_MINUTOS) {
    const total = base + minuto;

    if (total > maximoEmMinutos) break;
    if (total <= minimoEmMinutos) continue;

    minutos.push(String(minuto).padStart(2, "0"));
  }

  return minutos;
}

export function SeletorDeHora({
  id,
  value,
  onChange,
  minimo,
  maximo,
}: SeletorDeHoraProps) {
  const [aberto, setAberto] = useState(false);

  const [horaParcial, setHoraParcial] = useState<string | null>(null);

  const minimoEmMinutos = minimo ? horaParaMinutos(minimo) : -1;
  const maximoEmMinutos = maximo
    ? horaParaMinutos(maximo)
    : FECHAMENTO_EM_MINUTOS;

  const horaSelecionada = value ? value.slice(0, 2) : null;
  const minutoSelecionado = value ? value.slice(3, 5) : null;

  const horaEmFoco = horaParcial ?? horaSelecionada;

  const minutoEmFoco =
    horaEmFoco === horaSelecionada ? minutoSelecionado : null;

  const horas = horasDisponiveis(minimoEmMinutos, maximoEmMinutos);
  const minutos = minutosDisponiveis(
    horaEmFoco,
    minimoEmMinutos,
    maximoEmMinutos
  );

  function escolherHora(hora: string) {
    const candidatos = minutosDisponiveis(
      hora,
      minimoEmMinutos,
      maximoEmMinutos
    );

    if (minutoSelecionado && candidatos.includes(minutoSelecionado)) {
      onChange(`${hora}:${minutoSelecionado}`);
      setHoraParcial(null);
      setAberto(false);
      return;
    }

    setHoraParcial(hora);
  }

  function escolherMinuto(minuto: string) {
    if (horaEmFoco === null) return;

    onChange(`${horaEmFoco}:${minuto}`);
    setHoraParcial(null);
    setAberto(false);
  }

  return (
    <Popover
      open={aberto}
      onOpenChange={(estado) => {
        setAberto(estado);
        if (!estado) setHoraParcial(null);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={aberto}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground"
          )}
        >
          {value || "--:--"}
          <Clock className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex h-56 divide-x">
          <Coluna
            titulo="Hora"
            opcoes={horas}
            selecionada={horaEmFoco}
            onEscolher={escolherHora}
            aberto={aberto}
          />

          <Coluna
            titulo="Min"
            opcoes={minutos}
            selecionada={minutoEmFoco}
            onEscolher={escolherMinuto}
            aberto={aberto}
            vazioTexto="Escolha a hora"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Coluna({
  titulo,
  opcoes,
  selecionada,
  onEscolher,
  aberto,
  vazioTexto,
}: {
  titulo: string;
  opcoes: string[];
  selecionada: string | null;
  onEscolher: (valor: string) => void;
  aberto: boolean;
  vazioTexto?: string;
}) {
  const itemSelecionado = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (aberto && itemSelecionado.current) {
      itemSelecionado.current.scrollIntoView({ block: "center" });
    }
  }, [aberto, selecionada]);

  return (
    <div role="group" aria-label={titulo} className="flex w-20 flex-col">
      <p
        aria-hidden
        className="text-muted-foreground border-b px-2 py-1.5 text-center text-xs font-medium"
      >
        {titulo}
      </p>

      <div className="flex-1 overflow-y-auto p-1">
        {opcoes.length === 0 && vazioTexto && (
          <p className="text-muted-foreground px-2 py-3 text-center text-xs">
            {vazioTexto}
          </p>
        )}

        {opcoes.map((opcao) => {
          const ativa = opcao === selecionada;

          return (
            <button
              key={opcao}
              ref={ativa ? itemSelecionado : undefined}
              type="button"
              onClick={() => onEscolher(opcao)}
              className={cn(
                "w-full rounded-sm px-2 py-1.5 text-center text-sm transition-colors",
                ativa
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {opcao}
            </button>
          );
        })}
      </div>
    </div>
  );
}
