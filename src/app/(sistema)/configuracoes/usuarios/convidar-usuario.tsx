"use client";

import { RotuloDeCampo } from "@/components/rotulo-de-campo";
import { useState, useTransition } from "react";
import { UserPlus } from "lucide-react";
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
import { Input } from "@/components/ui/input";
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

import { convidarUsuario } from "./acoes";
import { CursoETurmaDoAluno } from "./curso-e-turma-do-aluno";
import {
  VinculosDoProfessor,
  type LinhaDeVinculo,
  type OpcoesDeDocencia,
} from "./vinculos-do-professor";

const VAZIO = {
  nome: "",
  email: "",
  papel: "professor" as Papel,
  turmaId: "",
};

export function ConvidarUsuario({
  docencia,
  turmas,
}: {
  docencia: OpcoesDeDocencia;
  turmas: TurmaOpcao[];
}) {
  const [aberto, setAberto] = useState(false);
  const [dados, setDados] = useState(VAZIO);
  const [linhas, setLinhas] = useState<LinhaDeVinculo[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, startTransition] = useTransition();

  function alternar(abrir: boolean) {
    if (abrir) {
      setDados(VAZIO);
      setLinhas([]);
      setErro(null);
    }
    setAberto(abrir);
  }

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);

    const incompleta = linhas.some((l) => !l.disciplinaId || !l.turmaId);
    if (dados.papel === "professor" && incompleta) {
      setErro(
        "Complete a disciplina e a turma de cada vínculo ou remova a linha."
      );
      return;
    }

    startTransition(async () => {
      const resultado = await convidarUsuario({
        nome: dados.nome,
        email: dados.email,
        papel: dados.papel,
        turmaId: dados.turmaId || null,
        vinculos: linhas.map((l) => ({
          disciplinaId: l.disciplinaId,
          turmaId: l.turmaId,
        })),
      });

      if (resultado.ok) {
        toast.success(`Convite enviado para ${dados.email}`, {
          description: "O link vale por 24 horas.",
        });
        setAberto(false);
      } else setErro(resultado.mensagem);
    });
  }

  return (
    <>
      <Button onClick={() => alternar(true)}>
        <UserPlus />
        Convidar usuário
      </Button>

      <Dialog open={aberto} onOpenChange={alternar}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Convidar usuário</DialogTitle>
            <DialogDescription>
              O usuário recebe um e-mail para criar a senha.
            </DialogDescription>
          </DialogHeader>

            <form onSubmit={enviar} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="conviteNome">
                  <RotuloDeCampo rotulo="Nome" />
                </Label>
                <Input
                  id="conviteNome"
                  value={dados.nome}
                  onChange={(e) => setDados({ ...dados, nome: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="conviteEmail">
                  <RotuloDeCampo rotulo="E-mail" />
                </Label>
                <Input
                  id="conviteEmail"
                  type="email"
                  value={dados.email}
                  onChange={(e) =>
                    setDados({ ...dados, email: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="convitePapel">
                  <RotuloDeCampo rotulo="Perfil" />
                </Label>
                <Select
                  value={dados.papel}
                  onValueChange={(v) =>
                    setDados({ ...dados, papel: v as Papel })
                  }
                >
                  <SelectTrigger id="convitePapel" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAPEIS_ATRIBUIVEIS.map((papel) => (
                      <SelectItem key={papel} value={papel}>
                        {ROTULO_DO_PAPEL[papel]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {dados.papel === "professor" && (
                <VinculosDoProfessor
                  linhas={linhas}
                  onChange={setLinhas}
                  opcoes={docencia}
                />
              )}

              {dados.papel === "student" && (
                <CursoETurmaDoAluno
                  idBase="convite"
                  turmas={turmas}
                  turmaId={dados.turmaId}
                  onChange={(v) => setDados({ ...dados, turmaId: v })}
                />
              )}

              {erro && (
                <p className="text-destructive text-sm" role="alert">
                  {erro}
                </p>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => alternar(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={enviando}>
                  {enviando ? "Enviando..." : "Enviar convite"}
                </Button>
              </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
