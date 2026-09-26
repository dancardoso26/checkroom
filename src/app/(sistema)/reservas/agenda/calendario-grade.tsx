"use client";

import { useEffect, useRef, useState } from "react";

import {
  ABERTURA_EM_MINUTOS,
  FECHAMENTO_EM_MINUTOS,
} from "@/domain/booking/businessHours";
import {
  horaParaMinutos,
  minutosParaHora,
} from "@/domain/booking/businessHours";
import {
  faixasDoExpediente,
  intervaloArrastado,
  nomeCurtoDoDia,
  numeroDoDia,
  posicionarNoDia,
} from "@/lib/calendario";
import {
  combineDateTime,
  formatTimeRange,
  localDayKey,
  localMinutesOfDay,
} from "@/lib/datetime";
import type { BookingListItem } from "@/lib/repositories/bookingRepository";
import { cn } from "@/lib/utils";

import { COR_DA_ATIVIDADE, COR_DA_CANCELADA } from "./estilo";

const PX_POR_HORA = 56;
const PX_POR_MINUTO = PX_POR_HORA / 60;
const ALTURA_TOTAL =
  ((FECHAMENTO_EM_MINUTOS - ABERTURA_EM_MINUTOS) / 60) * PX_POR_HORA;

const HORAS = Array.from(
  { length: (FECHAMENTO_EM_MINUTOS - ABERTURA_EM_MINUTOS) / 60 },
  (_, i) => ABERTURA_EM_MINUTOS / 60 + i
);

/** A reserva sendo montada no painel, desenhada na grade enquanto ele está aberto. */
export type Rascunho = {
  dia: string;
  inicio: string;
  fim: string;
  titulo: string;
};

// Duração do clique simples, como no Google Agenda; o arraste define outra.
const DURACAO_DO_CLIQUE = 60;

