"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";

import { excluirConta, type ExclusaoDeContaState } from "./acoes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ESTADO_INICIAL: ExclusaoDeContaState = { status: "idle" };
const CONFIRMACAO = "CANCELAR";

export function ExcluirConta() {
  const [aberto, setAberto] = useState(false);
  const [digitado, setDigitado] = useState("");
  const [state, formAction, removendo] = useActionState(
    excluirConta,
    ESTADO_INICIAL
  );

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button variant="destructive">Cancelar conta</Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancelar sua conta?</DialogTitle>
          <DialogDescription>
            Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>

        <form
          id="formularioDeCancelamento"
          onSubmit={(evento) => {
            evento.preventDefault();
            if (digitado === CONFIRMACAO && !removendo) {
              startTransition(() => formAction());
            }
          }}
          className="space-y-4"
        >
          <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
            <li>Seu nome é substituído em todo o sistema</li>
            <li>Suas reservas futuras são canceladas</li>
            <li>Seu acesso é encerrado imediatamente</li>
            <li>
              Reservas passadas e registros de auditoria permanecem, sem vínculo
              com você. Detalhes na{" "}
              <Link
                href="/privacidade"
                target="_blank"
                className="hover:text-foreground underline underline-offset-2"
              >
                política de privacidade
              </Link>
            </li>
          </ul>

          <div className="space-y-2">
            <Label htmlFor="confirmacao">
              Digite {CONFIRMACAO} para confirmar
            </Label>
            <Input
              id="confirmacao"
              value={digitado}
              onChange={(evento) => setDigitado(evento.target.value)}
              autoComplete="off"
            />
          </div>

          {state.status === "error" && (
            <p className="text-destructive text-sm" role="alert">
              {state.message}
            </p>
          )}
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setAberto(false)}
          >
            Voltar
          </Button>

          <Button
            type="submit"
            form="formularioDeCancelamento"
            variant="destructive"
            disabled={digitado !== CONFIRMACAO || removendo}
          >
            {removendo ? "Cancelando..." : "Cancelar conta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
