"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { startTransition, useActionState, useEffect } from "react";

import { entrar, type EstadoDoLogin } from "./acoes";
import { Button } from "@/components/ui/button";
import { CampoDeSenha } from "@/components/campo-de-senha";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ESTADO_INICIAL: EstadoDoLogin = { status: "inicial" };

export function FormularioDeLogin({ proximo }: { proximo?: string }) {
  const [estado, acaoDoFormulario, entrando] = useActionState(
    entrar,
    ESTADO_INICIAL,
  );
  const aguardando = entrando || estado.status === "sucesso";

  useEffect(() => {
    if (estado.status !== "sucesso") return;

    window.location.assign(estado.destino);
  }, [estado]);

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    startTransition(() => acaoDoFormulario(dados));
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <input type="hidden" name="proximo" value={proximo ?? ""} />

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
        <CampoDeSenha
          id="senha"
          name="senha"
          autoComplete="current-password"
          required
        />
      </div>

      {estado.status === "erro" && (
        <p className="text-destructive text-sm" role="alert">
          {estado.message}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={aguardando}>
        {aguardando && <Loader2 className="animate-spin" aria-hidden />}
        {aguardando ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
