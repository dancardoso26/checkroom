"use client";

import { cn } from "@/lib/utils";

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
