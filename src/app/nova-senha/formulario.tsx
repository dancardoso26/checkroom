"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { Check, CheckCircle2, Circle, X } from "lucide-react";

import {
  definirNovaSenha,
  type NovaSenhaState,
} from "../recuperar-senha/acoes";
import {
  TAMANHO_MAXIMO_DA_SENHA,
  avaliarSenha,
} from "@/domain/auth/senha";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { CampoDeSenha } from "@/components/campo-de-senha";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const ESTADO_INICIAL: NovaSenhaState = { status: "idle" };

export function FormularioDeNovaSenha({ convite }: { convite: boolean }) {
  const [state, formAction, salvando] = useActionState(
    definirNovaSenha,
    ESTADO_INICIAL
  );
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");

  const regras = avaliarSenha(senha);
  const senhaValida = regras.every((regra) => regra.cumprida);
  const confirmacaoPreenchida = confirmacao.length > 0;
  const senhasIguais = confirmacaoPreenchida && senha === confirmacao;

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
                  value={senha}
                  onChange={(evento) => setSenha(evento.target.value)}
                  autoComplete="new-password"
                  maxLength={TAMANHO_MAXIMO_DA_SENHA}
                  aria-describedby="regras-da-senha"
                  aria-invalid={senha.length > 0 && !senhaValida}
                  required
                />
                <div id="regras-da-senha">
                  <p className="text-muted-foreground text-xs">
                    A senha precisa ter:
                  </p>
                  <ul className="mt-1.5 space-y-1" aria-live="polite">
                    {regras.map((regra) => (
                      <li
                        key={regra.id}
                        className={cn(
                          "flex items-center gap-2 text-xs transition-colors",
                          regra.cumprida
                            ? "text-primary"
                            : "text-muted-foreground"
                        )}
                      >
                        {regra.cumprida ? (
                          <Check aria-hidden className="size-3.5 shrink-0" />
                        ) : (
                          <Circle aria-hidden className="size-3.5 shrink-0" />
                        )}
                        <span>
                          {regra.descricao}
                          <span className="sr-only">
                            {regra.cumprida ? ", cumprida" : ", pendente"}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmacao">
                  {convite ? "Confirme a senha" : "Repita a nova senha"}
                </Label>
                <CampoDeSenha
                  id="confirmacao"
                  name="confirmacao"
                  value={confirmacao}
                  onChange={(evento) => setConfirmacao(evento.target.value)}
                  autoComplete="new-password"
                  maxLength={TAMANHO_MAXIMO_DA_SENHA}
                  aria-describedby="situacao-da-confirmacao"
                  aria-invalid={confirmacaoPreenchida && !senhasIguais}
                  required
                />
                <p
                  id="situacao-da-confirmacao"
                  aria-live="polite"
                  className={cn(
                    "flex min-h-4 items-center gap-2 text-xs",
                    senhasIguais ? "text-primary" : "text-destructive"
                  )}
                >
                  {confirmacaoPreenchida &&
                    (senhasIguais ? (
                      <>
                        <Check aria-hidden className="size-3.5 shrink-0" />
                        As senhas coincidem
                      </>
                    ) : (
                      <>
                        <X aria-hidden className="size-3.5 shrink-0" />
                        As senhas não coincidem
                      </>
                    ))}
                </p>
              </div>

              {state.status === "error" && (
                <p className="text-destructive text-sm" role="alert">
                  {state.message}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={salvando || !senhaValida || !senhasIguais}
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
