"use client";

import { useState, useTransition } from "react";
import {
  MoreVertical,
  Pencil,
  Power,
  PowerOff,
  Send,
  Trash2,
} from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROTULO_DO_PAPEL } from "@/domain/auth/permissoes";
import { formatDateTime } from "@/lib/datetime";
import type { UsuarioItem } from "@/lib/repositories/userRepository";

import {
  alterarAtivo,
  reenviarConviteDoUsuario,
  removerUsuario,
  type ResultadoDaAcao,
} from "./acoes";
import { EditarPapel } from "./editar-papel";

type Linha = UsuarioItem & { alteravel: boolean };

export function TabelaDeUsuarios({ usuarios }: { usuarios: Linha[] }) {
  const [aRemover, setARemover] = useState<Linha | null>(null);
  const [aEditar, setAEditar] = useState<Linha | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

  function executar(
    acao: () => Promise<ResultadoDaAcao>,
    aoConcluir?: () => void
  ) {
    setErro(null);
    setAviso(null);
    startTransition(async () => {
      const resultado = await acao();
      if (resultado.ok) aoConcluir?.();
      else setErro(resultado.mensagem);
    });
  }

  return (
    <>
      {aviso && (
        <p className="text-success text-sm" role="status">
          {aviso}
        </p>
      )}

      {erro && !aRemover && (
        <p className="text-destructive text-sm" role="alert">
          {erro}
        </p>
      )}

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead>Último acesso</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10">
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {usuarios.map((usuario) => (
              <TableRow key={usuario.id} data-usuario={usuario.email}>
                <TableCell className="font-medium">
                  <span className="flex items-center gap-2">
                    {usuario.nome}
                    {usuario.ehMaster && (
                      <Badge
                        variant="outline"
                        title="Dono do sistema: não pode ser removido, desativado nem mudar de perfil"
                        className="border-primary/30 bg-primary-subtle text-primary"
                      >
                        Master
                      </Badge>
                    )}
                  </span>
                </TableCell>
                <TableCell>{usuario.email}</TableCell>
                <TableCell>
                  {ROTULO_DO_PAPEL[usuario.papel] ?? usuario.papel}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatDateTime(usuario.criadoEm)}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {usuario.ultimoAcessoEm
                    ? formatDateTime(usuario.ultimoAcessoEm)
                    : "Nunca acessou"}
                </TableCell>
                <TableCell>
                  <StatusBadge
                    status={
                      !usuario.ativo
                        ? "inativo"
                        : usuario.convitePendente
                          ? "convidado"
                          : "ativo"
                    }
                  />
                </TableCell>
                <TableCell>
                  {usuario.alteravel && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground"
                          aria-label={`Ações do usuário ${usuario.email}`}
                          disabled={pendente}
                        >
                          <MoreVertical />
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setAEditar(usuario)}>
                          <Pencil />
                          Editar
                        </DropdownMenuItem>
                        {usuario.convitePendente && (
                          <DropdownMenuItem
                            onSelect={() =>
                              executar(
                                () => reenviarConviteDoUsuario(usuario.id),
                                () =>
                                  setAviso(
                                    `Convite reenviado para ${usuario.email}.`
                                  )
                              )
                            }
                          >
                            <Send />
                            Reenviar convite
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onSelect={() =>
                            executar(() =>
                              alterarAtivo(usuario.id, !usuario.ativo)
                            )
                          }
                        >
                          {usuario.ativo ? <PowerOff /> : <Power />}
                          {usuario.ativo ? "Desativar" : "Reativar"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => {
                            setErro(null);
                            setARemover(usuario);
                          }}
                        >
                          <Trash2 />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {aEditar && (
        <EditarPapel
          key={aEditar.id}
          usuario={aEditar}
          onFechar={() => setAEditar(null)}
        />
      )}

      <Dialog
        open={aRemover !== null}
        onOpenChange={(aberto) => !aberto && setARemover(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir usuário?</DialogTitle>
            <DialogDescription>{aRemover?.email}</DialogDescription>
          </DialogHeader>

          <p className="text-muted-foreground text-sm">
            O nome é substituído em todo o sistema, as reservas futuras são
            canceladas e o login é bloqueado. As reservas passadas e a auditoria
            permanecem, sem identificar a pessoa. Não há como desfazer.
          </p>

          {erro && (
            <p className="text-destructive text-sm" role="alert">
              {erro}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setARemover(null)}
            >
              Voltar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pendente}
              onClick={() =>
                aRemover &&
                executar(
                  () => removerUsuario(aRemover.id),
                  () => setARemover(null)
                )
              }
            >
              {pendente ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
