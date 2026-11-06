"use client";

import { RotuloDeCampo } from "@/components/rotulo-de-campo";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { cancelarReserva, type CancelamentoState } from "../acoes/cancelar";
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
  descricao: string;
  aberto: boolean;
  onAbertoChange: (aberto: boolean) => void;
}) {

  const [state, setState] = useState(ESTADO_INICIAL);
  const [cancelando, startTransition] = useTransition();

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);

    startTransition(async () => {
      const resultado = await cancelarReserva(state, dados);
      setState(resultado);
      if (resultado.status === "success") {
        toast.success("Reserva cancelada.");
        onAbertoChange(false);
      }
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
            <Label htmlFor={`motivo-${bookingId}`}><RotuloDeCampo rotulo="Motivo" /></Label>
            <Input
              id={`motivo-${bookingId}`}
              name="reason"
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
