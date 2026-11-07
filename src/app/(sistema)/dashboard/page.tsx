import { redirect } from "next/navigation";

import { podeVerPainel } from "@/domain/auth/permissoes";
import { lerPeriodo, periodoAnterior } from "@/domain/painel/periodo";
import { toDateInputValue } from "@/lib/datetime";
import { carregarDadosDoPainel } from "@/lib/repositories/repositorio-do-painel";
import { exigirSessao } from "@/lib/sessao";
import { AtualizacaoAoVivo } from "@/components/atualizacao-ao-vivo";

import { AbaDeChamados } from "./aba-de-chamados";
import { AbaDePalestras } from "./aba-de-palestras";
import { AbaDeReservas } from "./aba-de-reservas";
import { lerAba } from "./abas";
import { AbasDoPainel } from "./abas-do-painel";
import { FiltroDoPeriodo } from "./filtro-do-periodo";

export const metadata = { title: "Dashboard | CheckRoom" };
export const dynamic = "force-dynamic";

export default async function PainelPage({
  searchParams,
}: {
  searchParams: Promise<{ de?: string; ate?: string; aba?: string }>;
}) {
  const sessao = await exigirSessao();

  if (!podeVerPainel(sessao)) redirect("/reservas");

  const parametros = await searchParams;
  const agora = new Date();
  const hoje = toDateInputValue(agora);
  const { de, ate, periodo } = lerPeriodo(parametros.de, parametros.ate, hoje);
  const aba = lerAba(parametros.aba);

  const [dados, anterior] = await Promise.all([
    carregarDadosDoPainel(periodo),
    carregarDadosDoPainel(periodoAnterior(periodo)),
  ]);

  return (
    <div className="space-y-4">
      <AtualizacaoAoVivo
        tabelas={["bookings", "lectures", "lecture_enrollments", "tickets"]}
      />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Dashboard</h1>
        <FiltroDoPeriodo aba={aba} de={de} ate={ate} hoje={hoje} />
      </div>

      <AbasDoPainel aba={aba} de={de} ate={ate} />

      {aba === "reservas" && <AbaDeReservas dados={dados} periodo={periodo} anterior={anterior} />}
      {aba === "palestras" && <AbaDePalestras dados={dados} periodo={periodo} anterior={anterior} />}
      {aba === "chamados" && (
        <AbaDeChamados dados={dados} periodo={periodo} anterior={anterior} agora={agora} />
      )}
    </div>
  );
}
