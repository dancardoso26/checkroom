import { redirect } from "next/navigation";

import {
  podeAlterarUsuario,
  podeGerenciarUsuarios,
} from "@/domain/auth/permissoes";
import {
  docentesSemConta,
  listarUsuarios,
} from "@/lib/repositories/userRepository";
import { exigirSessao } from "@/lib/sessao";

import { ConvidarUsuario } from "./convidar-usuario";
import { TabelaDeUsuarios } from "./tabela-de-usuarios";

export const metadata = { title: "Usuários | CheckRoom" };
export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const sessao = await exigirSessao();
  if (!podeGerenciarUsuarios(sessao)) redirect("/reservas");

  const [usuarios, docentes] = await Promise.all([
    listarUsuarios(),
    docentesSemConta(),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
            Usuários
          </h1>
          <span className="text-muted-foreground text-sm">
            {usuarios.length === 1
              ? "1 usuário"
              : `${usuarios.length} usuários`}
          </span>
        </div>

        <ConvidarUsuario docentes={docentes} />
      </div>

      <TabelaDeUsuarios
        usuarios={usuarios.map((u) => ({
          ...u,
          alteravel: podeAlterarUsuario(sessao, u),
        }))}
      />
    </div>
  );
}
