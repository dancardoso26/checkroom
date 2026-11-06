"use client";

import type { AnaliseResult } from "./analise";
import { Aviso } from "./aviso";

export function ResultadoDaAgenda({
  analise,
  analisando,
  ehPalestra,
  espacosDisponiveis,
}: {
  espacosDisponiveis: number | null;
  analise: AnaliseResult | null;
  analisando: boolean;
  ehPalestra: boolean;
}) {
  if (analisando || analise === null) {
    return (
      <p className="text-muted-foreground text-sm">Verificando agendas...</p>
    );
  }

  if (analise.status === "invalid") {
    return <p className="text-muted-foreground text-sm">{analise.message}</p>;
  }

  if (espacosDisponiveis === 0) {
    return (
      <Aviso tom="erro" titulo="Nenhum espaço disponível">
        Nenhum espaço atende à data, ao horário e aos recursos escolhidos.
        Mude o horário ou tire algum recurso.
      </Aviso>
    );
  }

  if (analise.scheduleMessages.length === 0) {
    return ehPalestra ? (
      <Aviso
        tom="ok"
        titulo={
          espacosDisponiveis === 1
            ? "1 espaço disponível"
            : `${espacosDisponiveis ?? 0} espaços disponíveis`
        }
      >
        Para a data, o horário e os recursos escolhidos.
      </Aviso>
    ) : (
      <Aviso tom="ok" titulo="Horário disponível">
        Professor e turma estão livres neste horário.
      </Aviso>
    );
  }

  return (
    <Aviso tom="erro" titulo="Conflito de agenda">
      <ul className="list-disc space-y-1 pl-4">
        {analise.scheduleMessages.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
    </Aviso>
  );
}
