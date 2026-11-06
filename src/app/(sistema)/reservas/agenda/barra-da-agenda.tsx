"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  PanelLeft,
  Plus,
  Table2,
} from "lucide-react";

import { CampoDePesquisa } from "@/components/campo-de-pesquisa";
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
import type { Escala, Visao } from "@/domain/agenda/navegacao-da-agenda";

import type { Filtros } from "@/domain/agenda/filtros-da-agenda";

import type { ParDeDocencia } from "@/lib/repositories/repositorio-de-disciplinas";

import { FiltrosDaAgenda, type OpcaoDeProfessor } from "./filtros-da-agenda";
import type { EstadoDaAgenda } from "./url";

function ComAtalho({ dica, children }: { dica: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="bottom">{dica}</TooltipContent>
    </Tooltip>
  );
}

function atalhoPermitido(evento: KeyboardEvent): boolean {
  if (evento.ctrlKey || evento.metaKey || evento.altKey) return false;

  const alvo = evento.target as HTMLElement | null;
  if (alvo?.closest("input, textarea, select, [contenteditable=true]"))
    return false;

  return document.querySelector('[role="dialog"]') === null;
}

function BuscaDaAgenda({
  busca,
  onBusca,
}: {
  busca: string;
  onBusca: (busca: string) => void;
}) {
  const [texto, setTexto] = useState(busca);

  useEffect(() => {
    if (texto.trim() === busca) return;
    const espera = setTimeout(() => onBusca(texto.trim()), 300);
    return () => clearTimeout(espera);
  }, [texto, busca, onBusca]);

  return (
    <CampoDePesquisa
      valor={texto}
      onMudar={setTexto}
      rotulo="Pesquisar reservas"
      className="sm:w-72"
    />
  );
}

export function BarraDaAgenda({
  estado,
  titulo,
  onEscala,
  onVisao,
  onNavegar,
  onHoje,
  onFiltros,
  professores,
  turmas,
  espacos,
  onBusca,
  onNova,
  menuAberto,
  onMenu,
  tituloDaPagina,
  docencia,
}: {
  estado: EstadoDaAgenda;
  titulo: string;
  onEscala: (escala: Escala) => void;
  onVisao: (visao: Visao) => void;
  onNavegar: (direcao: 1 | -1) => void;
  onHoje: () => void;
  onFiltros: (filtros: Filtros) => void;
  professores: OpcaoDeProfessor[];
  turmas: OpcaoDeProfessor[];
  espacos: OpcaoDeProfessor[];
  onBusca: (busca: string) => void;
  onNova?: () => void;
  menuAberto: boolean;
  onMenu: () => void;
  tituloDaPagina: string;
  docencia: ParDeDocencia[];
}) {
  const calendario = estado.visao === "calendario";

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (!atalhoPermitido(evento)) return;

      const acoes: Record<string, () => void> = calendario
        ? {
            d: () => onEscala("dia"),
            s: () => onEscala("semana"),
            m: () => onEscala("mes"),
            h: onHoje,
            ArrowLeft: () => onNavegar(-1),
            ArrowRight: () => onNavegar(1),
          }
        : {};
      if (onNova) acoes.n = onNova;

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
      turmas={turmas}
      espacos={espacos}
      docencia={docencia}
      onAplicar={onFiltros}
    />
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        {calendario ? (
          <div className="flex min-w-0 items-center gap-1 sm:gap-2">
            <ComAtalho
              dica={
                menuAberto ? "Recolher menu lateral" : "Expandir menu lateral"
              }
            >
              <Button
                variant="ghost"
                size="icon"
                className="hidden md:inline-flex"
                aria-label="Menu lateral da agenda"
                aria-pressed={menuAberto}
                onClick={onMenu}
              >
                <PanelLeft />
              </Button>
            </ComAtalho>

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
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
            {tituloDaPagina}
          </h1>
        )}

        {onNova && (
          <ComAtalho dica="Nova reserva (N)">
            <Button onClick={onNova}>
              <Plus />
              Nova reserva
            </Button>
          </ComAtalho>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <BuscaDaAgenda busca={estado.busca} onBusca={onBusca} />

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          {filtros}

          {calendario && (
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
        </div>
      </div>
    </div>
  );
}
