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
  reservaId,
  descricao,
  cancelada,
}: {
  reservaId: string;
  descricao: string;
  cancelada: boolean;
}) {
  const [confirmacao, setConfirmacao] = useState<
    "nenhuma" | "cancelar" | "excluir"
  >("nenhuma");

  const dialogos = (
    <>
      <CancelarReserva
        reservaId={reservaId}
        descricao={descricao}
        aberto={confirmacao === "cancelar"}
        onAbertoChange={(aberto) =>
          setConfirmacao(aberto ? "cancelar" : "nenhuma")
        }
      />

      <ExcluirReserva
        reservaId={reservaId}
        descricao={descricao}
        cancelada={cancelada}
        aberto={confirmacao === "excluir"}
        onAbertoChange={(aberto) =>
          setConfirmacao(aberto ? "excluir" : "nenhuma")
        }
      />
    </>
  );

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

      {dialogos}
    </div>
  );
}
