"use client";

import { useEffect, type ReactNode } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Table2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Escala, Visao } from "@/lib/calendario";

import type { Filtros } from "@/lib/filtros";

import { FiltrosDaAgenda, type OpcaoDeProfessor } from "./filtros-da-agenda";
import type { EstadoDaAgenda } from "./url";

// Os atalhos são anunciados no próprio botão. Itens de ToggleGroup usam title:
// o gatilho do tooltip sobrescreve o data-state que marca o item selecionado.
function ComAtalho({ dica, children }: { dica: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="bottom">{dica}</TooltipContent>
    </Tooltip>
  );
}

// Atalhos só valem fora de campos de texto e com nenhum diálogo aberto: dentro
// deles, a letra S precisa virar S, e não mudar a escala da agenda.
function atalhoPermitido(evento: KeyboardEvent): boolean {
  if (evento.ctrlKey || evento.metaKey || evento.altKey) return false;

  const alvo = evento.target as HTMLElement | null;
  if (alvo?.closest("input, textarea, select, [contenteditable=true]"))
    return false;

  return document.querySelector('[role="dialog"]') === null;
}

export function BarraDaAgenda({
  estado,
  titulo,
  total,
  onEscala,
  onVisao,
  onNavegar,
  onHoje,
  onFiltros,
  professores,
  onNova,
}: {
  estado: EstadoDaAgenda;
  titulo: string;
  total?: number;
  onEscala: (escala: Escala) => void;
  onVisao: (visao: Visao) => void;
  onNavegar: (direcao: 1 | -1) => void;
  onHoje: () => void;
  onFiltros: (filtros: Filtros) => void;
  professores: OpcaoDeProfessor[];
  onNova: () => void;
}) {
  const calendario = estado.visao === "calendario";

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (!atalhoPermitido(evento)) return;

      // Na tabela não há período a navegar: só a reserva nova continua valendo.
      const acoes: Record<string, () => void> = calendario
        ? {
            d: () => onEscala("dia"),
            s: () => onEscala("semana"),
            m: () => onEscala("mes"),
            h: onHoje,
            n: onNova,
            ArrowLeft: () => onNavegar(-1),
            ArrowRight: () => onNavegar(1),
          }
        : { n: onNova };

      const acao =
        acoes[evento.key.length === 1 ? evento.key.toLowerCase() : evento.key];

      if (acao) {
        evento.preventDefault();
        acao();
      }
    }

    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [calendario, onEscala, onHoje, onNova, onNavegar]);

  const filtros = (
    <FiltrosDaAgenda
      filtros={estado.filtros}
      professores={professores}
      onAplicar={onFiltros}
    />
  );

  return (
    // Uma linha só: o calendário é o assunto da tela e leva o espaço que sobra.
    // Em telas estreitas as peças quebram para a linha de baixo.
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      {calendario ? (
        <div className="flex min-w-0 items-center gap-1 sm:gap-2">
          <ComAtalho dica="Hoje (H)">
            <Button variant="outline" size="sm" onClick={onHoje}>
              Hoje
            </Button>
          </ComAtalho>

          <div className="flex">
            <ComAtalho dica="Período anterior (←)">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Período anterior"
                onClick={() => onNavegar(-1)}
              >
                <ChevronLeft />
              </Button>
            </ComAtalho>
            <ComAtalho dica="Período seguinte (→)">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Período seguinte"
                onClick={() => onNavegar(1)}
              >
                <ChevronRight />
              </Button>
            </ComAtalho>
          </div>

          <h1 className="truncate text-lg font-semibold tracking-tight first-letter:uppercase sm:text-xl">
            {titulo}
          </h1>
        </div>
      ) : (
        <div className="flex items-baseline gap-2">
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
            Todas as reservas
          </h1>
          {total !== undefined && (
            <span className="text-muted-foreground text-sm">
              {total === 1 ? "1 reserva" : `${total} reservas`}
            </span>
          )}
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        {filtros}

        {calendario && (
          // Lista suspensa: title, e não tooltip, porque o gatilho do tooltip
          // sobrescreve atributos do próprio Select.
          <Select
            value={estado.escala}
            onValueChange={(v) => onEscala(v as Escala)}
          >
            <SelectTrigger
              size="sm"
              className="w-28"
              aria-label="Período"
              title="Período (D, S, M)"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="dia">Dia</SelectItem>
              <SelectItem value="semana">Semana</SelectItem>
              <SelectItem value="mes">Mês</SelectItem>
            </SelectContent>
          </Select>
        )}

        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={estado.visao}
          onValueChange={(v) => v && onVisao(v as Visao)}
          aria-label="Visualização"
        >
          <ToggleGroupItem
            value="calendario"
            aria-label="Calendário"
            title="Calendário"
          >
            <CalendarDays />
          </ToggleGroupItem>
          <ToggleGroupItem value="tabela" aria-label="Tabela" title="Tabela">
            <Table2 />
          </ToggleGroupItem>
        </ToggleGroup>

        <ComAtalho dica="Nova reserva (N)">
          <Button onClick={onNova}>
            <Plus />
            Nova reserva
          </Button>
        </ComAtalho>
      </div>
    </div>
  );
}
