"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PAPEIS_ATRIBUIVEIS,
  ROTULO_DO_PAPEL,
  type Papel,
} from "@/domain/auth/permissoes";
import type { UsuarioItem } from "@/lib/repositories/userRepository";

import { alterarPapel } from "./acoes";

export function EditarPapel({
  usuario,
  onFechar,
}: {
  usuario: UsuarioItem;
  onFechar: () => void;
}) {
  const [papel, setPapel] = useState<Papel>(usuario.papel);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, startTransition] = useTransition();

  function salvar() {
    setErro(null);
    startTransition(async () => {
      const resultado = await alterarPapel(usuario.id, papel);
      if (resultado.ok) onFechar();
      else setErro(resultado.mensagem);
    });
  }

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar usuário</DialogTitle>
          <DialogDescription>
            {usuario.nome}, {usuario.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="papelDoUsuario">Perfil</Label>
          <Select value={papel} onValueChange={(v) => setPapel(v as Papel)}>
            <SelectTrigger id="papelDoUsuario" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAPEIS_ATRIBUIVEIS.map((opcao) => (
                <SelectItem key={opcao} value={opcao}>
                  {ROTULO_DO_PAPEL[opcao]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {usuario.papel === "professor" && papel !== "professor" && (
          <p className="text-muted-foreground text-sm">
            O vínculo docente é desfeito: a conta deixa de reservar em nome do
            professor.
          </p>
        )}

        {erro && (
          <p className="text-destructive text-sm" role="alert">
            {erro}
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onFechar}>
            Voltar
          </Button>
          <Button
            type="button"
            disabled={salvando || papel === usuario.papel}
            onClick={salvar}
          >
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
