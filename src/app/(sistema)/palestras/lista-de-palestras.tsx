"use client";

import { useCallback, useState, useTransition } from "react";
import { CalendarPlus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { CabecalhoOrdenavel } from "@/components/cabecalho-ordenavel";
import { FiltroMultiplo, passaNoFiltro } from "@/components/filtro-multiplo";
import {
  BarraDeSelecao,
  CabecalhoDaSelecao,
  CabecalhoDoCadastro,
  LinhaVazia,
} from "@/components/cadastro";
import { ConfirmarExclusao } from "@/components/formulario";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { vagasRestantes } from "@/domain/palestras/palestra";
import { STATUS } from "@/domain/status/status";
import { formatPeriod } from "@/lib/datetime";
import { RodapeDaTabela } from "@/components/paginacao";
import { useOrdenacao } from "@/hooks/use-ordenacao";
import { usePesquisa } from "@/hooks/use-pesquisa";
import { executarEmLote, usePaginacao, useSelecao } from "@/hooks/use-tabela";

import {
  PainelDeReserva,
  type Catalogos,
} from "../reservas/formulario/painel-de-reserva";
import {
  cancelarInscricao,
  excluirPalestra,
  inscreverEmPalestra,
  listarInscritosDaPalestra,
} from "./acoes";
import { InscritosDaPalestra, type Inscrito } from "./inscritos-da-palestra";
import { LinhaDaPalestra } from "./linha-da-palestra";
import {
  STATUS_FILTRAVEIS,
  statusDaPalestra,
  unicos,
  type Palestra,
} from "./palestra-na-lista";

function semRascunho() {}

export function ListaDePalestras({
  palestras,
  catalogos,
  hoje,
  semCurso,
}: {
  palestras: Palestra[];
  catalogos: Catalogos | null;
  hoje: string;
  semCurso: boolean;
}) {
  const [cadastrando, setCadastrando] = useState(false);
  const [excluindo, setExcluindo] = useState<Palestra | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();
  const [verInscritos, setVerInscritos] = useState<{
    palestra: Palestra;
    inscritos: Inscrito[] | null;
    erro: string | null;
  } | null>(null);
  const cadastra = catalogos !== null;
  const fecharCadastro = useCallback(() => setCadastrando(false), []);

  function abrirInscritos(palestra: Palestra) {
    setVerInscritos({ palestra, inscritos: null, erro: null });
    startTransition(async () => {
      const resultado = await listarInscritosDaPalestra(palestra.id);
      setVerInscritos({
        palestra,
        inscritos: resultado.ok ? resultado.inscritos : null,
        erro: resultado.ok ? null : resultado.mensagem,
      });
    });
  }

  function executar(
    acao: () => Promise<{ ok: boolean; mensagem?: string }>,
    sucesso: string,
  ) {
    setErro(null);
    startTransition(async () => {
      const resultado = await acao();
      if (resultado.ok) toast.success(sucesso);
      else setErro(resultado.mensagem ?? null);
    });
  }

  const [situacoes, setSituacoes] = useState<string[]>([]);
  const [cursos, setCursos] = useState<string[]>([]);
  const [espacos, setEspacos] = useState<string[]>([]);
  const [palestrantes, setPalestrantes] = useState<string[]>([]);

  const doFiltro = palestras.filter(
    (p) =>
      passaNoFiltro(situacoes, statusDaPalestra(p)) &&
      (cursos.length === 0 || p.cursos.some((c) => cursos.includes(c))) &&
      passaNoFiltro(espacos, p.espaco) &&
      passaNoFiltro(palestrantes, p.palestrante),
  );

  const { filtrados, pesquisa } = usePesquisa(
    doFiltro,
    (palestra) => [
      palestra.titulo,
      palestra.palestrante,
      palestra.espaco,
      formatPeriod(palestra.inicio, palestra.fim),
      ...palestra.cursos,
    ],
    "Pesquisar palestras",
  );

  const { ordenados, controle } = useOrdenacao(filtrados, {
    titulo: (p) => p.titulo,
    palestrante: (p) => p.palestrante,
    inicio: (p) => p.inicio,
    espaco: (p) => p.espaco,
    vagas: (p) => vagasRestantes(p),
    status: (p) => STATUS[statusDaPalestra(p)].rotulo,
  });
  const { visiveis, rodape } = usePaginacao(ordenados);
  const colunas = 8;

  const emLote = (p: Palestra) =>
    cadastra ||
    p.situacaoDoAluno === "disponivel" ||
    (p.situacaoDoAluno === "inscrito" && !p.iniciada);
  const selecao = useSelecao(
    palestras.filter(emLote).map((p) => p.id),
    visiveis.filter(emLote).map((p) => p.id),
  );
  const marcadas = palestras.filter((p) => selecao.estaMarcado(p.id));
  const aInscrever = marcadas.filter((p) => p.situacaoDoAluno === "disponivel");
  const aCancelar = marcadas.filter(
    (p) => p.situacaoDoAluno === "inscrito" && !p.iniciada,
  );
  const [excluindoEmLote, setExcluindoEmLote] = useState(false);

  function emLoteDaAluno(
    itens: Palestra[],
    acao: (id: string) => Promise<{ ok: boolean; mensagem?: string }>,
    sucesso: string,
  ) {
    setErro(null);
    startTransition(async () => {
      const resultado = await executarEmLote(
        itens,
        async (p) => {
          const r = await acao(p.id);
          return r.ok
            ? { ok: true as const }
            : { ok: false as const, mensagem: r.mensagem ?? "Falhou." };
        },
        (p) => p.titulo,
      );
      if (resultado.ok) {
        toast.success(sucesso);
        selecao.limpar();
      } else setErro(resultado.mensagem);
    });
  }

  return (
    <div className="space-y-4">
      <CabecalhoDoCadastro
        titulo="Palestras"
        rotuloDoNovo={cadastra ? "Nova palestra" : undefined}
        onNovo={cadastra ? () => setCadastrando(true) : undefined}
        pesquisa={pesquisa}
        filtros={
          <div className="flex flex-wrap items-center gap-2">
            <FiltroMultiplo
              rotulo="Status"
              opcoes={STATUS_FILTRAVEIS.map((s) => ({
                id: s,
                nome: STATUS[s].rotulo,
              }))}
              valor={situacoes}
              onChange={setSituacoes}
            />
            <FiltroMultiplo
              rotulo="Curso"
              opcoes={unicos(palestras.flatMap((p) => p.cursos))}
              valor={cursos}
              onChange={setCursos}
            />
            <FiltroMultiplo
              rotulo="Espaço"
              opcoes={unicos(palestras.map((p) => p.espaco))}
              valor={espacos}
              onChange={setEspacos}
            />
            <FiltroMultiplo
              rotulo="Palestrante"
              opcoes={unicos(palestras.map((p) => p.palestrante))}
              valor={palestrantes}
              onChange={setPalestrantes}
            />
          </div>
        }
      />

      {semCurso && (
        <p className="text-muted-foreground text-sm">
          Sua conta ainda não tem curso definido. Peça à administração para
          vinculá-la ao seu curso e ver as palestras dele.
        </p>
      )}

      {erro && (
        <p className="text-destructive text-sm" role="alert">
          {erro}
        </p>
      )}

      <div className="bg-card rounded-lg border">
        <BarraDeSelecao
          quantidade={marcadas.length}
          singular="palestra"
          plural="palestras"
          onLimpar={selecao.limpar}
          acoes={[
            ...(aInscrever.length > 0
              ? [
                  {
                    rotulo: `Inscrever-se (${aInscrever.length})`,
                    icone: CalendarPlus,
                    desabilitada: pendente,
                    onExecutar: () =>
                      emLoteDaAluno(
                        aInscrever,
                        inscreverEmPalestra,
                        "Inscrição realizada.",
                      ),
                  },
                ]
              : []),
            ...(aCancelar.length > 0
              ? [
                  {
                    rotulo: `Cancelar inscrição (${aCancelar.length})`,
                    icone: X,
                    destrutiva: true,
                    desabilitada: pendente,
                    onExecutar: () =>
                      emLoteDaAluno(
                        aCancelar,
                        cancelarInscricao,
                        "Inscrição cancelada.",
                      ),
                  },
                ]
              : []),
            ...(cadastra && marcadas.length > 0
              ? [
                  {
                    rotulo: `Excluir (${marcadas.length})`,
                    icone: Trash2,
                    destrutiva: true,
                    onExecutar: () => setExcluindoEmLote(true),
                  },
                ]
              : []),
          ]}
        />
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <CabecalhoDaSelecao selecao={selecao} />
              <CabecalhoOrdenavel
                coluna="titulo"
                rotulo="Palestra"
                controle={controle}
              />
              <CabecalhoOrdenavel
                coluna="palestrante"
                className="w-[15%]"
                rotulo="Palestrante"
                controle={controle}
              />
              <CabecalhoOrdenavel
                coluna="inicio"
                className="w-[14%]"
                rotulo="Data e hora"
                controle={controle}
              />
              <CabecalhoOrdenavel
                coluna="espaco"
                className="w-[9%]"
                rotulo="Espaço"
                controle={controle}
              />
              <CabecalhoOrdenavel
                coluna="vagas"
                className="w-[16%]"
                rotulo="Vagas"
                controle={controle}
              />
              <CabecalhoOrdenavel
                coluna="status"
                className="w-[12%]"
                rotulo="Status"
                controle={controle}
              />
              <TableHead className="w-44 text-right">
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filtrados.length === 0 && (
              <LinhaVazia colunas={colunas}>
                {palestras.length === 0
                  ? "Nenhuma palestra programada."
                  : "Nenhuma palestra corresponde à pesquisa."}
              </LinhaVazia>
            )}

            {visiveis.map((palestra) => (
              <LinhaDaPalestra
                key={palestra.id}
                palestra={palestra}
                selecao={selecao}
                selecionavel={emLote(palestra)}
                cadastra={cadastra}
                pendente={pendente}
                onExecutar={executar}
                onInscritos={() => abrirInscritos(palestra)}
                onExcluir={() => setExcluindo(palestra)}
              />
            ))}
          </TableBody>
        </Table>
        <RodapeDaTabela {...rodape} />
      </div>

      {catalogos && cadastrando && (
        <PainelDeReserva
          catalogos={catalogos}
          hoje={hoje}
          professorFixo={null}
          permitePalestra
          somentePalestra
          preenchimento={{ activityType: "lecture", date: hoje }}
          onFechar={fecharCadastro}
          onConcluir={fecharCadastro}
          onRascunho={semRascunho}
        />
      )}

      {verInscritos && (
        <InscritosDaPalestra
          titulo={verInscritos.palestra.titulo}
          inscritos={verInscritos.inscritos}
          erro={verInscritos.erro}
          onFechar={() => setVerInscritos(null)}
        />
      )}

      {excluindoEmLote && (
        <ConfirmarExclusao
          titulo={`Excluir ${marcadas.length} ${marcadas.length === 1 ? "palestra" : "palestras"}?`}
          descricao={marcadas.map((p) => p.titulo).join("; ")}
          aviso="As inscrições são removidas junto, e os espaços são liberados nos horários das palestras."
          acao={() =>
            executarEmLote(
              marcadas,
              (p) => excluirPalestra(p.id),
              (p) => p.titulo,
            )
          }
          onFechar={() => {
            setExcluindoEmLote(false);
            selecao.limpar();
          }}
        />
      )}

      {excluindo && (
        <ConfirmarExclusao
          titulo="Excluir palestra?"
          descricao={excluindo.titulo}
          aviso={
            excluindo.inscritos > 0
              ? `As ${excluindo.inscritos} inscrições são removidas junto, e o espaço é liberado.`
              : "O espaço é liberado no horário da palestra."
          }
          acao={() => excluirPalestra(excluindo.id)}
          onFechar={() => setExcluindo(null)}
        />
      )}
    </div>
  );
}
