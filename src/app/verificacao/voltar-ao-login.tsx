"use client";

import { startTransition } from "react";
import { ArrowLeft } from "lucide-react";

import { sair } from "@/app/login/acoes";

// Depois da senha a sessão já existe, só sem o segundo fator: /login mandaria
// de volta para cá. Sair encerra essa sessão e devolve ao login de verdade.
export function VoltarAoLogin() {
  return (
    <button
      type="button"
      onClick={() => startTransition(() => void sair())}
      className="text-muted-foreground hover:text-foreground mx-auto flex items-center gap-1.5 text-sm"
    >
      <ArrowLeft aria-hidden className="size-4" />
      Voltar ao login
    </button>
  );
}
