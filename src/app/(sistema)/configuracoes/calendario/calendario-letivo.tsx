"use client";

import type { Bloqueio, PeriodoLetivo } from "@/domain/calendario/calendario";

import { SecaoDeBloqueios } from "./secao-de-bloqueios";
import { SecaoDePeriodos } from "./secao-de-periodos";

export function CalendarioLetivo({
  periodos,
  bloqueios,
  espacos,
}: {
  periodos: PeriodoLetivo[];
  bloqueios: Bloqueio[];
  espacos: { id: string; nome: string }[];
}) {
  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
        Calendário letivo
      </h1>

      <SecaoDePeriodos periodos={periodos} />
      <SecaoDeBloqueios bloqueios={bloqueios} espacos={espacos} />
    </div>
  );
}
