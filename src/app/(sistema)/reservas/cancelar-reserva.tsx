"use client";

import { useState, useTransition } from "react";

import { cancelarReserva, type CancelamentoState } from "./cancelar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ESTADO_INICIAL: CancelamentoState = { status: "idle" };

export function CancelarReserva({
  bookingId,
  descricao,
  aberto,
  onAbertoChange,
}: {
  bookingId: string;
  /** Aparece na confirmação, para não cancelar a reserva errada. */
  descricao: string;
  aberto: boolean;
  onAbertoChange: (aberto: boolean) => void;
}) {

  const [state, setState] = useState(ESTADO_INICIAL);
  const [cancelando, startTransition] = useTransition();

  // Fecha sozinho ao concluir: a reserva pode continuar na tela, com o filtro
  // de canceladas ligado, e o diálogo não sumiria junto com ela.
  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);

    startTransition(async () => {
      const resultado = await cancelarReserva(state, dados);
      setState(resultado);
      if (resultado.status === "success") onAbertoChange(false);
    });
  }

  return (
    <Dialog open={aberto} onOpenChange={onAbertoChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancelar esta reserva?</DialogTitle>
          <DialogDescription>{descricao}</DialogDescription>
        </DialogHeader>

        <form onSubmit={enviar} className="space-y-4">
          <input type="hidden" name="bookingId" value={bookingId} />

          <div className="space-y-2">
            <Label htmlFor={`motivo-${bookingId}`}>Motivo</Label>
            <Input
              id={`motivo-${bookingId}`}
              name="reason"
              // Sem "required" nativo: a recusa vem do servidor, na mesma
              // mensagem e no mesmo lugar dos demais erros.
              placeholder="Professor afastado"
              maxLength={200}
            />
          </div>

          {state.status === "error" && (
            <p className="text-destructive text-sm" role="alert">
              {state.message}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onAbertoChange(false)}
            >
              Voltar
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={cancelando}
            >
              {cancelando ? "Cancelando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
