"use client";

import { CampoDePesquisa } from "@/components/campo-de-pesquisa";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/datetime";
import { CabecalhoOrdenavel } from "@/components/cabecalho-ordenavel";
import { useOrdenacao } from "@/hooks/use-ordenacao";
import { usePesquisa } from "@/hooks/use-pesquisa";

export type Inscrito = {
  nome: string;
  email: string | null;
  curso: string | null;
  inscritoEm: string;
};

export function InscritosDaPalestra({
  titulo,
  inscritos,
  erro,
  onFechar,
}: {
  titulo: string;
  inscritos: Inscrito[] | null;
  erro: string | null;
  onFechar: () => void;
}) {
  const { filtrados, pesquisa } = usePesquisa(
    inscritos ?? [],
    (i) => [i.nome, i.email, i.curso, formatDateTime(new Date(i.inscritoEm))],
    "Pesquisar inscritos",
  );

  const { ordenados, controle } = useOrdenacao(filtrados, {
    nome: (i) => i.nome,
    email: (i) => i.email,
    curso: (i) => i.curso,
    inscritoEm: (i) => new Date(i.inscritoEm),
  });

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Inscritos</DialogTitle>
          <DialogDescription>
            {titulo}
            {inscritos &&
              `, ${inscritos.length} ${inscritos.length === 1 ? "inscrito" : "inscritos"}`}
          </DialogDescription>
        </DialogHeader>

        {erro && (
          <p className="text-destructive text-sm" role="alert">
            {erro}
          </p>
        )}

        {!erro && inscritos === null && (
          <p className="text-muted-foreground py-6 text-center text-sm">
            Carregando inscritos...
          </p>
        )}

        {inscritos && inscritos.length === 0 && (
          <p className="text-muted-foreground py-6 text-center text-sm">
            Ninguém se inscreveu ainda.
          </p>
        )}

        {inscritos && inscritos.length > 0 && (
          <CampoDePesquisa
            valor={pesquisa.valor}
            onMudar={pesquisa.onMudar}
            rotulo={pesquisa.rotulo}
            className="sm:w-80"
          />
        )}

        {inscritos && inscritos.length > 0 && filtrados.length === 0 && (
          <p className="text-muted-foreground py-6 text-center text-sm">
            Nenhum inscrito corresponde à pesquisa.
          </p>
        )}

        {inscritos && filtrados.length > 0 && (
          <div className="max-h-[28rem] overflow-y-auto rounded-lg border">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <CabecalhoOrdenavel
                    coluna="nome"
                    rotulo="Nome"
                    controle={controle}
                  />
                  <CabecalhoOrdenavel
                    coluna="email"
                    className="w-[30%]"
                    rotulo="E-mail"
                    controle={controle}
                  />
                  <CabecalhoOrdenavel
                    coluna="curso"
                    className="w-[22%]"
                    rotulo="Curso"
                    controle={controle}
                  />
                  <CabecalhoOrdenavel
                    coluna="inscritoEm"
                    className="w-[18%]"
                    rotulo="Inscrito em"
                    controle={controle}
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordenados.map((inscrito) => (
                  <TableRow key={`${inscrito.email}-${inscrito.nome}`}>
                    <TableCell className="font-medium">
                      {inscrito.nome}
                    </TableCell>
                    <TableCell>{inscrito.email ?? "-"}</TableCell>
                    <TableCell>{inscrito.curso ?? "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDateTime(new Date(inscrito.inscritoEm))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
