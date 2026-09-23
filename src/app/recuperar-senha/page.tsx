"use client";

import Link from "next/link";
import { startTransition, useActionState, useRef } from "react";
import { MailCheck } from "lucide-react";

import { pedirRecuperacao, type RecuperacaoState } from "./acoes";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ESTADO_INICIAL: RecuperacaoState = { status: "idle" };

export default function RecuperarSenhaPage() {
  const formulario = useRef<HTMLFormElement>(null);
  const [state, formAction, enviando] = useActionState(
    pedirRecuperacao,
    ESTADO_INICIAL
  );

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    startTransition(() => formAction(dados));
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo altura={32} />
          <p className="text-muted-foreground text-sm">
            Informe seu e-mail e enviaremos um link para criar uma nova senha.
          </p>
        </div>

        <div className="bg-card rounded-lg border p-6">
          {state.status === "enviado" ? (
            <div className="space-y-3 text-center">
              <MailCheck aria-hidden className="text-primary mx-auto size-8" />
              <p className="text-sm font-medium">Verifique sua caixa de entrada</p>
              <p className="text-muted-foreground text-sm">
                Se houver uma conta com esse endereço, o link chegará em alguns
                instantes. Ele vale por uma hora e serve uma única vez.
              </p>
            </div>
          ) : (
            <form ref={formulario} onSubmit={enviar} className="space-y-4">
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

              {state.status === "error" && (
                <p className="text-destructive text-sm" role="alert">
                  {state.message}
                </p>
              )}

              <Button
                type="button"
                className="w-full"
                disabled={enviando}
                onClick={() => formulario.current?.requestSubmit()}
              >
                {enviando ? "Enviando..." : "Enviar link"}
              </Button>
            </form>
          )}
        </div>

        <p className="text-center text-sm">
          <Link
            href="/login"
            className="text-muted-foreground hover:text-foreground"
          >
            Voltar para o login
          </Link>
        </p>
      </div>
    </main>
  );
}
