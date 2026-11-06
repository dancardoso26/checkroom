"use client";

import { RotuloDeCampo } from "@/components/rotulo-de-campo";
import { useState, useTransition } from "react";
import { toast } from "sonner";

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
import type { TurmaOpcao } from "@/lib/repositories/repositorio-de-turmas";
import type { UsuarioItem } from "@/lib/repositories/repositorio-de-usuarios";

import { alterarPapel } from "./acoes";
import { CursoETurmaDoAluno } from "./curso-e-turma-do-aluno";

export function EditarPapel({
  usuario,
  turmas,
  onFechar,
}: {
  usuario: UsuarioItem;
  turmas: TurmaOpcao[];
  onFechar: () => void;
}) {
  const [papel, setPapel] = useState<Papel>(usuario.papel);
  const [turmaId, setTurmaId] = useState(usuario.turmaId ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, startTransition] = useTransition();

  function salvar() {
    setErro(null);
    startTransition(async () => {
      const resultado = await alterarPapel(usuario.id, papel, turmaId || null);
      if (resultado.ok) {
        toast.success("Usuário atualizado.");
        onFechar();
      } else setErro(resultado.mensagem);
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
          <Label htmlFor="papelDoUsuario">
            <RotuloDeCampo rotulo="Perfil" />
          </Label>
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

        {papel === "student" && (
          <CursoETurmaDoAluno
            idBase="usuario"
            turmas={turmas}
            turmaId={turmaId}
            onChange={setTurmaId}
          />
        )}

        {usuario.papel === "professor" && papel !== "professor" && (
          <p className="text-muted-foreground text-sm">
            O vínculo de professor é desfeito: a conta deixa de reservar em nome do
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
            disabled={
              salvando ||
              (papel === usuario.papel &&
                (papel !== "student" || turmaId === (usuario.turmaId ?? "")))
            }
            onClick={salvar}
          >
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
