import { redirect } from "next/navigation";

import {
  podeAlterarUsuario,
  podeGerenciarUsuarios,
} from "@/domain/auth/permissoes";
import { listarTurmas } from "@/lib/repositories/repositorio-de-turmas";
import { carregarCadastroAcademico } from "@/lib/repositories/repositorio-academico";
import { periodoLetivoVigente } from "@/lib/repositories/repositorio-do-calendario";
import { listarUsuarios } from "@/lib/repositories/repositorio-de-usuarios";
import { exigirSessao } from "@/lib/sessao";

import { TabelaDeUsuarios } from "./tabela-de-usuarios";

export const metadata = { title: "Usuários | CheckRoom" };
export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const sessao = await exigirSessao();
  if (!podeGerenciarUsuarios(sessao)) redirect("/reservas");

  const [usuarios, cadastro, turmas, periodo] = await Promise.all([
    listarUsuarios(),
    carregarCadastroAcademico(),
    listarTurmas(),
    periodoLetivoVigente(),
  ]);

  return (
    <div className="space-y-4">
      <TabelaDeUsuarios
        meuId={sessao.profileId}
        turmas={turmas}
        docencia={{
          cursos: cadastro.cursos,
          disciplinas: cadastro.disciplinas,
          turmas: cadastro.turmas,
          periodo,
        }}
        usuarios={usuarios.map((u) => ({
          ...u,
          alteravel: podeAlterarUsuario(sessao, u),
        }))}
      />
    </div>
  );
}
