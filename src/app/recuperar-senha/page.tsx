"use client";

import Link from "next/link";
import { startTransition, useActionState } from "react";
import { MailCheck } from "lucide-react";

import { pedirRecuperacao, type EstadoDaRecuperacao } from "./acoes";
import { TelaDeEntrada } from "@/components/tela-de-entrada";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ESTADO_INICIAL: EstadoDaRecuperacao = { status: "inicial" };

export default function RecuperarSenhaPage() {
  const [estado, acaoDoFormulario, enviando] = useActionState(
    pedirRecuperacao,
    ESTADO_INICIAL,
  );

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    startTransition(() => acaoDoFormulario(dados));
  }

  return (
    <TelaDeEntrada
      titulo="Recuperar a senha"
      descricao="Informe seu e-mail e enviaremos um link para criar uma nova senha."
    >
      <div>
        {estado.status === "enviado" ? (
          <div className="space-y-3 text-center">
            <MailCheck aria-hidden className="text-primary mx-auto size-8" />
            <p className="text-sm font-medium">
              Verifique sua caixa de entrada
            </p>
            <p className="text-muted-foreground text-sm">
              Se houver uma conta com esse endereço, o link chegará em alguns
              instantes. Ele vale por uma hora e serve uma única vez.
            </p>
          </div>
        ) : (
          <form onSubmit={enviar} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
            </div>

            {estado.status === "erro" && (
              <p className="text-destructive text-sm" role="alert">
                {estado.message}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={enviando}>
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
    </TelaDeEntrada>
  );
}
