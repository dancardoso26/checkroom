"use client";

import { cn } from "@/lib/utils";

/**
 * PEÇAS COMPARTILHADAS ENTRE AS ETAPAS
 *
 * Cabeçalho e aviso aparecem em mais de uma etapa. Ficam juntos aqui para que
 * título, descrição e os três tons de aviso tenham uma definição só, em vez de
 * variarem conforme quem escreveu a etapa.
 */

export function Cabecalho({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <div className="space-y-1">
      <h2 className="text-lg font-semibold">{titulo}</h2>
      <p className="text-muted-foreground text-sm">{descricao}</p>
    </div>
  );
}

export function Aviso({
  tom,
  titulo,
  children,
}: {
  tom: "ok" | "erro" | "neutro";
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div
      // aria-live faz o leitor de tela anunciar a mudança sem que o foco precise
      // sair do campo de horário que a provocou.
      aria-live="polite"
      className={cn(
        "rounded-lg border p-4 text-sm",
        tom === "ok" && "border-success/30 bg-success-subtle text-success",
        tom === "erro" &&
          "border-destructive/30 bg-destructive-subtle text-destructive",
        tom === "neutro" && "bg-muted text-muted-foreground"
      )}
    >
      <p className="font-medium">{titulo}</p>
      {children && <div className="mt-1">{children}</div>}
    </div>
  );
}
