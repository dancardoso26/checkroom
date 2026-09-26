"use client";

import { mesmoMes, nomeCurtoDoDia, numeroDoDia } from "@/lib/calendario";
import { formatTime, localDayKey } from "@/lib/datetime";
import type { BookingListItem } from "@/lib/repositories/bookingRepository";
import { cn } from "@/lib/utils";

import { COR_DA_ATIVIDADE, COR_DA_CANCELADA } from "./estilo";

const VISIVEIS_POR_DIA = 3;

export function CalendarioMes({
  dias,
  referencia,
  hoje,
  reservas,
  destaque,
  onEscolherDia,
  onAbrirDia,
  onAbrirReserva,
}: {
  dias: string[];
  referencia: string;
  hoje: string;
  reservas: BookingListItem[];
  destaque?: string;
  onEscolherDia: (dia: string) => void;
  onAbrirDia: (dia: string) => void;
  onAbrirReserva: (id: string) => void;
}) {
  const porDia = new Map<string, BookingListItem[]>();

  for (const reserva of reservas) {
    const dia = localDayKey(reserva.startsAt);
    porDia.set(dia, [...(porDia.get(dia) ?? []), reserva]);
  }

  return (
    <div className="bg-card overflow-hidden rounded-lg border">
      <div className="grid grid-cols-7 border-b">
        {dias.slice(0, 7).map((dia) => (
          <p
            key={dia}
            className="text-muted-foreground border-l py-2 text-center text-xs uppercase first:border-l-0"
          >
            {nomeCurtoDoDia(dia)}
          </p>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {dias.map((dia) => {
          const doDia = porDia.get(dia) ?? [];
          const foraDoMes = !mesmoMes(dia, referencia);
          const passado = dia < hoje;

          return (
            <div
              key={dia}
              data-dia={dia}
              className={cn(
                "group relative min-h-28 border-t border-l p-1.5 [&:nth-child(7n+1)]:border-l-0",
                foraDoMes && "bg-muted/40"
              )}
            >
              {/* O fundo inteiro da célula abre uma reserva naquele dia; as
                  reservas e o número ficam por cima, com ações próprias. */}
              {!passado && (
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={`Reservar em ${dia}`}
                  onClick={() => onEscolherDia(dia)}
                  className="hover:bg-primary-subtle/40 absolute inset-0 cursor-pointer transition-colors"
                />
              )}

              <button
                type="button"
                onClick={() => onAbrirDia(dia)}
                aria-label={`Ver o dia ${dia}`}
                className={cn(
                  "relative flex size-7 items-center justify-center rounded-full text-sm font-medium hover:underline",
                  dia === hoje && "bg-primary text-primary-foreground",
                  foraDoMes && dia !== hoje && "text-muted-foreground"
                )}
              >
                {numeroDoDia(dia)}
              </button>

              <div className="relative mt-1 space-y-1">
                {doDia.slice(0, VISIVEIS_POR_DIA).map((reserva) => (
                  <button
                    key={reserva.id}
                    type="button"
                    data-reserva={reserva.id}
                    onClick={() => onAbrirReserva(reserva.id)}
                    className={cn(
                      "block w-full truncate rounded border border-l-4 px-1.5 py-0.5 text-left text-xs",
                      reserva.cancelled
                        ? COR_DA_CANCELADA
                        : COR_DA_ATIVIDADE[reserva.activityType],
                      destaque === reserva.id && "ring-primary ring-2"
                    )}
                  >
                    <span className="font-semibold">
                      {formatTime(reserva.startsAt)}
                    </span>{" "}
                    {reserva.purpose}
                  </button>
                ))}

                {doDia.length > VISIVEIS_POR_DIA && (
                  <button
                    type="button"
                    onClick={() => onAbrirDia(dia)}
                    className="text-muted-foreground hover:text-foreground relative text-xs font-medium"
                  >
                    +{doDia.length - VISIVEIS_POR_DIA} mais
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
