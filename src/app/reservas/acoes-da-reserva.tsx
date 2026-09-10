"use client";

import { useState } from "react";
import { MoreVertical, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { CancelarReserva } from "./cancelar-reserva";
import { ExcluirReserva } from "./excluir-reserva";

/**
 * O menu de ações de uma reserva.
 *
 * Cancelar e excluir ficam juntos aqui, e não como dois botões no cartão, por
 * duas razões. A primeira é espaço: a agenda tem muitos cartões, e dois botões
 * destrutivos em cada um competem com a informação. A segunda é hierarquia: são
 * ações ocasionais, e deixá-las a um clique de distância reduz o acidente.
 *
 * Uma reserva já cancelada não oferece cancelar de novo. Excluir aparece sempre,
 * porque tanto o engano recém-criado quanto o registro antigo podem precisar
 * sair do sistema.
 */
export function AcoesDaReserva({
  bookingId,
  descricao,
  cancelada,
}: {
  bookingId: string;
  descricao: string;
  cancelada: boolean;
}) {
  /**
   * Qual confirmação está aberta.
   *
   * Um estado só, e não um por popover, porque as duas nunca aparecem juntas: o
   * menu fecha ao escolher, e abrir uma precisa fechar a outra.
   */
  const [confirmacao, setConfirmacao] = useState<
    "nenhuma" | "cancelar" | "excluir"
  >("nenhuma");

  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground"
            aria-label={`Ações da reserva ${descricao}`}
          >
            <MoreVertical />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          {!cancelada && (
            <DropdownMenuItem onSelect={() => setConfirmacao("cancelar")}>
              <X />
              Cancelar
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setConfirmacao("excluir")}
          >
            <Trash2 />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CancelarReserva
        bookingId={bookingId}
        descricao={descricao}
        aberto={confirmacao === "cancelar"}
        onAbertoChange={(aberto) => setConfirmacao(aberto ? "cancelar" : "nenhuma")}
      />

      <ExcluirReserva
        bookingId={bookingId}
        descricao={descricao}
        cancelada={cancelada}
        aberto={confirmacao === "excluir"}
        onAbertoChange={(aberto) => setConfirmacao(aberto ? "excluir" : "nenhuma")}
      />
    </div>
  );
}
