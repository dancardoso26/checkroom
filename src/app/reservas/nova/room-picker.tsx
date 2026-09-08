"use client";

import { useRef } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { RoomOption } from "@/lib/repositories/roomRepository";
import type { ResourceOption } from "@/lib/repositories/resourceRepository";
import type { RoomVerdict } from "./analise";

/**
 * ESCOLHA DO ESPAÇO
 *
 * A tela onde a regra de negócio fica visível.
 *
 * Em vez de um seletor onde o professor escolhe e descobre o erro depois, a
 * lista mostra todos os espaços já julgados: os que servem em cima, e os que
 * não servem com o motivo escrito. Trocar uma recusa por uma explicação é a
 * diferença entre o sistema dizer "você errou" e dizer "isto aqui resolve".
 *
 * O julgamento não acontece neste arquivo. Ele chega pronto da Server Action de
 * análise, que roda a mesma validateBooking usada no envio. É o que garante que
 * a lista e a recusa final nunca discordem.
 */

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
  const itens = verdicts
    .map((verdict) => ({
      verdict,
      room: rooms.find((r) => r.id === verdict.roomId),
    }))
    .filter((item): item is { verdict: RoomVerdict; room: RoomOption } =>
      Boolean(item.room)
    );

  const compativeis = itens.filter((i) => i.verdict.compatible).length;

  /**
   * Os elementos dos cartões, para que a navegação por teclado consiga mover o
   * foco. Um radiogroup move o foco junto com a seleção, e sem as referências
   * só daria para mudar o valor, deixando o foco parado no cartão anterior.
   */
  const cartoes = useRef<(HTMLDivElement | null)[]>([]);

  /**
   * Qual cartão participa da ordem de tabulação.
   *
   * É o selecionado. Sem seleção, o primeiro que pode ser escolhido. Sem nenhum
   * compatível, nenhum: uma lista em que nada pode ser escolhido não deve
   * capturar o Tab.
   */
  const indiceFocalizavel = (() => {
    const selecionado = itens.findIndex(
      (i) => i.room.id === selectedRoomId && i.verdict.compatible
    );
    if (selecionado >= 0) return selecionado;

    return itens.findIndex((i) => i.verdict.compatible);
  })();

  /**
   * Move a seleção para o próximo espaço disponível, pulando os incompatíveis.
   *
   * Pular os incompatíveis é o mesmo motivo pelo qual eles têm tabIndex -1:
   * parar em uma opção que não pode ser escolhida transforma a navegação em
   * obstáculo. A busca dá a volta na lista, comportamento esperado de um
   * radiogroup.
   */
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
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          {itens.length}{" "}
          {itens.length === 1 ? "espaço analisado" : "espaços analisados"} com os
          dados da atividade.
        </p>

        <Badge
          variant="outline"
          className={cn(
            compativeis > 0
              ? "border-success/30 bg-success-subtle text-success"
              : "border-destructive/30 bg-destructive-subtle text-destructive"
          )}
        >
          {compativeis === 0
            ? "Nenhum compatível"
            : `${compativeis} ${compativeis === 1 ? "compatível" : "compatíveis"}`}
        </Badge>
      </div>

      {/* radiogroup, e não uma lista de divs clicáveis. É o que faz o leitor de
          tela anunciar "opção 3 de 12" em vez de ler doze blocos soltos.
          
          O papel ARIA sozinho não traz comportamento nenhum: quem implementa a
          navegação por setas e o roving tabindex é o código abaixo. Uma versão
          anterior deste arquivo declarava o papel e prometia as setas em um
          comentário sem tê-las implementado, o que é pior do que não usar o
          papel, porque um leitor de tela anuncia um controle que não responde
          como deveria. */}
      <div role="radiogroup" aria-label="Espaços disponíveis" className="space-y-3">
        {itens.map(({ room, verdict }, indice) => (
          <CartaoEspaco
            key={room.id}
            ref={(elemento) => {
              cartoes.current[indice] = elemento;
            }}
            room={room}
            verdict={verdict}
            recomendado={
              // O primeiro compatível da lista é o mais justo em capacidade,
              // pela ordenação feita em evaluateRooms.
              verdict.compatible && itens.find((i) => i.verdict.compatible)?.room.id === room.id
            }
            selecionado={selectedRoomId === room.id}
            // Roving tabindex: só um cartão participa da ordem de tabulação, e
            // as setas movem entre eles. Sem isso, alcançar o décimo espaço
            // exigiria dez toques em Tab, e sair da lista exigiria mais doze.
            focalizavel={indice === indiceFocalizavel}
            onSelect={() => onSelect(room.id)}
            onNavegar={(direcao) => navegar(indice, direcao)}
            nomeDoRecurso={nomeDoRecurso}
          />
        ))}
      </div>

      {itens.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Nenhum espaço cadastrado.
        </p>
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
      // Roving tabindex. Apenas um cartão do grupo entra na ordem de tabulação,
      // e os incompatíveis nunca entram: parar em uma opção que não pode ser
      // escolhida transforma a navegação em obstáculo.
      tabIndex={disponivel && focalizavel ? 0 : -1}
      onClick={disponivel ? onSelect : undefined}
      onKeyDown={(evento) => {
        if (!disponivel) return;

        // As quatro setas movem entre as opções, como manda o padrão ARIA para
        // radiogroup. Para baixo e para a direita avançam; para cima e para a
        // esquerda voltam. Em um grupo empilhado as verticais são as usadas na
        // prática, mas as horizontais fazem parte do contrato do papel.
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

        // Espaço e Enter ativam a opção, que é o comportamento esperado de um
        // controle de formulário. Sem isso, quem navega por teclado consegue
        // chegar ao cartão mas não consegue escolhê-lo.
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
              // "Recomendado" não é enfeite: sinaliza o espaço de capacidade
              // mais próxima da turma, que é o que evita ocupar o auditório com
              // uma aula de 38 alunos.
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
