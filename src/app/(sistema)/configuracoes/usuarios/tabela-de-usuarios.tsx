"use client";

import { toast } from "sonner";
import { useState, useTransition } from "react";
import {
  MoreVertical,
  Pencil,
  Power,
  PowerOff,
  Send,
  Trash2,
} from "lucide-react";

import {
  BarraDeSelecao,
  CabecalhoDaSelecao,
  CabecalhoDoCadastro,
  CelulaDaSelecao,
  LinhaVazia,
} from "@/components/cadastro";
import { FiltroMultiplo, passaNoFiltro } from "@/components/filtro-multiplo";
import { ConfirmarExclusao } from "@/components/formulario";
import { RodapeDaTabela } from "@/components/paginacao";
import { executarEmLote, usePaginacao, useSelecao } from "@/hooks/use-tabela";
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
import type { TurmaOpcao } from "@/lib/repositories/repositorio-de-turmas";
import type {
  UsuarioItem,
} from "@/lib/repositories/repositorio-de-usuarios";
import { usePesquisa } from "@/hooks/use-pesquisa";
import { CabecalhoOrdenavel } from "@/components/cabecalho-ordenavel";
import { useOrdenacao } from "@/hooks/use-ordenacao";

import {
  alterarAtivo,
  reenviarConviteDoUsuario,
  removerUsuario,
  type ResultadoDaAcao,
} from "./acoes";
import { ConvidarUsuario } from "./convidar-usuario";
import { EditarPapel } from "./editar-papel";
import type { OpcoesDeDocencia } from "./vinculos-do-professor";

type Linha = UsuarioItem & { alteravel: boolean };

const OPCOES_DE_PERFIL = (
  Object.keys(ROTULO_DO_PAPEL) as (keyof typeof ROTULO_DO_PAPEL)[]
).map((papel) => ({ id: papel, nome: ROTULO_DO_PAPEL[papel] }));

const OPCOES_DE_STATUS = [
  { id: "ativo", nome: "Ativo" },
  { id: "convidado", nome: "Convidado" },
  { id: "inativo", nome: "Inativo" },
];

function chaveDoStatus(usuario: Linha): string {
  if (!usuario.ativo) return "inativo";
  return usuario.convitePendente ? "convidado" : "ativo";
}

function rotuloDoStatus(usuario: Linha): string {
  if (!usuario.ativo) return "Inativo";
  return usuario.convitePendente ? "Convidado" : "Ativo";
}

