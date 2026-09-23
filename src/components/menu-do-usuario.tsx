"use client";

import { startTransition } from "react";
import { ChevronDown, LogOut, ScrollText, User, UserCog } from "lucide-react";

import { sair } from "@/app/login/acoes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ROTULO_DO_PAPEL: Record<string, string> = {
  student: "Aluno",
  professor: "Professor",
  it_support: "Equipe de TI",
  admin: "Administração",
};

export function MenuDoUsuario({
  nome,
  papel,
  mostrarAuditoria,
}: {
  nome: string;
  papel: string;
  mostrarAuditoria: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <User aria-hidden className="size-4" />
          <span className="max-w-40 truncate">{nome}</span>
          <ChevronDown aria-hidden className="size-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium">{nome}</p>
          <p className="text-muted-foreground text-xs">
            {ROTULO_DO_PAPEL[papel] ?? papel}
          </p>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <a href="/conta">
            <UserCog aria-hidden className="size-4" />
            Minha conta
          </a>
        </DropdownMenuItem>

        {mostrarAuditoria && (
          <DropdownMenuItem asChild>
            <a href="/auditoria">
              <ScrollText aria-hidden className="size-4" />
              Trilha de auditoria
            </a>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem
          variant="destructive"
          onSelect={() => startTransition(() => void sair())}
        >
          <LogOut aria-hidden className="size-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
