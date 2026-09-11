"use client";

import { startTransition, useActionState, useRef } from "react";

import { excluirReserva, type ExclusaoState } from "./excluir";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ESTADO_INICIAL: ExclusaoState = { status: "idle" };

export function ExcluirReserva({
  bookingId,
  descricao,
  aberto,
  onAbertoChange,
  cancelada,
}: {
  bookingId: string;
  descricao: string;
  aberto: boolean;
  onAbertoChange: (aberto: boolean) => void;
  /** Quando já cancelada, não faz sentido sugerir cancelar. */
  cancelada: boolean;
}) {
  const formulario = useRef<HTMLFormElement>(null);

  const [state, formAction, excluindo] = useActionState(
    excluirReserva,
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
          <DialogTitle>Excluir permanentemente?</DialogTitle>
          <DialogDescription>{descricao}</DialogDescription>
        </DialogHeader>

        <form ref={formulario} onSubmit={enviar} className="space-y-4">
          <p className="text-muted-foreground text-sm">
            A reserva será apagada do sistema e não poderá ser recuperada.
            {!cancelada &&
              " Se a atividade apenas não vai acontecer, cancele: o registro fica preservado."}
          </p>

          <input type="hidden" name="bookingId" value={bookingId} />

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
              type="button"
              variant="destructive"
              disabled={excluindo}
              onClick={() => formulario.current?.requestSubmit()}
            >
              {excluindo ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