export function CalendarioGrade({
  dias,
  hoje,
  agora: agoraInicial,
  reservas,
  destaque,
  rascunho,
  onEscolherHorario,
  onAbrirReserva,
}: {
  dias: string[];
  hoje: string;
  agora: Date;
  reservas: BookingListItem[];
  destaque?: string;
  rascunho?: Rascunho | null;
  onEscolherHorario: (dia: string, inicio: string, fim?: string) => void;
  onAbrirReserva: (id: string) => void;
}) {
  // O instante vem do servidor e é atualizado aqui: a linha do agora anda e
  // as faixas que viram passado deixam de aceitar reserva.
  const [agora, setAgora] = useState(agoraInicial);

  useEffect(() => {
    const relogio = setInterval(() => setAgora(new Date()), 30_000);
    return () => clearInterval(relogio);
  }, []);

  const rolagem = useRef<HTMLDivElement>(null);

  // Abre já perto da primeira reserva do período, em vez de no começo do dia:
  // numa faculdade noturna, as 7h costumam estar vazias.
  useEffect(() => {
    const minutos = reservas
      .filter((r) => dias.includes(localDayKey(r.startsAt)))
      .map((r) => localMinutesOfDay(r.startsAt));
    const alvo = minutos.length > 0 ? Math.min(...minutos) - 30 : 18 * 60;

    rolagem.current?.scrollTo({
      top: Math.max(0, (alvo - ABERTURA_EM_MINUTOS) * PX_POR_MINUTO),
    });
  }, [dias, reservas]);

  const minutoAtual = localMinutesOfDay(agora);
  const agoraNoExpediente =
    minutoAtual >= ABERTURA_EM_MINUTOS && minutoAtual <= FECHAMENTO_EM_MINUTOS;

  return (
    <div className="bg-card overflow-hidden rounded-lg border">
      {/* Cabeçalho e corpo no mesmo contêiner de rolagem: a barra de rolagem
          estreita os dois igualmente, e as colunas continuam alinhadas. */}
      <div
        ref={rolagem}
        className="h-[calc(100svh-8rem)] min-h-96 overflow-y-auto"
      >
        <div
          className="bg-card sticky top-0 z-30 grid border-b"
          style={{
            gridTemplateColumns: `3.5rem repeat(${dias.length}, minmax(0, 1fr))`,
          }}
        >
          <div />
          {dias.map((dia) => (
            <div
              key={dia}
              className="border-l px-2 py-2 text-center"
              aria-current={dia === hoje ? "date" : undefined}
            >
              <p className="text-muted-foreground text-xs uppercase">
                {nomeCurtoDoDia(dia)}
              </p>
              <p
                className={cn(
                  "mx-auto mt-0.5 flex size-8 items-center justify-center rounded-full text-lg font-semibold",
                  dia === hoje && "bg-primary text-primary-foreground"
                )}
              >
                {numeroDoDia(dia)}
              </p>
            </div>
          ))}
        </div>

        <div
          className="relative grid"
          style={{
            gridTemplateColumns: `3.5rem repeat(${dias.length}, minmax(0, 1fr))`,
            height: ALTURA_TOTAL,
          }}
        >
          <div className="relative">
            {HORAS.map((hora, i) => (
              <span
                key={hora}
                className="text-muted-foreground absolute right-2 -translate-y-1/2 text-xs"
                style={{ top: i * PX_POR_HORA }}
              >
                {i === 0 ? "" : `${String(hora).padStart(2, "0")}:00`}
              </span>
            ))}
          </div>

          {dias.map((dia) => (
            <ColunaDoDia
              key={dia}
              dia={dia}
              agora={agora}
              reservas={reservas}
              destaque={destaque}
              mostrarAgora={dia === hoje && agoraNoExpediente}
              minutoAtual={minutoAtual}
              rascunho={rascunho?.dia === dia ? rascunho : null}
              onEscolherHorario={onEscolherHorario}
              onAbrirReserva={onAbrirReserva}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ColunaDoDia({
  dia,
  agora,
  reservas,
  destaque,
  mostrarAgora,
  minutoAtual,
  rascunho,
  onEscolherHorario,
  onAbrirReserva,
}: {
  dia: string;
  agora: Date;
  reservas: BookingListItem[];
  destaque?: string;
  mostrarAgora: boolean;
  minutoAtual: number;
  rascunho: Rascunho | null;
  onEscolherHorario: (dia: string, inicio: string, fim?: string) => void;
  onAbrirReserva: (id: string) => void;
}) {
  const [pairando, setPairando] = useState<number | null>(null);
  const posicoes = posicionarNoDia(reservas, dia);
  const [arraste, setArraste] = useState<{ de: number; ate: number } | null>(
    null
  );
  const previa = arraste && intervaloArrastado(arraste.de, arraste.ate);

  function minutoDoPonteiro(evento: React.PointerEvent<HTMLDivElement>) {
    const topo = evento.currentTarget.getBoundingClientRect().top;
    return ABERTURA_EM_MINUTOS + (evento.clientY - topo) / PX_POR_MINUTO;
  }

  const noPassado = (hora: string) => combineDateTime(dia, hora) < agora;

  function aoPressionar(evento: React.PointerEvent<HTMLDivElement>) {
    if (evento.button !== 0) return;
    if ((evento.target as HTMLElement).closest("[data-reserva]")) return;

    const minuto = minutoDoPonteiro(evento);
    if (noPassado(minutosParaHora(Math.floor(minuto / 15) * 15))) return;

    // A captura mantém os eventos nesta coluna mesmo se o ponteiro sair dela.
    evento.currentTarget.setPointerCapture(evento.pointerId);
    setArraste({ de: minuto, ate: minuto });
  }

  function aoSoltar() {
    if (!arraste) return;
    setArraste(null);

    // Um clique, sem arraste de verdade, cria uma hora a partir da meia hora
    // clicada, sem passar do fechamento.
    if (Math.abs(arraste.ate - arraste.de) < 10) {
      const inicio = Math.floor(arraste.de / 30) * 30;
      const fim = Math.min(inicio + DURACAO_DO_CLIQUE, FECHAMENTO_EM_MINUTOS);
      onEscolherHorario(dia, minutosParaHora(inicio), minutosParaHora(fim));
      return;
    }

    const { inicio, fim } = intervaloArrastado(arraste.de, arraste.ate);
    if (!noPassado(inicio)) onEscolherHorario(dia, inicio, fim);
  }

  return (
    <div
      className="relative border-l select-none"
      data-dia={dia}
      onPointerDown={aoPressionar}
      onPointerMove={(evento) => {
        const minuto = minutoDoPonteiro(evento);
        if (arraste) setArraste({ ...arraste, ate: minuto });
        else setPairando(Math.floor(minuto / 30) * 30);
      }}
      onPointerLeave={() => setPairando(null)}
      onPointerUp={aoSoltar}
      // O navegador cancela quando o toque vira rolagem: nada é criado.
      onPointerCancel={() => setArraste(null)}
    >
      {HORAS.map((_, i) => (
        <div
          key={i}
          className="border-border/70 absolute inset-x-0 border-t"
          style={{ top: i * PX_POR_HORA }}
        />
      ))}

      {/* Faixas só visuais: o clique e o arraste são tratados pela coluna. Quem
          usa teclado reserva pelo botão "Nova reserva" ou pela tecla N. */}
      {faixasDoExpediente().map((inicio, i) => {
        const passado = noPassado(inicio);

        return (
          <div
            key={inicio}
            aria-hidden
            data-faixa={inicio}
            className={cn(
              "absolute inset-x-0 transition-colors",
              passado ? "bg-muted/30 cursor-default" : "cursor-pointer"
            )}
            style={{ top: i * (PX_POR_HORA / 2), height: PX_POR_HORA / 2 }}
          />
        );
      })}

      {/* Mostra a hora que um clique criaria, e não só a meia hora sob o cursor. */}
      {pairando !== null &&
        !arraste &&
        !noPassado(minutosParaHora(pairando)) && (
          <div
            aria-hidden
            className="bg-primary-subtle/60 pointer-events-none absolute inset-x-0"
            style={{
              top: (pairando - ABERTURA_EM_MINUTOS) * PX_POR_MINUTO,
              height:
                (Math.min(pairando + DURACAO_DO_CLIQUE, FECHAMENTO_EM_MINUTOS) -
                  pairando) *
                PX_POR_MINUTO,
            }}
          />
        )}

      {previa && <BlocoProvisorio {...previa} />}

      {rascunho && !previa && (
        <BlocoProvisorio
          inicio={rascunho.inicio}
          fim={rascunho.fim}
          titulo={rascunho.titulo}
          rascunho
        />
      )}

      {mostrarAgora && (
        <div
          aria-hidden
          className="bg-destructive pointer-events-none absolute inset-x-0 z-20 h-0.5"
          style={{ top: (minutoAtual - ABERTURA_EM_MINUTOS) * PX_POR_MINUTO }}
        >
          <span className="bg-destructive absolute -top-1 -left-1 size-2.5 rounded-full" />
        </div>
      )}

      {posicoes.map(({ item, topo, altura, coluna, colunas }) => (
        <button
          key={item.id}
          type="button"
          data-reserva={item.id}
          onClick={() => onAbrirReserva(item.id)}
          className={cn(
            "absolute z-10 overflow-hidden rounded-md border border-l-4 px-1.5 py-1 text-left text-xs shadow-sm transition-shadow hover:shadow-md",
            item.cancelled
              ? COR_DA_CANCELADA
              : COR_DA_ATIVIDADE[item.activityType],
            destaque === item.id && "ring-primary ring-2 ring-offset-1"
          )}
          style={{
            top: topo * PX_POR_MINUTO + 1,
            height: altura * PX_POR_MINUTO - 2,
            left: `calc(${(coluna / colunas) * 100}% + 2px)`,
            width: `calc(${100 / colunas}% - 4px)`,
          }}
        >
          <p className="truncate font-semibold">{item.purpose}</p>
          <p className="truncate">
            {formatTimeRange(item.startsAt, item.endsAt)}
          </p>
          {altura >= 60 && (
            <p className="text-muted-foreground truncate">
              {item.building} · {item.roomName}
            </p>
          )}
        </button>
      ))}
    </div>
  );
}

function BlocoProvisorio({
  inicio,
  fim,
  titulo,
  rascunho = false,
}: {
  inicio: string;
  fim: string;
  titulo?: string;
  rascunho?: boolean;
}) {
  return (
    <div
      aria-hidden
      data-rascunho={rascunho || undefined}
      className="bg-primary/85 text-primary-foreground pointer-events-none absolute inset-x-0.5 z-20 overflow-hidden rounded-md px-1.5 py-1 text-xs shadow-md"
      style={{
        top: (horaParaMinutos(inicio) - ABERTURA_EM_MINUTOS) * PX_POR_MINUTO,
        height:
          (horaParaMinutos(fim) - horaParaMinutos(inicio)) * PX_POR_MINUTO,
      }}
    >
      {titulo !== undefined && (
        <p className="truncate font-semibold">{titulo || "(Sem título)"}</p>
      )}
      <p className="truncate">
        {inicio} às {fim}
      </p>
    </div>
  );
}
