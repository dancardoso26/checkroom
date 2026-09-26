"use client";

import { useRef } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { RoomOption } from "@/lib/repositories/roomRepository";
import type { ResourceOption } from "@/lib/repositories/resourceRepository";
import type { RoomVerdict } from "./analise";

type RoomPickerProps = {
  rooms: RoomOption[];
  resources: ResourceOption[];
  verdicts: RoomVerdict[];
  selectedRoomId: string;
  onSelect: (roomId: string) => void;
};

export function RoomPicker({
  rooms,
  resources,
  verdicts,
  selectedRoomId,
  onSelect,
}: RoomPickerProps) {
  const nomeDoRecurso = new Map(resources.map((r) => [r.id, r.name]));

  // A ordem da lista vem da análise, que já colocou os compatíveis na frente e
  // sugere o espaço mais justo primeiro. Reordenar aqui desfaria esse trabalho.
  const analisados = verdicts
    .map((verdict) => ({
      verdict,
      room: rooms.find((r) => r.id === verdict.roomId),
    }))
    .filter((item): item is { verdict: RoomVerdict; room: RoomOption } =>
      Boolean(item.room)
    );

  // Só os disponíveis são oferecidos. Os descartados voltam a aparecer apenas
  // quando não sobra nenhum, para o usuário entender por que e o que mudar.
  const itens = analisados.filter((i) => i.verdict.compatible);
  const descartados = analisados.filter((i) => !i.verdict.compatible);

  /** Um radiogroup move o foco junto com a seleção, não só o valor. */
  const cartoes = useRef<(HTMLDivElement | null)[]>([]);

  const indiceFocalizavel = (() => {
    const selecionado = itens.findIndex(
      (i) => i.room.id === selectedRoomId && i.verdict.compatible
    );
    if (selecionado >= 0) return selecionado;

    return itens.findIndex((i) => i.verdict.compatible);
  })();

  function navegar(deIndice: number, direcao: 1 | -1) {
    const total = itens.length;
    if (total === 0) return;

    for (let passo = 1; passo <= total; passo++) {
      const alvo = (deIndice + direcao * passo + total * passo) % total;

      if (itens[alvo].verdict.compatible) {
        onSelect(itens[alvo].room.id);
        cartoes.current[alvo]?.focus();
        return;
      }
    }
  }

  return (
    <div className="space-y-4">
      {itens.length > 0 ? (
        <p className="text-muted-foreground text-sm">
          {itens.length === 1
            ? "1 espaço disponível"
            : `${itens.length} espaços disponíveis`}
        </p>
      ) : (
        <div className="space-y-1">
          <p className="font-medium">Nenhum espaço disponível</p>
          <p className="text-muted-foreground text-sm">
            {descartados.length === 0
              ? "Nenhum espaço cadastrado."
              : "Nenhum espaço atende a esta atividade. Volte aos detalhes e ajuste a turma, o horário ou os itens."}
          </p>
        </div>
      )}

      <div
        role="radiogroup"
        aria-label="Espaços disponíveis"
        className="space-y-3"
      >
        {itens.map(({ room, verdict }, indice) => (
          <CartaoEspaco
            key={room.id}
            ref={(elemento) => {
              cartoes.current[indice] = elemento;
            }}
            room={room}
            verdict={verdict}
            // O primeiro da lista é o mais justo em capacidade, pela
            // ordenação feita em evaluateRooms.
            recomendado={indice === 0}
            selecionado={selectedRoomId === room.id}
            // Roving tabindex: sem ele, alcançar o décimo espaço exigiria dez
            // toques em Tab.
            focalizavel={indice === indiceFocalizavel}
            onSelect={() => onSelect(room.id)}
            onNavegar={(direcao) => navegar(indice, direcao)}
            nomeDoRecurso={nomeDoRecurso}
          />
        ))}
      </div>

      {itens.length === 0 && descartados.length > 0 && (
        <div className="space-y-3" aria-label="Espaços descartados">
          {descartados.map(({ room, verdict }) => (
            <CartaoEspaco
              key={room.id}
              ref={() => undefined}
              room={room}
              verdict={verdict}
              recomendado={false}
              selecionado={false}
              focalizavel={false}
              onSelect={() => undefined}
              onNavegar={() => undefined}
              nomeDoRecurso={nomeDoRecurso}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CartaoEspaco({
  ref,
  room,
  verdict,
  recomendado,
  selecionado,
  focalizavel,
  onSelect,
  onNavegar,
  nomeDoRecurso,
}: {
  ref: (elemento: HTMLDivElement | null) => void;
  room: RoomOption;
  verdict: RoomVerdict;
  recomendado: boolean;
  selecionado: boolean;
  focalizavel: boolean;
  onSelect: () => void;
  onNavegar: (direcao: 1 | -1) => void;
  nomeDoRecurso: Map<string, string>;
}) {
  const disponivel = verdict.compatible;

  return (
    <div
      ref={ref}
      role="radio"
      aria-checked={selecionado}
      aria-disabled={!disponivel}
      // Apenas um cartão entra na ordem de tabulação, e os incompatíveis nunca.
      tabIndex={disponivel && focalizavel ? 0 : -1}
      onClick={disponivel ? onSelect : undefined}
      onKeyDown={(evento) => {
        if (!disponivel) return;

        // As quatro setas, como manda o padrão ARIA. Em um grupo empilhado as
        // verticais são as usadas, mas as horizontais fazem parte do contrato.
        if (evento.key === "ArrowDown" || evento.key === "ArrowRight") {
          evento.preventDefault();
          onNavegar(1);
          return;
        }

        if (evento.key === "ArrowUp" || evento.key === "ArrowLeft") {
          evento.preventDefault();
          onNavegar(-1);
          return;
        }

        // Sem isto, quem navega por teclado chega ao cartão mas não o escolhe.
        if (evento.key === " " || evento.key === "Enter") {
          evento.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "rounded-lg border p-4 transition-colors",
        disponivel
          ? "bg-card hover:border-primary/40 cursor-pointer"
          : "border-destructive/25 bg-destructive-subtle/40 cursor-not-allowed",
        selecionado && "border-primary ring-primary/25 ring-2"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{room.name}</p>
            {recomendado && (
              // Sinaliza o espaço de capacidade mais próxima da turma, o que
              // evita ocupar o auditório com uma aula de 38 alunos.
              <Badge className="bg-success-subtle text-success border-success/30 border">
                Recomendado
              </Badge>
            )}
          </div>

          <p className="text-muted-foreground text-sm">
            {room.building} · {room.capacity} lugares
          </p>

          <div className="flex flex-wrap gap-1.5">
            {room.resourceIds.map((id) => (
              <Badge key={id} variant="secondary">
                {nomeDoRecurso.get(id) ?? id}
              </Badge>
            ))}
            {room.resourceIds.length === 0 && (
              <span className="text-muted-foreground text-xs">
                Sem recursos cadastrados
              </span>
            )}
          </div>
        </div>

        <Badge
          variant="outline"
          className={cn(
            "whitespace-nowrap",
            disponivel
              ? "border-success/30 bg-success-subtle text-success"
              : "border-destructive/30 text-destructive"
          )}
        >
          {disponivel ? "Disponível" : "Incompatível"}
        </Badge>
      </div>

      {verdict.motivos.length > 0 && (
        <ul className="text-destructive mt-3 space-y-1 text-sm">
          {verdict.motivos.map((motivo) => (
            <li key={motivo}>{motivo}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