export function TabelaDeUsuarios({
  usuarios,
  turmas,
  docencia,
  meuId,
}: {
  meuId: string;
  usuarios: Linha[];
  turmas: TurmaOpcao[];
  docencia: OpcoesDeDocencia;
}) {
  const [aRemover, setARemover] = useState<Linha | null>(null);
  const [aEditar, setAEditar] = useState<Linha | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

  function executar(
    acao: () => Promise<ResultadoDaAcao>,
    aoConcluir?: () => void,
  ) {
    setErro(null);
    startTransition(async () => {
      const resultado = await acao();
      if (resultado.ok) aoConcluir?.();
      else setErro(resultado.mensagem);
    });
  }

  const [perfis, setPerfis] = useState<string[]>([]);
  const [situacoes, setSituacoes] = useState<string[]>([]);

  const doFiltro = usuarios.filter(
    (u) =>
      passaNoFiltro(perfis, u.papel) &&
      passaNoFiltro(situacoes, chaveDoStatus(u)),
  );

  const { filtrados, pesquisa } = usePesquisa(
    doFiltro,
    (usuario) => [
      usuario.nome,
      usuario.email,
      ROTULO_DO_PAPEL[usuario.papel] ?? usuario.papel,
      usuario.cursoNome,
      usuario.turmaNome,
      rotuloDoStatus(usuario),
    ],
    "Pesquisar usuários",
  );

  const { ordenados, controle } = useOrdenacao(filtrados, {
    nome: (u) => u.nome,
    email: (u) => u.email,
    perfil: (u) => ROTULO_DO_PAPEL[u.papel] ?? u.papel,
    criadoEm: (u) => u.criadoEm,
    ultimoAcesso: (u) => u.ultimoAcessoEm,
    status: (u) => rotuloDoStatus(u),
  });
  const { visiveis, rodape } = usePaginacao(ordenados);
  const alteraveis = usuarios.filter((u) => u.alteravel);
  const selecao = useSelecao(
    alteraveis.map((u) => u.id),
    visiveis.filter((u) => u.alteravel).map((u) => u.id),
  );
  const marcados = alteraveis.filter((u) => selecao.estaMarcado(u.id));
  const aDesativar = marcados.filter((u) => u.ativo);
  const aReativar = marcados.filter((u) => !u.ativo);
  const [removendoEmLote, setRemovendoEmLote] = useState(false);

  function alterarEmLote(alvos: Linha[], ativo: boolean) {
    executar(
      () =>
        executarEmLote(
          alvos,
          (u) => alterarAtivo(u.id, ativo),
          (u) => u.nome,
        ),
      () => {
        selecao.limpar();
        toast.success(
          `${alvos.length} ${alvos.length === 1 ? "usuário" : "usuários"} ${ativo ? "reativado(s)" : "desativado(s)"}.`,
        );
      },
    );
  }

  return (
    <>
      <CabecalhoDoCadastro
        titulo="Usuários"
        pesquisa={pesquisa}
        filtros={
          <>
            <FiltroMultiplo
              rotulo="Perfil"
              opcoes={OPCOES_DE_PERFIL}
              valor={perfis}
              onChange={setPerfis}
            />
            <FiltroMultiplo
              rotulo="Status"
              opcoes={OPCOES_DE_STATUS}
              valor={situacoes}
              onChange={setSituacoes}
            />
          </>
        }
        acao={<ConvidarUsuario docencia={docencia} turmas={turmas} />}
      />

      {erro && !aRemover && (
        <p className="text-destructive text-sm" role="alert">
          {erro}
        </p>
      )}

      <div className="bg-card rounded-lg border">
        <BarraDeSelecao
          quantidade={marcados.length}
          singular="usuário"
          plural="usuários"
          onLimpar={selecao.limpar}
          acoes={[
            ...(aDesativar.length > 0
              ? [
                  {
                    rotulo: `Desativar (${aDesativar.length})`,
                    icone: PowerOff,
                    desabilitada: pendente,
                    onExecutar: () => alterarEmLote(aDesativar, false),
                  },
                ]
              : []),
            ...(aReativar.length > 0
              ? [
                  {
                    rotulo: `Reativar (${aReativar.length})`,
                    icone: Power,
                    desabilitada: pendente,
                    onExecutar: () => alterarEmLote(aReativar, true),
                  },
                ]
              : []),
            {
              rotulo: "Excluir",
              icone: Trash2,
              destrutiva: true,
              desabilitada: pendente,
              onExecutar: () => setRemovendoEmLote(true),
            },
          ]}
        />
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <CabecalhoDaSelecao selecao={selecao} />
              <CabecalhoOrdenavel
                coluna="nome"
                rotulo="Nome"
                controle={controle}
              />
              <CabecalhoOrdenavel
                coluna="email"
                className="w-[20%]"
                rotulo="E-mail"
                controle={controle}
              />
              <CabecalhoOrdenavel
                coluna="perfil"
                className="w-[18%]"
                rotulo="Perfil"
                controle={controle}
              />
              <CabecalhoOrdenavel
                coluna="criadoEm"
                className="w-[12%]"
                rotulo="Criado em"
                controle={controle}
              />
              <CabecalhoOrdenavel
                coluna="ultimoAcesso"
                className="w-[12%]"
                rotulo="Último acesso"
                controle={controle}
              />
              <CabecalhoOrdenavel
                coluna="status"
                className="w-[10%]"
                rotulo="Status"
                controle={controle}
              />
              <TableHead className="w-[72px]">
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filtrados.length === 0 && (
              <LinhaVazia colunas={8}>
                Nenhum usuário corresponde à pesquisa.
              </LinhaVazia>
            )}
            {visiveis.map((usuario) => (
              <TableRow key={usuario.id} data-usuario={usuario.email}>
                <CelulaDaSelecao
                  selecao={selecao}
                  id={usuario.id}
                  descricao={usuario.nome}
                  desabilitada={!usuario.alteravel}
                />
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
                    {usuario.id === meuId && (
                      <Badge
                        variant="outline"
                        className="border-success/30 bg-success-subtle text-success"
                      >
                        Você
                      </Badge>
                    )}
                  </span>
                </TableCell>
                <TableCell>{usuario.email}</TableCell>
                <TableCell>
                  {ROTULO_DO_PAPEL[usuario.papel] ?? usuario.papel}
                  {usuario.cursoNome && (
                    <span className="text-muted-foreground block text-xs">
                      {usuario.turmaNome
                        ? `${usuario.cursoNome}, ${usuario.turmaNome}`
                        : usuario.cursoNome}
                    </span>
                  )}
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
                                  toast.success(
                                    `Convite reenviado para ${usuario.email}.`,
                                  ),
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
                              alterarAtivo(usuario.id, !usuario.ativo),
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
        <RodapeDaTabela {...rodape} />
      </div>

      {removendoEmLote && (
        <ConfirmarExclusao
          titulo={`Excluir ${marcados.length} ${marcados.length === 1 ? "usuário" : "usuários"}?`}
          descricao={marcados.map((u) => u.email).join(", ")}
          aviso="A conta é anonimizada: nome e e-mail saem, as reservas futuras são canceladas e o histórico é mantido sem identificar o titular."
          acao={() =>
            executarEmLote(
              marcados,
              (u) => removerUsuario(u.id),
              (u) => u.email,
            )
          }
          onFechar={() => setRemovendoEmLote(false)}
        />
      )}

      {aEditar && (
        <EditarPapel
          key={aEditar.id}
          usuario={aEditar}
          turmas={turmas}
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
                  () => setARemover(null),
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
