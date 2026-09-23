"use client";

import { startTransition, useActionState, useRef } from "react";

import { verificarCodigo, type VerificacaoState } from "./acoes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ESTADO_INICIAL: VerificacaoState = { status: "idle" };

export function FormularioDeCodigo({
  factorId,
  primeiroUso = false,
}: {
  factorId: string;
  primeiroUso?: boolean;
}) {
  const formulario = useRef<HTMLFormElement>(null);
  const [state, formAction, verificando] = useActionState(
    verificarCodigo,
    ESTADO_INICIAL
  );

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    startTransition(() => formAction(dados));
  }

  return (
    <form ref={formulario} onSubmit={enviar} className="space-y-4">
      <input type="hidden" name="factorId" value={factorId} />
      <input type="hidden" name="primeiroUso" value={primeiroUso ? "1" : "0"} />

      <div className="space-y-2">
        <Label htmlFor="codigo">Código de seis dígitos</Label>
        <Input
          id="codigo"
          name="codigo"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="000000"
          className="text-center text-lg tracking-[0.5em]"
          autoFocus
          required
        />
      </div>

      {state.status === "error" && (
        <p className="text-destructive text-sm" role="alert">
          {state.message}
        </p>
      )}

      <Button
        type="button"
        className="w-full"
        disabled={verificando}
        onClick={() => formulario.current?.requestSubmit()}
      >
        {verificando ? "Verificando..." : "Verificar"}
      </Button>
    </form>
  );
}
