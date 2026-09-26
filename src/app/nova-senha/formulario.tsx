"use client";

import Link from "next/link";
import { startTransition, useActionState } from "react";
import { CheckCircle2 } from "lucide-react";

import {
  definirNovaSenha,
  type NovaSenhaState,
} from "../recuperar-senha/acoes";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { CampoDeSenha } from "@/components/campo-de-senha";
import { Label } from "@/components/ui/label";

const ESTADO_INICIAL: NovaSenhaState = { status: "idle" };

// Serve a dois caminhos: recuperar a senha e criar a primeira, pelo convite.
// Muda só o texto; o que acontece no servidor é o mesmo.
export function FormularioDeNovaSenha({ convite }: { convite: boolean }) {
  const [state, formAction, salvando] = useActionState(
    definirNovaSenha,
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
            {convite
              ? "Bem-vindo ao CheckRoom. Crie a senha da sua conta."
              : "Escolha uma nova senha para sua conta."}
          </p>
        </div>

        <div className="bg-card rounded-lg border p-6">
          {state.status === "success" ? (
            <div className="space-y-4 text-center">
              <CheckCircle2
                aria-hidden
                className="text-primary mx-auto size-8"
              />
              <p className="text-sm font-medium">
                {convite ? "Senha criada" : "Senha alterada"}
              </p>
              <p className="text-muted-foreground text-sm">
                {convite
                  ? "Entre com seu e-mail e a senha criada. No primeiro acesso, você cadastra o aplicativo autenticador e aceita os termos de uso."
                  : "Entre novamente com a nova senha. O segundo fator continua sendo pedido."}
              </p>
              <Button asChild className="w-full">
                <Link href="/login">Ir para o login</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={enviar} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="senha">
                  {convite ? "Senha" : "Nova senha"}
                </Label>
                <CampoDeSenha
                  id="senha"
                  name="senha"

                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <p className="text-muted-foreground text-xs">
                  Ao menos oito caracteres.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmacao">
                  {convite ? "Confirme a senha" : "Repita a nova senha"}
                </Label>
                <CampoDeSenha
                  id="confirmacao"
                  name="confirmacao"

                  autoComplete="new-password"
                  required
                />
              </div>

              {state.status === "error" && (
                <p className="text-destructive text-sm" role="alert">
                  {state.message}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={salvando}
              >
                {salvando
                  ? "Salvando..."
                  : convite
                    ? "Criar senha"
                    : "Salvar nova senha"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
