"use client";

import { useState } from "react";

import type { OpcaoDoFiltro } from "@/components/filtro-multiplo";
import { DialogoDeFormulario } from "@/components/formulario";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CadastroAcademico as Dados } from "@/lib/repositories/repositorio-academico";

import {
  salvarCurso,
  salvarDisciplina,
  salvarTurma,
  salvarVinculo,
} from "./acoes";
import {
  CamposDoVinculo,
  Escolha,
  IdOculto,
  Texto,
} from "./campos-do-cadastro";
import { ID_DA_ACAO_DO_TITULO, Secao } from "./secao-do-cadastro";

export type Aba = "cursos" | "disciplinas" | "turmas" | "vinculos";

const ROTULO_DA_ABA: Record<Aba, string> = {
  cursos: "Cursos",
  disciplinas: "Disciplinas",
  turmas: "Turmas",
  vinculos: "Vínculos de professores",
};

export function CadastroAcademico({
  cadastro,
  abaInicial,
  periodoVigente,
}: {
  cadastro: Dados;
  abaInicial: Aba;
  periodoVigente: string;
}) {
  const [aba, setAba] = useState<Aba>(abaInicial);

  function trocarAba(nova: string) {
    setAba(nova as Aba);
    const url = new URL(window.location.href);
    url.searchParams.set("aba", nova);
    window.history.replaceState(null, "", url);
  }

  const nomeDoCurso = new Map(cadastro.cursos.map((c) => [c.id, c.nome]));
  const nomeDaDisciplina = new Map(
    cadastro.disciplinas.map((d) => [d.id, d.nome]),
  );
  const nomeDaTurma = new Map(cadastro.turmas.map((t) => [t.id, t.nome]));
  const nomeDoProfessor = new Map(cadastro.professores.map((d) => [d.id, d.nome]));

  const opcoesDeCurso: OpcaoDoFiltro[] = cadastro.cursos.map((c) => ({
    id: c.id,
    nome: c.nome,
  }));
  const opcoesDeDepartamento: OpcaoDoFiltro[] = [
    ...new Set(cadastro.cursos.map((c) => c.departamento)),
  ].map((d) => ({ id: d, nome: d }));
  const opcoesDeProfessor: OpcaoDoFiltro[] = cadastro.professores.map((d) => ({
    id: d.id,
    nome: d.nome,
  }));
  const opcoesDeDisciplina: OpcaoDoFiltro[] = cadastro.disciplinas.map((d) => ({
    id: d.id,
    nome: d.nome,
  }));
  const opcoesDeTurma: OpcaoDoFiltro[] = cadastro.turmas.map((t) => ({
    id: t.id,
    nome: t.nome,
  }));
  const opcoesDePeriodo: OpcaoDoFiltro[] = [
    ...new Set(cadastro.vinculos.map((v) => v.periodo)),
  ]
    .sort()
    .map((p) => ({ id: p, nome: p }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
          Cadastro acadêmico
        </h1>
        <div id={ID_DA_ACAO_DO_TITULO} className="flex items-center gap-2" />
      </div>

      <Tabs value={aba} onValueChange={trocarAba}>
        <div className="-mx-1 overflow-x-auto px-1">
          <TabsList>
            {(Object.keys(ROTULO_DA_ABA) as Aba[]).map((chave) => (
              <TabsTrigger key={chave} value={chave}>
                {ROTULO_DA_ABA[chave]}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="cursos">
          <Secao
            entidade="courses"
            itens={cadastro.cursos}
            singular="curso"
            plural="cursos"
            rotuloDoNovo="Novo curso"
            filtros={[
              {
                rotulo: "Departamento",
                opcoes: opcoesDeDepartamento,
                valor: (c) => c.departamento,
              },
            ]}
            colunas={[
              { titulo: "Curso", valor: (c) => c.nome, destaque: true },
              { titulo: "Departamento", valor: (c) => c.departamento },
            ]}
            descrever={(c) => c.nome}
            avisoDeExclusao="Um curso com turmas, disciplinas, alunos ou palestras não pode ser excluído."
            formulario={(curso, onFechar) => (
              <DialogoDeFormulario
                titulo={curso ? "Editar curso" : "Novo curso"}
                acao={salvarCurso}
                onFechar={onFechar}
              >
                {(estado) => (
                  <>
                    <IdOculto id={curso?.id} />
                    <Texto
                      estado={estado}
                      campo="nome"
                      rotulo="Nome"
                      valor={curso?.nome}
                    />
                    <Texto
                      estado={estado}
                      campo="departamento"
                      rotulo="Departamento"
                      valor={curso?.departamento}
                    />
                  </>
                )}
              </DialogoDeFormulario>
            )}
          />
        </TabsContent>

        <TabsContent value="disciplinas">
          <Secao
            entidade="subjects"
            itens={cadastro.disciplinas}
            singular="disciplina"
            plural="disciplinas"
            rotuloDoNovo="Nova disciplina"
            filtros={[
              {
                rotulo: "Curso",
                opcoes: opcoesDeCurso,
                valor: (d) => d.cursoId,
              },
            ]}
            colunas={[
              { titulo: "Disciplina", valor: (d) => d.nome, destaque: true },
              { titulo: "Curso", valor: (d) => nomeDoCurso.get(d.cursoId) },
            ]}
            descrever={(d) => d.nome}
            avisoDeExclusao="Uma disciplina com vínculos de professores ou reservas não pode ser excluída."
            formulario={(disciplina, onFechar) => (
              <DialogoDeFormulario
                titulo={disciplina ? "Editar disciplina" : "Nova disciplina"}
                acao={salvarDisciplina}
                onFechar={onFechar}
              >
                {(estado) => (
                  <>
                    <IdOculto id={disciplina?.id} />
                    <Texto
                      estado={estado}
                      campo="nome"
                      rotulo="Nome"
                      valor={disciplina?.nome}
                    />
                    <Escolha
                      estado={estado}
                      campo="cursoId"
                      rotulo="Curso"
                      valor={disciplina?.cursoId}
                      opcoes={cadastro.cursos.map((c) => [c.id, c.nome])}
                    />
                  </>
                )}
              </DialogoDeFormulario>
            )}
          />
        </TabsContent>

        <TabsContent value="turmas">
          <Secao
            entidade="classes"
            itens={cadastro.turmas}
            singular="turma"
            plural="turmas"
            rotuloDoNovo="Nova turma"
            filtros={[
              {
                rotulo: "Curso",
                opcoes: opcoesDeCurso,
                valor: (t) => t.cursoId,
              },
            ]}
            colunas={[
              { titulo: "Turma", valor: (t) => t.nome, destaque: true },
              { titulo: "Curso", valor: (t) => nomeDoCurso.get(t.cursoId) },
              {
                titulo: "Alunos",
                valor: (t) => t.quantidadeDeAlunos,
                numerica: true,
              },
            ]}
            descrever={(t) => t.nome}
            avisoDeExclusao="Uma turma com vínculos de professores ou reservas não pode ser excluída."
            formulario={(turma, onFechar) => (
              <DialogoDeFormulario
                titulo={turma ? "Editar turma" : "Nova turma"}
                descricao="A quantidade de alunos é a de contas de aluno ligadas à turma e é comparada com a capacidade do espaço na reserva."
                acao={salvarTurma}
                onFechar={onFechar}
              >
                {(estado) => (
                  <>
                    <IdOculto id={turma?.id} />
                    <Texto
                      estado={estado}
                      campo="nome"
                      rotulo="Nome"
                      valor={turma?.nome}
                    />
                    <Escolha
                      estado={estado}
                      campo="cursoId"
                      rotulo="Curso"
                      valor={turma?.cursoId}
                      opcoes={cadastro.cursos.map((c) => [c.id, c.nome])}
                    />
                  </>
                )}
              </DialogoDeFormulario>
            )}
          />
        </TabsContent>

        <TabsContent value="vinculos">
          <Secao
            entidade="teaching_assignments"
            itens={cadastro.vinculos}
            singular="vínculo"
            plural="vínculos"
            rotuloDoNovo="Novo vínculo"
            filtros={[
              {
                rotulo: "Professor",
                opcoes: opcoesDeProfessor,
                valor: (v) => v.professorId,
              },
              {
                rotulo: "Disciplina",
                opcoes: opcoesDeDisciplina,
                valor: (v) => v.disciplinaId,
              },
              {
                rotulo: "Turma",
                opcoes: opcoesDeTurma,
                valor: (v) => v.turmaId,
              },
              {
                rotulo: "Período letivo",
                opcoes: opcoesDePeriodo,
                valor: (v) => v.periodo,
              },
            ]}
            colunas={[
              {
                titulo: "Professor",
                valor: (v) =>
                  nomeDoProfessor.get(v.professorId) ?? "Professor removido",
                destaque: true,
              },
              {
                titulo: "Disciplina",
                valor: (v) => nomeDaDisciplina.get(v.disciplinaId),
              },
              { titulo: "Turma", valor: (v) => nomeDaTurma.get(v.turmaId) },
              { titulo: "Período letivo", valor: (v) => v.periodo },
            ]}
            descrever={(v) =>
              `${nomeDoProfessor.get(v.professorId) ?? "professor"}, ${nomeDaDisciplina.get(v.disciplinaId)}`
            }
            avisoDeExclusao="Sem o vínculo, o professor deixa de reservar aulas desta disciplina para esta turma no período. As reservas já feitas continuam."
            formulario={(vinculo, onFechar) => (
              <DialogoDeFormulario
                titulo={
                  vinculo ? "Editar vínculo de professor" : "Novo vínculo de professor"
                }
                descricao="O vínculo autoriza o professor a reservar aulas da disciplina para a turma no período."
                acao={salvarVinculo}
                onFechar={onFechar}
              >
                {(estado) => (
                  <>
                    <IdOculto id={vinculo?.id} />
                    <CamposDoVinculo
                      estado={estado}
                      vinculo={vinculo}
                      cadastro={cadastro}
                      periodoInicial={vinculo?.periodo ?? periodoVigente}
                    />
                  </>
                )}
              </DialogoDeFormulario>
            )}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
