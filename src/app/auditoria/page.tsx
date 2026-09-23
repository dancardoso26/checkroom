import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AppHeader } from "@/components/app-header";
import { Badge } from "@/components/ui/badge";
import { exigirSessao } from "@/lib/sessao";
import { podeVerAuditoria } from "@/domain/auth/permissoes";
import { listAuditLogs } from "@/lib/repositories/auditRepository";
import { formatShortDateTime } from "@/lib/datetime";

export const metadata = { title: "Trilha de auditoria | CheckRoom" };
export const dynamic = "force-dynamic";

const ROTULO_DA_ACAO: Record<string, string> = {
  insert: "Criou",
  update: "Alterou",
  delete: "Removeu",
  login: "Entrou",
  login_failed: "Tentativa de acesso recusada",
  logout: "Saiu",
  password_reset_requested: "Pediu recuperação de senha",
  password_changed: "Trocou a senha",
  mfa_enrolled: "Cadastrou segundo fator",
  terms_accepted: "Aceitou os termos de uso",
  account_anonymized: "Removeu a própria conta",
};

const ROTULO_DA_ENTIDADE: Record<string, string> = {
  bookings: "Reserva",
  auth: "Autenticação",
};

function descrever(estado: unknown): string | null {
  if (!estado || typeof estado !== "object") return null;

  const dados = estado as Record<string, unknown>;
  const finalidade = dados.purpose;
  const situacao = dados.status;

  if (typeof finalidade === "string") {
    return typeof situacao === "string" && situacao !== "active"
      ? `${finalidade} (${situacao === "cancelled" ? "cancelada" : situacao})`
      : finalidade;
  }

  const email = dados.email;
  return typeof email === "string" ? email : null;
}

export default async function AuditoriaPage() {
  const sessao = await exigirSessao();

  // A tela repete a verificação do banco porque uma política que nega devolve
  // lista vazia, e lista vazia parece sistema sem registro, não acesso negado.
  if (!podeVerAuditoria(sessao)) redirect("/reservas");

  const registros = await listAuditLogs();

  return (
    <>
      <AppHeader />

      <main className="mx-auto max-w-5xl space-y-6 p-6">
        <div className="space-y-1">
          <Link
            href="/reservas"
            className="text-muted-foreground hover:text-foreground hover:bg-accent/50 mb-6 inline-flex items-center gap-1 rounded-[6px] px-2 py-1 text-sm transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Voltar
          </Link>

          <h1 className="text-2xl font-semibold tracking-tight">
            Trilha de auditoria
          </h1>

          <p className="text-muted-foreground text-sm">
            Registro de acessos e de alterações em reservas. Os eventos são
            gravados pelo banco de dados e não podem ser editados nem removidos
            pelo sistema.
          </p>
        </div>

        {registros.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
            Nenhum evento registrado ainda.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-xs">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Data</th>
                  <th className="px-4 py-2 text-left font-medium">
                    Responsável
                  </th>
                  <th className="px-4 py-2 text-left font-medium">Ação</th>
                  <th className="px-4 py-2 text-left font-medium">Sobre</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {registros.map((registro) => {
                  const detalhe =
                    descrever(registro.afterState) ??
                    descrever(registro.beforeState);

                  return (
                    <tr key={registro.id}>
                      <td className="text-muted-foreground px-4 py-2.5 whitespace-nowrap">
                        {formatShortDateTime(registro.occurredAt)}
                      </td>
                      <td className="px-4 py-2.5">
                        {registro.actorName ?? (
                          <span className="text-muted-foreground">Sistema</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant="secondary" className="font-normal">
                          {ROTULO_DA_ACAO[registro.action] ?? registro.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-muted-foreground">
                          {ROTULO_DA_ENTIDADE[registro.entity] ??
                            registro.entity}
                        </span>
                        {detalhe && <span className="ml-1">· {detalhe}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
