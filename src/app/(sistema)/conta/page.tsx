import { RotuloDeCampo } from "@/components/rotulo-de-campo";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { ROTULO_DO_PAPEL } from "@/domain/auth/permissoes";
import { exigirSessao } from "@/lib/sessao";
import { formatDateTime } from "@/lib/datetime";
import { ExcluirConta } from "./excluir-conta";

export const metadata = { title: "Minha conta | CheckRoom" };
export const dynamic = "force-dynamic";

export default async function ContaPage() {
  const sessao = await exigirSessao();

  return (
    <>
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="space-y-1">
          <Link
            href="/reservas"
            className="text-muted-foreground hover:text-foreground hover:bg-accent/50 mb-6 inline-flex items-center gap-1 rounded-[6px] px-2 py-1 text-sm transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Voltar
          </Link>

          <h1 className="text-2xl font-semibold tracking-tight">Minha conta</h1>
        </div>

        <section className="bg-card space-y-4 rounded-lg border p-6">
          <h2 className="font-medium">Seus dados</h2>
          <Separator />

          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground text-xs">
                <RotuloDeCampo rotulo="Nome" />
              </dt>
              <dd className="font-medium">{sessao.nome}</dd>
            </div>

            <div>
              <dt className="text-muted-foreground text-xs">
                <RotuloDeCampo rotulo="Perfil" />
              </dt>
              <dd className="font-medium">
                {ROTULO_DO_PAPEL[sessao.papel] ?? sessao.papel}
              </dd>
            </div>

            <div>
              <dt className="text-muted-foreground text-xs">
                <RotuloDeCampo rotulo="Aceite dos termos" />
              </dt>
              <dd className="font-medium">
                {sessao.aceitouTermosEm
                  ? formatDateTime(new Date(sessao.aceitouTermosEm))
                  : "Pendente"}
              </dd>
            </div>

            <div>
              <dt className="text-muted-foreground text-xs">
                <RotuloDeCampo rotulo="Verificação em duas etapas" />
              </dt>
              <dd className="font-medium">Ativa</dd>
            </div>
          </dl>
        </section>

        {!sessao.ehMaster && (
          <section className="border-destructive/30 bg-card space-y-4 rounded-lg border p-6">
            <h2 className="font-medium">Cancelar minha conta</h2>
            <Separator />

            <p className="text-muted-foreground text-sm">
              Cancele sua conta e remova seus dados pessoais.
            </p>

            <ExcluirConta />
          </section>
        )}
      </div>
    </>
  );
}
