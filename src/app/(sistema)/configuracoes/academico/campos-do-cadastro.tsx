"use client";

import { useState } from "react";

import { Campo } from "@/components/formulario";
import { Input } from "@/components/ui/input";
import { SelecaoComPesquisa } from "@/components/selecao-com-pesquisa";
import type { EstadoDoFormulario } from "@/lib/formulario";
import type { CadastroAcademico as Dados } from "@/lib/repositories/repositorio-academico";

export function IdOculto({ id }: { id: string | undefined }) {
  return <input type="hidden" name="id" value={id ?? ""} />;
}

export function Texto({
  estado,
  campo,
  rotulo,
  valor,
  numero,
  email,
}: {
  estado: EstadoDoFormulario;
  campo: string;
  rotulo: string;
  valor: string | number | undefined;
  numero?: boolean;
  email?: boolean;
}) {
  const id = `academico-${campo}`;

  return (
    <Campo id={id} rotulo={rotulo} estado={estado} campo={campo}>
      <Input
        id={id}
        name={campo}
        defaultValue={valor}
        type={numero ? "number" : email ? "email" : "text"}
        inputMode={numero ? "numeric" : undefined}
      />
    </Campo>
  );
}

export function Escolha({
  estado,
  campo,
  rotulo,
  valor,
  opcoes,
  controlado,
  desabilitado,
  placeholder = "Selecione",
}: {
  estado: EstadoDoFormulario;
  campo: string;
  rotulo: string;
  valor: string | undefined;
  opcoes: [string, string][];
  controlado?: (escolhido: string) => void;
  desabilitado?: boolean;
  placeholder?: string;
}) {
  const id = `academico-${campo}`;

  return (
    <Campo id={id} rotulo={rotulo} estado={estado} campo={campo}>
      <SelecaoComPesquisa
        id={id}
        name={campo}
        valorInicial={controlado ? undefined : (valor ?? "")}
        value={controlado ? (valor ?? "") : undefined}
        onChange={controlado}
        disabled={desabilitado}
        opcoes={opcoes.map(([valorDaOpcao, rotuloDaOpcao]) => ({
          id: valorDaOpcao,
          nome: rotuloDaOpcao,
        }))}
        placeholder={placeholder}
        rotuloDaPesquisa={`Pesquisar ${rotulo.toLowerCase()}`}
      />
    </Campo>
  );
}

export function CamposDoVinculo({
  estado,
  vinculo,
  cadastro,
  periodoInicial,
}: {
  estado: EstadoDoFormulario;
  vinculo: Dados["vinculos"][number] | null;
  cadastro: Dados;
  periodoInicial: string;
}) {
  const [cursoId, setCursoId] = useState(
    cadastro.disciplinas.find((d) => d.id === vinculo?.disciplinaId)?.cursoId ??
      "",
  );
  const [disciplinaId, setDisciplinaId] = useState(vinculo?.disciplinaId ?? "");
  const [turmaId, setTurmaId] = useState(vinculo?.turmaId ?? "");

  function escolherCurso(novo: string) {
    setCursoId(novo);
    setDisciplinaId("");
    setTurmaId("");
  }

  const disciplinasDoCurso = cadastro.disciplinas.filter(
    (d) => d.cursoId === cursoId,
  );
  const turmasDoCurso = cadastro.turmas.filter((t) => t.cursoId === cursoId);

  return (
    <>
      <Escolha
        estado={estado}
        campo="cursoId"
        rotulo="Curso"
        valor={cursoId}
        controlado={escolherCurso}
        opcoes={cadastro.cursos.map((c) => [c.id, c.nome])}
      />
      <Escolha
        estado={estado}
        campo="disciplinaId"
        rotulo="Disciplina"
        valor={disciplinaId}
        controlado={setDisciplinaId}
        desabilitado={cursoId === ""}
        placeholder={cursoId === "" ? "Escolha o curso primeiro" : "Selecione"}
        opcoes={disciplinasDoCurso.map((d) => [d.id, d.nome])}
      />
      <Escolha
        estado={estado}
        campo="turmaId"
        rotulo="Turma"
        valor={turmaId}
        controlado={setTurmaId}
        desabilitado={cursoId === ""}
        placeholder={cursoId === "" ? "Escolha o curso primeiro" : "Selecione"}
        opcoes={turmasDoCurso.map((t) => [t.id, t.nome])}
      />
      <Escolha
        estado={estado}
        campo="professorId"
        rotulo="Professor"
        valor={vinculo?.professorId}
        opcoes={cadastro.professores.map((d) => [d.id, d.nome])}
      />
      <Texto
        estado={estado}
        campo="periodo"
        rotulo="Período letivo"
        valor={periodoInicial}
      />
    </>
  );
}
