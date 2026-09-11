"use client";

import { startTransition, useActionState, useRef } from "react";

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
  const formulario = useRef<HTMLFormElement>(null);

  const [state, formAction, cancelando] = useActionState(
    cancelarReserva,
    ESTADO_INICIAL
  );

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    startTransition(() => formAction(dados));
  }

  return (
    <Dialog open={aberto} onOpenChange={onAbertoChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancelar esta reserva?</DialogTitle>
          <DialogDescription>{descricao}</DialogDescription>
        </DialogHeader>

        <form ref={formulario} onSubmit={enviar} className="space-y-4">
          <p className="text-muted-foreground text-sm">
            O horário fica livre, e o registro do cancelamento é preservado.
          </p>

          <input type="hidden" name="bookingId" value={bookingId} />

          <div className="space-y-2">
            <Label htmlFor={`motivo-${bookingId}`}>Motivo (opcional)</Label>
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

            {/* type fixo em "button" com requestSubmit: alternar o type durante
                o clique já produziu envio acidental neste projeto. */}
            <Button
              type="button"
              variant="destructive"
              disabled={cancelando}
              onClick={() => formulario.current?.requestSubmit()}
            >
              {cancelando ? "Cancelando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
