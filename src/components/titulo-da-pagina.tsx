"use client";

import { usePathname } from "next/navigation";

// Ordem importa: o primeiro prefixo que casa vence, então o mais específico
// vem antes.
const TITULOS: [string, string[]][] = [
  ["/configuracoes/usuarios", ["Configurações", "Usuários"]],
  ["/configuracoes", ["Configurações"]],
  ["/reservas", ["Reservas"]],
  ["/auditoria", ["Trilha de auditoria"]],
  ["/conta", ["Minha conta"]],
];

export function TituloDaPagina() {
  const caminho = usePathname();
  const partes = TITULOS.find(([prefixo]) => caminho.startsWith(prefixo))?.[1];

  if (!partes) return null;

  return (
    <nav
      aria-label="Você está em"
      className="flex items-center gap-1.5 text-sm"
    >
      {partes.map((parte, i) => (
        <span key={parte} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-muted-foreground">/</span>}
          <span
            className={
              i === partes.length - 1 ? "font-medium" : "text-muted-foreground"
            }
          >
            {parte}
          </span>
        </span>
      ))}
    </nav>
  );
}
