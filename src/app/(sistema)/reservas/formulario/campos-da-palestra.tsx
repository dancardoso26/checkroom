"use client";

import { CampoComSugestoes } from "@/components/campo-com-sugestoes";
import { SelecaoComPesquisa } from "@/components/selecao-com-pesquisa";
import { SelecaoMultipla } from "@/components/selecao-multipla";
import { Input } from "@/components/ui/input";
import {
  professorDoPalestrante,
  type ProfessorDaLista,
} from "@/domain/palestras/palestrante";

import { LinhaDoFormulario } from "./linha-do-formulario";
import type { CamposDaPalestra } from "./use-formulario-de-reserva";

export function CamposDaPalestraNoPainel({
  palestra,
  alterarPalestra,
  professores,
  cursos,
}: {
  palestra: CamposDaPalestra;
  alterarPalestra: <C extends keyof CamposDaPalestra>(
    campo: C,
    valor: CamposDaPalestra[C]
  ) => void;
  professores: ProfessorDaLista[];
  cursos: { id: string; nome: string }[];
}) {
  const professorEscolhido = professorDoPalestrante(
    palestra.palestrante,
    professores
  );

  return (
    <>
      <LinhaDoFormulario rotulo="Palestrante" htmlFor="palestranteField">
        <CampoComSugestoes
          id="palestranteField"
          name="palestrante"
          valorInicial={palestra.palestrante}
          onChange={(v) => alterarPalestra("palestrante", v)}
          sugestoes={professores.map((p) => p.name)}
          placeholder="Palestrante (digite ou escolha um professor)"
          rotuloDasSugestoes="Professores da instituição"
        />
        {professorEscolhido && (
          <>
            <input
              type="hidden"
              name="palestranteProfessorId"
              value={professorEscolhido.id}
            />
            <p className="text-muted-foreground text-xs">
              Este professor receberá um aviso por e-mail.
            </p>
          </>
        )}
      </LinhaDoFormulario>

      <LinhaDoFormulario rotulo="Cursos"
        htmlFor="cursosField"
      >
        <SelecaoMultipla
          id="cursosField"
          name="cursoIds"
          opcoes={cursos}
          iniciais={palestra.cursoIds}
          onChange={(ids) => alterarPalestra("cursoIds", ids)}
          placeholder="Cursos"
          rotuloDaPesquisa="Pesquisar cursos"
        />
      </LinhaDoFormulario>
    </>
  );
}

export function EspacoEVagasDaPalestra({
  palestra,
  alterarPalestra,
  espacosLivres,
  buscandoEspacos,
  espacoId,
  aoEscolherEspaco,
}: {
  espacosLivres: { id: string; name: string; capacity: number }[] | null;
  buscandoEspacos: boolean;
  espacoId: string;
  aoEscolherEspaco: (id: string) => void;
  palestra: CamposDaPalestra;
  alterarPalestra: <C extends keyof CamposDaPalestra>(
    campo: C,
    valor: CamposDaPalestra[C]
  ) => void;
}) {
  const capacidadeDoEspaco =
    espacosLivres?.find((e) => e.id === espacoId)?.capacity ?? null;
  const capacidadeExcedida =
    capacidadeDoEspaco !== null && Number(palestra.vagas) > capacidadeDoEspaco;
  const vagasInvalidas =
    palestra.vagas !== "" &&
    !(Number.isInteger(Number(palestra.vagas)) && Number(palestra.vagas) > 0);

  return (
    <>
      <LinhaDoFormulario rotulo="Espaço" htmlFor="espacoField">
        <SelecaoComPesquisa
          id="espacoField"
          value={
            espacosLivres?.some((e) => e.id === espacoId) ? espacoId : ""
          }
          onChange={aoEscolherEspaco}
          disabled={espacosLivres === null || espacosLivres.length === 0}
          opcoes={(espacosLivres ?? []).map((e) => ({
            id: e.id,
            nome: e.name,
            detalhe: `${e.capacity} lugares`,
          }))}
          placeholder={
            buscandoEspacos
              ? "Verificando espaços livres..."
              : espacosLivres === null
                ? "Espaço (escolha data e horário primeiro)"
                : espacosLivres.length === 0
                  ? "Nenhum espaço disponível"
                  : "Espaço"
          }
          rotuloDaPesquisa="Pesquisar espaços"
        />
      </LinhaDoFormulario>

      <LinhaDoFormulario rotulo="Vagas" htmlFor="vagasField">
        <Input
          id="vagasField"
          type="number"
          inputMode="numeric"
          min={1}
          placeholder="Vagas"
          value={palestra.vagas}
          onChange={(e) => alterarPalestra("vagas", e.target.value)}
          aria-invalid={vagasInvalidas || capacidadeExcedida || undefined}
        />
        {vagasInvalidas ? (
          <p className="text-destructive text-sm">
            Informe um número inteiro de vagas maior que zero.
          </p>
        ) : capacidadeExcedida ? (
          <p className="text-destructive text-sm">
            O espaço comporta no máximo {capacidadeDoEspaco} pessoas.
          </p>
        ) : null}
      </LinhaDoFormulario>
    </>
  );
}
