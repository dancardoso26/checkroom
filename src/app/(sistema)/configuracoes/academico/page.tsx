import { redirect } from "next/navigation";

import { podeGerenciarCadastros } from "@/domain/auth/permissoes";
import { PERIODO_LETIVO_VIGENTE } from "@/domain/booking/businessHours";
import { toDateInputValue } from "@/lib/datetime";
import { carregarCadastroAcademico } from "@/lib/repositories/repositorio-academico";
import { codigoDoPeriodoDe } from "@/lib/repositories/repositorio-do-calendario";
import { exigirSessao } from "@/lib/sessao";

import { CadastroAcademico, type Aba } from "./cadastro-academico";

export const metadata = { title: "Cadastro acadêmico | CheckRoom" };
export const dynamic = "force-dynamic";

const ABAS: Aba[] = ["cursos", "disciplinas", "turmas", "vinculos"];

export default async function AcademicoPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string }>;
}) {
  const sessao = await exigirSessao();
  if (!podeGerenciarCadastros(sessao)) redirect("/reservas");

  const { aba } = await searchParams;
  const periodo =
    (await codigoDoPeriodoDe(toDateInputValue(new Date()))) ?? PERIODO_LETIVO_VIGENTE;

  return (
    <CadastroAcademico
      cadastro={await carregarCadastroAcademico()}
      abaInicial={ABAS.includes(aba as Aba) ? (aba as Aba) : "cursos"}
      periodoVigente={periodo}
    />
  );
}
