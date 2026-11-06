import { compararComAnterior } from "@/domain/painel/comparacao";
import { indicadoresDePalestras, rankingPorContagem } from "@/domain/painel/indicadores";
import { diasDoPeriodo, periodoAnterior, type Periodo } from "@/domain/painel/periodo";
import { serieDoPeriodo } from "@/domain/painel/serie-temporal";
import type { DadosDoPainel } from "@/lib/repositories/repositorio-do-painel";

import { intervaloEmTexto, numero, porcentagem } from "./formatadores";
import { Indicadores, InscricoesPorPalestra } from "./graficos";
import { RankingDeBarras, SerieTemporal } from "./graficos-de-analise";

export function AbaDePalestras({
  dados,
  periodo,
  anterior,
}: {
  dados: DadosDoPainel;
  periodo: Periodo;
  anterior: DadosDoPainel;
}) {
  const periodoPassado = periodoAnterior(periodo);
  const passado = indicadoresDePalestras(anterior.palestras);
  const indicadores = indicadoresDePalestras(dados.palestras);

  return (
    <div className="space-y-4">
      <Indicadores
        periodoAnterior={intervaloEmTexto(
          diasDoPeriodo(periodoPassado).de,
          diasDoPeriodo(periodoPassado).ate
        )}
        blocos={[
          {
            rotulo: "Palestras no período",
            valor: numero.format(indicadores.palestras),
            comparacao: compararComAnterior(indicadores.palestras, passado.palestras, {
              unidade: "percentual",
              melhorQuando: "neutro",
            }),
          },
          {
            rotulo: "Inscrições em palestras",
            valor: numero.format(indicadores.inscricoes),
            comparacao: compararComAnterior(indicadores.inscricoes, passado.inscricoes, {
              unidade: "percentual",
              melhorQuando: "subir",
            }),
          },
          {
            rotulo: "Preenchimento das vagas",
            valor: porcentagem.format(indicadores.preenchimento),
            comparacao: compararComAnterior(
              indicadores.preenchimento,
              passado.preenchimento,
              { unidade: "pontos", melhorQuando: "subir" }
            ),
          },
          {
            rotulo: "Palestras lotadas",
            valor: numero.format(indicadores.lotadas),
            comparacao: compararComAnterior(indicadores.lotadas, passado.lotadas, {
              unidade: "percentual",
              melhorQuando: "neutro",
            }),
          },
        ]}
      />

      <SerieTemporal
        titulo="Inscrições por dia"
        descricao="Inscrições feitas no período, pela data em que o aluno se inscreveu."
        pontos={serieDoPeriodo(periodo, {
          inscricoes: dados.inscricoes.map((i) => i.feitaEm),
        })}
        series={[{ chave: "inscricoes", rotulo: "Inscrições", cor: "var(--chart-1)" }]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <InscricoesPorPalestra
          palestras={dados.palestras.map((p) => ({
            id: p.id,
            titulo: p.titulo,
            vagas: p.vagas,
            inscritos: p.inscritos,
          }))}
        />
        <RankingDeBarras
          titulo="Inscrições por curso"
          descricao="Curso dos alunos que se inscreveram no período."
          itens={rankingPorContagem(
            dados.inscricoes.map((i) => i.cursoId),
            dados.cursos,
            8
          )}
          unidade={["inscrição", "inscrições"]}
          total={dados.inscricoes.length}
        />
      </div>
    </div>
  );
}
