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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ANDARES,
  codigoDoEspaco,
  ROTULO_DO_TIPO,
  rotuloDoAndar,
  TIPOS_DE_ESPACO,
} from "@/domain/espacos/espaco";
import type { ResourceOption } from "@/lib/repositories/repositorio-de-recursos";
import type { EspacoGerenciado } from "@/lib/repositories/repositorio-de-espacos";
import { usePesquisa } from "@/hooks/use-pesquisa";
import { CabecalhoOrdenavel } from "@/components/cabecalho-ordenavel";
import { useOrdenacao } from "@/hooks/use-ordenacao";

import { excluirEspaco, salvarEspaco } from "./acoes";

export function CadastroDeEspacos({
  espacos,
  recursos,
}: {
  espacos: EspacoGerenciado[];
  recursos: ResourceOption[];
}) {
  const [editando, setEditando] = useState<EspacoGerenciado | "novo" | null>(
    null,
  );
  const [excluindo, setExcluindo] = useState<EspacoGerenciado | null>(null);

  const nomeDoRecurso = new Map(recursos.map((r) => [r.id, r.name]));
  const nomesDosRecursos = (espaco: EspacoGerenciado) =>
    espaco.recursoIds.map((id) => nomeDoRecurso.get(id)).filter(Boolean);

  const [tipos, setTipos] = useState<string[]>([]);
  const [predios, setPredios] = useState<string[]>([]);
  const [recursosEscolhidos, setRecursosEscolhidos] = useState<string[]>([]);

  const opcoesDePredio = [...new Set(espacos.map((e) => e.predio))]
    .sort((a, b) => a - b)
    .map((predio) => ({ id: String(predio), nome: `Prédio ${predio}` }));

  const doFiltro = espacos.filter(
    (e) =>
      passaNoFiltro(tipos, e.tipo) &&
      passaNoFiltro(predios, String(e.predio)) &&
      (recursosEscolhidos.length === 0 ||
        e.recursoIds.some((id) => recursosEscolhidos.includes(id))),
  );

  const { filtrados, pesquisa } = usePesquisa(
    doFiltro,
    (espaco) => [
      espaco.codigo,
      `Prédio ${espaco.predio}`,
      rotuloDoAndar(espaco.andar),
      `Sala ${espaco.sala}`,
      ROTULO_DO_TIPO[espaco.tipo],
      espaco.capacidade,
      ...nomesDosRecursos(espaco),
    ],
    "Pesquisar espaços",
  );

  const { ordenados, controle } = useOrdenacao(filtrados, {
    codigo: (e) => e.codigo,
    tipo: (e) => ROTULO_DO_TIPO[e.tipo],
    capacidade: (e) => e.capacidade,
    recursos: (e) => nomesDosRecursos(e).join(", "),
  });
  const { visiveis, rodape } = usePaginacao(ordenados);
  const selecao = useSelecao(
    espacos.map((e) => e.id),
    visiveis.map((e) => e.id),
  );
  const [excluindoEmLote, setExcluindoEmLote] = useState(false);
  const marcados = espacos.filter((e) => selecao.estaMarcado(e.id));

  return (
    <div className="space-y-4">
      <CabecalhoDoCadastro
        titulo="Espaços"
        rotuloDoNovo="Novo espaço"
        onNovo={() => setEditando("novo")}
        pesquisa={pesquisa}
        filtros={
          <>
            <FiltroMultiplo
              rotulo="Tipo"
              opcoes={TIPOS_DE_ESPACO.map((t) => ({
                id: t,
                nome: ROTULO_DO_TIPO[t],
              }))}
              valor={tipos}
              onChange={setTipos}
            />
            <FiltroMultiplo
              rotulo="Prédio"
              opcoes={opcoesDePredio}
              valor={predios}
              onChange={setPredios}
            />
            <FiltroMultiplo
              rotulo="Recursos"
              opcoes={recursos.map((r) => ({ id: r.id, nome: r.name }))}
              valor={recursosEscolhidos}
              onChange={setRecursosEscolhidos}
            />
          </>
        }
      />

      <div className="bg-card rounded-lg border">
        <BarraDeSelecao
          quantidade={marcados.length}
          singular="espaço"
          plural="espaços"
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
                coluna="codigo"
                className="w-[16%]"
                rotulo="Espaço"
                controle={controle}
              />
              <CabecalhoOrdenavel
                coluna="tipo"
                className="w-[14%]"
                rotulo="Tipo"
                controle={controle}
              />
              <CabecalhoOrdenavel
                coluna="capacidade"
                rotulo="Capacidade"
                controle={controle}
                className="w-[12%] text-right"
              />
              <CabecalhoOrdenavel
                coluna="recursos"
                rotulo="Recursos"
                controle={controle}
              />
              <TableHead className="w-[72px]">
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filtrados.length === 0 && (
              <LinhaVazia colunas={6}>
                {espacos.length === 0
                  ? "Nenhum espaço cadastrado."
                  : "Nenhum espaço corresponde à pesquisa."}
              </LinhaVazia>
            )}
            {visiveis.map((espaco) => (
              <TableRow key={espaco.id} data-espaco={espaco.codigo}>
                <CelulaDaSelecao
                  selecao={selecao}
                  id={espaco.id}
                  descricao={espaco.codigo}
                />
                <TableCell className="font-medium">
                  {espaco.codigo}
                  <span className="text-muted-foreground block text-xs">
                    Prédio {espaco.predio} · {rotuloDoAndar(espaco.andar)} ·
                    Sala {espaco.sala}
                  </span>
                </TableCell>
                <TableCell>{ROTULO_DO_TIPO[espaco.tipo]}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {espaco.capacidade}
                </TableCell>
                <TableCell className="text-muted-foreground max-w-xs truncate">
                  {espaco.recursoIds.length === 0
                    ? "Nenhum"
                    : nomesDosRecursos(espaco).join(", ")}
                </TableCell>
                <TableCell>
                  <AcoesDaLinha
                    descricao={espaco.codigo}
                    onEditar={() => setEditando(espaco)}
                    onExcluir={() => setExcluindo(espaco)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <RodapeDaTabela {...rodape} />
      </div>

      {editando && (
        <FormularioDoEspaco
          espaco={editando === "novo" ? null : editando}
          recursos={recursos}
          onFechar={() => setEditando(null)}
        />
      )}

      {excluindoEmLote && (
        <ConfirmarExclusao
          titulo={`Excluir ${marcados.length} ${marcados.length === 1 ? "espaço" : "espaços"}?`}
          descricao={marcados.map((e) => e.codigo).join(", ")}
          aviso="Espaços com reservas, chamados ou palestras não podem ser excluídos: o histórico depende deles."
          acao={() =>
            executarEmLote(
              marcados,
              (e) => excluirEspaco(e.id),
              (e) => e.codigo,
            )
          }
          onFechar={() => setExcluindoEmLote(false)}
        />
      )}

      {excluindo && (
        <ConfirmarExclusao
          titulo="Excluir espaço?"
          descricao={excluindo.codigo}
          aviso="Um espaço com reservas, chamados ou palestras não pode ser excluído: o histórico depende dele."
          acao={() => excluirEspaco(excluindo.id)}
          onFechar={() => setExcluindo(null)}
        />
      )}
    </div>
  );
}

function FormularioDoEspaco({
  espaco,
  recursos,
  onFechar,
}: {
  espaco: EspacoGerenciado | null;
  recursos: ResourceOption[];
  onFechar: () => void;
}) {
  const [predio, setPredio] = useState(espaco ? String(espaco.predio) : "");
  const [andar, setAndar] = useState(espaco?.andar ?? "T");
  const [sala, setSala] = useState(espaco ? String(espaco.sala) : "");

  const previa =
    Number(predio) > 0 && Number(sala) > 0
      ? codigoDoEspaco(Number(predio), andar, Number(sala))
      : null;

  return (
    <DialogoDeFormulario
      titulo={espaco ? "Editar espaço" : "Novo espaço"}
      descricao="O código segue o padrão da instituição: prédio, andar (S subsolo, T térreo) e sala, como 3T-12."
      acao={salvarEspaco}
      onFechar={onFechar}
    >
      {(estado) => (
        <>
          <input type="hidden" name="id" value={espaco?.id ?? ""} />

          <div className="grid gap-4 sm:grid-cols-3">
            <Campo
              id="espacoPredio"
              rotulo="Prédio"
              estado={estado}
              campo="predio"
            >
              <Input
                id="espacoPredio"
                name="predio"
                type="number"
                inputMode="numeric"
                min={1}
                value={predio}
                onChange={(e) => setPredio(e.target.value)}
                placeholder="3"
              />
            </Campo>

            <Campo
              id="espacoAndar"
              rotulo="Andar"
              estado={estado}
              campo="andar"
            >
              <Select name="andar" value={andar} onValueChange={setAndar}>
                <SelectTrigger id="espacoAndar" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANDARES.map((opcao) => (
                    <SelectItem key={opcao} value={opcao}>
                      {opcao} · {rotuloDoAndar(opcao)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>

            <Campo id="espacoSala" rotulo="Sala" estado={estado} campo="sala">
              <Input
                id="espacoSala"
                name="sala"
                type="number"
                inputMode="numeric"
                min={1}
                value={sala}
                onChange={(e) => setSala(e.target.value)}
                placeholder="12"
              />
            </Campo>
          </div>

          <p className="text-muted-foreground text-sm" aria-live="polite">
            Código:{" "}
            <strong className="text-foreground font-semibold" data-codigo>
              {previa ?? "preencha prédio e sala"}
            </strong>
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id="espacoTipo" rotulo="Tipo" estado={estado} campo="tipo">
              <Select name="tipo" defaultValue={espaco?.tipo}>
                <SelectTrigger id="espacoTipo" className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_DE_ESPACO.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {ROTULO_DO_TIPO[tipo]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>

            <Campo
              id="espacoCapacidade"
              rotulo="Capacidade"
              estado={estado}
              campo="capacidade"
            >
              <Input
                id="espacoCapacidade"
                name="capacidade"
                type="number"
                inputMode="numeric"
                defaultValue={espaco?.capacidade}
              />
            </Campo>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">
              Recursos disponíveis
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {recursos.map((recurso) => (
                <label
                  key={recurso.id}
                  htmlFor={`espacoRecurso-${recurso.id}`}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <Checkbox
                    id={`espacoRecurso-${recurso.id}`}
                    name="recursoIds"
                    value={recurso.id}
                    defaultChecked={espaco?.recursoIds.includes(recurso.id)}
                  />
                  {recurso.name}
                </label>
              ))}
            </div>
          </fieldset>
        </>
      )}
    </DialogoDeFormulario>
  );
}
