"use client";

import { MoreVertical, Pencil, Plus, Trash2, X } from "lucide-react";

import { CampoDePesquisa } from "@/components/campo-de-pesquisa";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import type { Selecao } from "@/hooks/use-tabela";

export type Pesquisa = {
  valor: string;
  onMudar: (valor: string) => void;
  rotulo: string;
};

export function Contagem({
  quantidade,
  total,
  singular,
  plural,
  pesquisando,
}: {
  quantidade: number;
  total: number;
  singular: string;
  plural: string;
  pesquisando: boolean;
}) {
  return (
    <span className="text-muted-foreground text-sm">
      {pesquisando
        ? `${quantidade} de ${total} ${total === 1 ? singular : plural}`
        : `${total} ${total === 1 ? singular : plural}`}
    </span>
  );
}

export function BarraDeFerramentas({
  pesquisa,
  filtros,
}: {
  pesquisa?: Pesquisa;
  filtros?: React.ReactNode;
}) {
  if (!pesquisa && !filtros) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      {pesquisa && (
        <CampoDePesquisa
          valor={pesquisa.valor}
          onMudar={pesquisa.onMudar}
          rotulo={pesquisa.rotulo}
          className="sm:w-72"
        />
      )}
      {filtros && (
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          {filtros}
        </div>
      )}
    </div>
  );
}

export function CabecalhoDoCadastro({
  titulo,
  quantidade,
  total = quantidade,
  singular,
  plural,
  rotuloDoNovo,
  onNovo,
  pesquisa,
  filtros,
  acao,
}: {
  titulo: string;
  quantidade?: number;
  total?: number;
  singular?: string;
  plural?: string;
  rotuloDoNovo?: string;
  onNovo?: () => void;
  pesquisa?: Pesquisa;
  filtros?: React.ReactNode;
  acao?: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
            {titulo}
          </h1>
          {quantidade !== undefined &&
            total !== undefined &&
            singular &&
            plural && (
              <Contagem
                quantidade={quantidade}
                total={total}
                singular={singular}
                plural={plural}
                pesquisando={Boolean(pesquisa?.valor.trim())}
              />
            )}
        </div>

        {(acao || (onNovo && rotuloDoNovo)) && (
          <div className="flex items-center gap-2">
            {acao}
            {onNovo && rotuloDoNovo && (
              <Button onClick={onNovo}>
                <Plus />
                {rotuloDoNovo}
              </Button>
            )}
          </div>
        )}
      </div>

      <BarraDeFerramentas pesquisa={pesquisa} filtros={filtros} />
    </div>
  );
}

export type AcaoDoMenu = {
  rotulo: string;
  icone: React.ComponentType;
  onSelect: () => void;
  destrutiva?: boolean;
  desabilitada?: boolean;
};

export function MenuDeAcoes({
  descricao,
  acoes,
}: {
  descricao: string;
  acoes: AcaoDoMenu[];
}) {
  if (acoes.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground"
          aria-label={`Ações de ${descricao}`}
          onClick={(evento) => evento.stopPropagation()}
          onKeyDown={(evento) => evento.stopPropagation()}
        >
          <MoreVertical />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        onClick={(evento) => evento.stopPropagation()}
      >
        {acoes.map(
          ({ rotulo, icone: Icone, onSelect, destrutiva, desabilitada }) => (
            <DropdownMenuItem
              key={rotulo}
              variant={destrutiva ? "destructive" : "default"}
              disabled={desabilitada}
              onSelect={onSelect}
            >
              <Icone />
              {rotulo}
            </DropdownMenuItem>
          ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AcoesDaLinha({
  descricao,
  onEditar,
  onExcluir,
}: {
  descricao: string;
  onEditar?: () => void;
  onExcluir?: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground"
          aria-label={`Ações de ${descricao}`}
        >
          <MoreVertical />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        {onEditar && (
          <DropdownMenuItem onSelect={onEditar}>
            <Pencil />
            Editar
          </DropdownMenuItem>
        )}
        {onExcluir && (
          <DropdownMenuItem variant="destructive" onSelect={onExcluir}>
            <Trash2 />
            Excluir
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function LinhaVazia({
  colunas,
  children,
}: {
  colunas: number;
  children: React.ReactNode;
}) {
  return (
    <TableRow>
      <TableCell
        colSpan={colunas}
        className="text-muted-foreground py-8 text-center"
      >
        {children}
      </TableCell>
    </TableRow>
  );
}

export function CabecalhoDaSelecao({
  selecao,
  rotulo = "Selecionar todos desta página",
}: {
  selecao: Selecao;
  rotulo?: string;
}) {
  return (
    <TableHead className="w-10">
      <Checkbox
        aria-label={rotulo}
        checked={selecao.estadoDoCabecalho}
        onCheckedChange={(marcado) =>
          selecao.alternarVisiveis(marcado === true)
        }
      />
    </TableHead>
  );
}

export function CelulaDaSelecao({
  selecao,
  id,
  descricao,
  desabilitada = false,
}: {
  selecao: Selecao;
  id: string;
  descricao: string;
  desabilitada?: boolean;
}) {
  return (
    <TableCell className="w-10" onClick={(evento) => evento.stopPropagation()}>
      <Checkbox
        aria-label={`Selecionar ${descricao}`}
        checked={selecao.estaMarcado(id)}
        disabled={desabilitada}
        onCheckedChange={(marcado) => selecao.alternar(id, marcado === true)}
        onKeyDown={(evento) => evento.stopPropagation()}
      />
    </TableCell>
  );
}

export type AcaoEmLote = {
  rotulo: string;
  icone: React.ComponentType;
  onExecutar: () => void;
  destrutiva?: boolean;
  desabilitada?: boolean;
};

export function BarraDeSelecao({
  quantidade,
  singular,
  plural,
  acoes,
  onLimpar,
}: {
  quantidade: number;
  singular: string;
  plural: string;
  acoes: AcaoEmLote[];
  onLimpar: () => void;
}) {
  if (quantidade === 0) return null;

  return (
    <div
      role="region"
      aria-label="Ações para os itens selecionados"
      className="bg-primary-subtle flex flex-wrap items-center gap-2 rounded-t-lg border-b px-4 py-2"
    >
      <span className="text-sm font-medium">
        {quantidade} {quantidade === 1 ? singular : plural}{" "}
        {quantidade === 1 ? "selecionado" : "selecionados"}
      </span>

      <div className="flex flex-wrap items-center gap-2">
        {acoes.map(
          ({ rotulo, icone: Icone, onExecutar, destrutiva, desabilitada }) => (
            <Button
              key={rotulo}
              size="sm"
              variant="outline"
              disabled={desabilitada}
              className={
                destrutiva
                  ? "text-destructive hover:text-destructive"
                  : undefined
              }
              onClick={onExecutar}
            >
              <Icone />
              {rotulo}
            </Button>
          ),
        )}
      </div>

      <Button size="sm" variant="ghost" className="ml-auto" onClick={onLimpar}>
        <X />
        Limpar seleção
      </Button>
    </div>
  );
}
