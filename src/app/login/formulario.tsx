"use client";

import Link from "next/link";
import { startTransition, useActionState, useRef } from "react";

import { entrar, type LoginState } from "./acoes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ESTADO_INICIAL: LoginState = { status: "idle" };

export function FormularioDeLogin({ proximo }: { proximo?: string }) {
  const formulario = useRef<HTMLFormElement>(null);
  const [state, formAction, entrando] = useActionState(entrar, ESTADO_INICIAL);

  // Envio manual em vez de <form action>: o action do React 19 limpa o
  // formulário ao responder, e o e-mail digitado se perderia a cada erro.
  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    startTransition(() => formAction(dados));
  }

  return (
    <form ref={formulario} onSubmit={enviar} className="space-y-4">
      <input type="hidden" name="proximo" value={proximo ?? ""} />

      <div className="space-y-2">
        <Label htmlFor="email">E-mail institucional</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="senha">Senha</Label>
          <Link
            href="/recuperar-senha"
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            Esqueci minha senha
          </Link>
        </div>
        <Input
          id="senha"
          name="senha"
          type="password"
          autoComplete="current-password"
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
        disabled={entrando}
        onClick={() => formulario.current?.requestSubmit()}
      >
        {entrando ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
