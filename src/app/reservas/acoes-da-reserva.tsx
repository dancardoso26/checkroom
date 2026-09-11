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

export function AcoesDaReserva({
  bookingId,
  descricao,
  cancelada,
}: {
  bookingId: string;
  descricao: string;
  cancelada: boolean;
}) {
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
