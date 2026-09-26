"use client";

import { useState, useTransition } from "react";
import { UserPlus } from "lucide-react";

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
import type { DocenteSemConta } from "@/lib/repositories/userRepository";

import { convidarUsuario } from "./acoes";

// O Select do Radix não aceita valor vazio num item.
const SEM_VINCULO = "sem-vinculo";

const VAZIO = {
  nome: "",
  email: "",
  papel: "professor" as Papel,
  professorId: SEM_VINCULO,
};

export function ConvidarUsuario({ docentes }: { docentes: DocenteSemConta[] }) {
  const [aberto, setAberto] = useState(false);
  const [dados, setDados] = useState(VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState<string | null>(null);
  const [enviando, startTransition] = useTransition();

  function alternar(abrir: boolean) {
    if (abrir) {
      setDados(VAZIO);
      setErro(null);
      setEnviado(null);
    }
    setAberto(abrir);
  }

  function escolherDocente(id: string) {
    const docente = docentes.find((d) => d.id === id);
    // O nome do docente já está cadastrado; preenche para evitar grafias diferentes.
    setDados((atuais) => ({
      ...atuais,
      professorId: id,
      nome: docente && !atuais.nome ? docente.nome : atuais.nome,
    }));
  }

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);

    startTransition(async () => {
      const resultado = await convidarUsuario({
        nome: dados.nome,
        email: dados.email,
        papel: dados.papel,
        professorId:
          dados.professorId === SEM_VINCULO ? null : dados.professorId,
      });

      if (resultado.ok) setEnviado(dados.email);
      else setErro(resultado.mensagem);
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
              A pessoa recebe um e-mail para criar a senha. No primeiro acesso,
              cadastra o segundo fator e aceita os termos de uso.
            </DialogDescription>
          </DialogHeader>

          {enviado ? (
            <div className="space-y-4">
              <p className="text-sm">
                Convite enviado para <strong>{enviado}</strong>. O link vale por
                24 horas.
              </p>
              <DialogFooter>
                <Button onClick={() => alternar(false)}>Fechar</Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={enviar} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="convitePapel">Perfil</Label>
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
                <div className="space-y-2">
                  <Label htmlFor="conviteDocente">Docente vinculado</Label>
                  <Select
                    value={dados.professorId}
                    onValueChange={escolherDocente}
                  >
                    <SelectTrigger id="conviteDocente" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SEM_VINCULO}>Sem vínculo</SelectItem>
                      {docentes.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-muted-foreground text-xs">
                    Sem vínculo, o professor entra mas não consegue reservar.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="conviteNome">Nome completo</Label>
                <Input
                  id="conviteNome"
                  value={dados.nome}
                  onChange={(e) => setDados({ ...dados, nome: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="conviteEmail">E-mail</Label>
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
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
