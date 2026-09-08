"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { TimeSelect } from "../time-select";
import type { AnaliseResult } from "../analise";
import { ULTIMO_INICIO } from "@/domain/booking/businessHours";
import { ehPeriodoValido } from "./campos";
import { Aviso, Cabecalho } from "./ui";

export function EtapaHorario({
  campos,
  alterar,
  hoje,
  analise,
  analisando,
}: {
  campos: { date: string; startTime: string; endTime: string };
  alterar: (campo: "date" | "startTime" | "endTime", valor: string) => void;
  hoje: string;
  analise: AnaliseResult | null;
  analisando: boolean;
}) {
  const completo = ehPeriodoValido(campos);

  return (
    <>
      <Cabecalho
        titulo="Quando será a atividade?"
        descricao="O horário é conferido contra as agendas do professor e da turma."
      />

      <div className="grid gap-5 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="dateField">Data</Label>
          <Input
            id="dateField"
            type="date"
            min={hoje}
            value={campos.date}
            onChange={(e) => alterar("date", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="startField">Início</Label>
          <TimeSelect
            id="startField"
            value={campos.startTime}
            onChange={(v) => alterar("startTime", v)}
            // O último início possível é um passo antes do fechamento. Oferecer
            // 22:00 aqui levaria a um estado sem saída: o término precisa ser
            // posterior, e não existe horário posterior ao fechamento.
            maximo={ULTIMO_INICIO}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="endField">Término</Label>
          <TimeSelect
            id="endField"
            value={campos.endTime}
            onChange={(v) => alterar("endTime", v)}
            // O término só oferece horários posteriores ao início. Sem isto, a
            // opção de errar continuaria na tela para ser recusada depois.
            minimo={campos.startTime || undefined}
          />
        </div>
      </div>

      {campos.startTime !== "" && campos.endTime !== "" && !completo && (
        <Aviso tom="erro" titulo="Horário inválido">
          O término precisa ser posterior ao início.
        </Aviso>
      )}

      {completo && <ResultadoDaAgenda analise={analise} analisando={analisando} />}
    </>
  );
}

export function ResultadoDaAgenda({
  analise,
  analisando,
}: {
  analise: AnaliseResult | null;
  analisando: boolean;
}) {
  if (analisando || analise === null) {
    return <Aviso tom="neutro" titulo="Verificando agendas...">{null}</Aviso>;
  }

  if (analise.status === "invalid") {
    return (
      <Aviso tom="neutro" titulo="Dados incompletos">
        {analise.message}
      </Aviso>
    );
  }

  if (analise.scheduleMessages.length === 0) {
    return (
      <Aviso tom="ok" titulo="Horário disponível">
        Nem o professor nem a turma têm outra atividade neste período.
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

// ---------------------------------------------------------------------------
// Etapa 3
// ---------------------------------------------------------------------------
