import { redirect } from "next/navigation";

import { podeGerenciarCadastros } from "@/domain/auth/permissoes";
import {
  listarBloqueios,
  listarPeriodos,
} from "@/lib/repositories/repositorio-do-calendario";
import { listRooms } from "@/lib/repositories/repositorio-de-espacos";
import { exigirSessao } from "@/lib/sessao";

import { CalendarioLetivo } from "./calendario-letivo";

export const metadata = { title: "Calendário letivo | CheckRoom" };
export const dynamic = "force-dynamic";

export default async function CalendarioPage() {
  const sessao = await exigirSessao();
  if (!podeGerenciarCadastros(sessao)) redirect("/reservas");

  const [periodos, bloqueios, espacos] = await Promise.all([
    listarPeriodos(),
    listarBloqueios(),
    listRooms(),
  ]);

  return (
    <CalendarioLetivo
      periodos={periodos}
      bloqueios={bloqueios}
      espacos={espacos.map((e) => ({ id: e.id, nome: e.name }))}
    />
  );
}
