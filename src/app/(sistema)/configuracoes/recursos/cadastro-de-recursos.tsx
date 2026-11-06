"use client";

import { FiltroMultiplo, passaNoFiltro } from "@/components/filtro-multiplo";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import {
  AcoesDaLinha,
  BarraDeSelecao,
  CabecalhoDaSelecao,
  CabecalhoDoCadastro,
  CelulaDaSelecao,
  LinhaVazia,
} from "@/components/cadastro";
import { RodapeDaTabela } from "@/components/paginacao";
import { executarEmLote, usePaginacao, useSelecao } from "@/hooks/use-tabela";
import {
  Campo,
  ConfirmarExclusao,
  DialogoDeFormulario,
} from "@/components/formulario";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RecursoGerenciado } from "@/lib/repositories/repositorio-de-recursos";

import { excluirRecurso, salvarRecurso } from "./acoes";
import { usePesquisa } from "@/hooks/use-pesquisa";
import { CabecalhoOrdenavel } from "@/components/cabecalho-ordenavel";
import { useOrdenacao } from "@/hooks/use-ordenacao";

export function CadastroDeRecursos({
  recursos,
}: {
  recursos: RecursoGerenciado[];
}) {
  const [editando, setEditando] = useState<RecursoGerenciado | "novo" | null>(
    null,
  );
  const [excluindo, setExcluindo] = useState<RecursoGerenciado | null>(null);

  const recurso = editando === "novo" ? null : editando;

  const [usos, setUsos] = useState<string[]>([]);

  const doFiltro = recursos.filter((r) =>
    passaNoFiltro(usos, r.espacos > 0 ? "em_uso" : "sem_uso"),
  );

  const { filtrados, pesquisa } = usePesquisa(
    doFiltro,
    (r) => [r.nome],
    "Pesquisar recursos",
  );

  const { ordenados, controle } = useOrdenacao(filtrados, {
    nome: (r) => r.nome,
    espacos: (r) => r.espacos,
  });
  const { visiveis, rodape } = usePaginacao(ordenados);
  const selecao = useSelecao(
    recursos.map((r) => r.id),
    visiveis.map((r) => r.id),
  );
  const [excluindoEmLote, setExcluindoEmLote] = useState(false);
  const marcados = recursos.filter((r) => selecao.estaMarcado(r.id));

  return (
    <div className="space-y-4">
      <CabecalhoDoCadastro
        titulo="Recursos"
        rotuloDoNovo="Novo recurso"
        onNovo={() => setEditando("novo")}
        pesquisa={pesquisa}
        filtros={
          <FiltroMultiplo
            rotulo="Status"
            opcoes={[
              { id: "em_uso", nome: "Em uso" },
              { id: "sem_uso", nome: "Sem uso" },
            ]}
            valor={usos}
            onChange={setUsos}
          />
        }
      />

      <div className="bg-card rounded-lg border">
        <BarraDeSelecao
          quantidade={marcados.length}
          singular="recurso"
          plural="recursos"
          onLimpar={selecao.limpar}
          acoes={[
            {
              rotulo: "Excluir",
              icone: Trash2,
              destrutiva: true,
              onExecutar: () => setExcluindoEmLote(true),
            },
          ]}
        />
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <CabecalhoDaSelecao selecao={selecao} />
              <CabecalhoOrdenavel
                coluna="nome"
                rotulo="Recurso"
                controle={controle}
              />
              <CabecalhoOrdenavel
                coluna="espacos"
                rotulo="Espaços"
                controle={controle}
                className="w-[15%] text-right"
              />
              <TableHead className="w-[72px]">
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filtrados.length === 0 && (
              <LinhaVazia colunas={4}>
                {recursos.length === 0
                  ? "Nenhum recurso cadastrado."
                  : "Nenhum recurso corresponde à pesquisa."}
              </LinhaVazia>
            )}
            {visiveis.map((r) => (
              <TableRow key={r.id} data-recurso={r.nome}>
                <CelulaDaSelecao
                  selecao={selecao}
                  id={r.id}
                  descricao={r.nome}
                />
                <TableCell className="font-medium">{r.nome}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {r.espacos}
                </TableCell>
                <TableCell>
                  <AcoesDaLinha
                    descricao={r.nome}
                    onEditar={() => setEditando(r)}
                    onExcluir={() => setExcluindo(r)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <RodapeDaTabela {...rodape} />
      </div>

      {editando && (
        <DialogoDeFormulario
          titulo={recurso ? "Editar recurso" : "Novo recurso"}
          descricao="Equipamento que um espaço oferece e que a reserva pode exigir."
          acao={salvarRecurso}
          onFechar={() => setEditando(null)}
        >
          {(estado) => (
            <>
              <input type="hidden" name="id" value={recurso?.id ?? ""} />
              <Campo
                id="recursoNome"
                rotulo="Nome"
                estado={estado}
                campo="nome"
              >
                <Input
                  id="recursoNome"
                  name="nome"
                  defaultValue={recurso?.nome}
                  placeholder="Microscópio"
                />
              </Campo>
            </>
          )}
        </DialogoDeFormulario>
      )}

      {excluindoEmLote && (
        <ConfirmarExclusao
          titulo={`Excluir ${marcados.length} ${marcados.length === 1 ? "recurso" : "recursos"}?`}
          descricao={marcados.map((r) => r.nome).join(", ")}
          aviso="Os recursos saem dos espaços que os oferecem. Recurso pedido por alguma reserva não é excluído."
          acao={() =>
            executarEmLote(
              marcados,
              (r) => excluirRecurso(r.id),
              (r) => r.nome,
            )
          }
          onFechar={() => setExcluindoEmLote(false)}
        />
      )}

      {excluindo && (
        <ConfirmarExclusao
          titulo="Excluir recurso?"
          descricao={excluindo.nome}
          aviso={
            excluindo.espacos > 0
              ? `O recurso sai dos ${excluindo.espacos} espaço(s) que o oferecem. Se alguma reserva o pediu, a exclusão é recusada.`
              : "Se alguma reserva o pediu, a exclusão é recusada."
          }
          acao={() => excluirRecurso(excluindo.id)}
          onFechar={() => setExcluindo(null)}
        />
      )}
    </div>
  );
}
