"use client";

import { RoomPicker } from "../room-picker";
import type { AnaliseResult } from "../analise";
import type { RoomOption } from "@/lib/repositories/roomRepository";
import type { ResourceOption } from "@/lib/repositories/resourceRepository";
import { Aviso, Cabecalho } from "./ui";

export function EtapaEspaco({
  rooms,
  resources,
  analise,
  analisando,
  selecionado,
  onSelect,
}: {
  rooms: RoomOption[];
  resources: ResourceOption[];
  analise: AnaliseResult | null;
  analisando: boolean;
  selecionado: string;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      <Cabecalho
        titulo="Em qual espaço?"
        descricao="Cada espaço foi comparado com a capacidade e os recursos exigidos pela atividade."
      />

      {analisando && (
        <p className="text-muted-foreground text-sm">Analisando espaços...</p>
      )}

      {!analisando && analise?.status === "ok" && (
        <>
          {analise.scheduleMessages.length > 0 && (
            // O conflito de agenda aparece aqui uma vez só, e não repetido em
            // cada cartão: ele vale para todos os espaços, e trocar de sala não
            // resolve. O que resolve é voltar e trocar o horário.
            <Aviso tom="erro" titulo="Nenhum espaço resolve este conflito">
              <ul className="list-disc space-y-1 pl-4">
                {analise.scheduleMessages.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </Aviso>
          )}

          <RoomPicker
            rooms={rooms}
            resources={resources}
            verdicts={analise.rooms}
            selectedRoomId={selecionado}
            onSelect={onSelect}
          />
        </>
      )}

      {!analisando && analise?.status === "invalid" && (
        <Aviso tom="neutro" titulo="Dados incompletos">
          {analise.message}
        </Aviso>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Etapa 5
// ---------------------------------------------------------------------------
