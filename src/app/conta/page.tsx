import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AppHeader } from "@/components/app-header";
import { Separator } from "@/components/ui/separator";
import { exigirSessao } from "@/lib/sessao";
import { formatShortDateTime } from "@/lib/datetime";
import { ExcluirConta } from "./excluir-conta";

export const metadata = { title: "Minha conta | CheckRoom" };
export const dynamic = "force-dynamic";

const ROTULO_DO_PAPEL: Record<string, string> = {
  student: "Aluno",
  professor: "Professor",
  it_support: "Equipe de TI",
  admin: "Administração",
};

export default async function ContaPage() {
  const sessao = await exigirSessao();

  return (
    <>
      <AppHeader />

      <main className="mx-auto max-w-3xl space-y-8 p-6">
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
              <dt className="text-muted-foreground text-xs">Nome</dt>
              <dd className="font-medium">{sessao.nome}</dd>
            </div>

            <div>
              <dt className="text-muted-foreground text-xs">Papel</dt>
              <dd className="font-medium">
                {ROTULO_DO_PAPEL[sessao.papel] ?? sessao.papel}
              </dd>
            </div>

            <div>
              <dt className="text-muted-foreground text-xs">
                Aceite dos termos
              </dt>
              <dd className="font-medium">
                {sessao.aceitouTermosEm
                  ? formatShortDateTime(new Date(sessao.aceitouTermosEm))
                  : "Pendente"}
              </dd>
            </div>

            <div>
              <dt className="text-muted-foreground text-xs">
                Verificação em duas etapas
              </dt>
              <dd className="font-medium">Ativa</dd>
            </div>
          </dl>

          <p className="text-muted-foreground text-xs">
            Para corrigir seu nome ou seu vínculo com disciplinas e turmas,
            procure a coordenação: são dados institucionais e não são editáveis
            por aqui.
          </p>
        </section>

        <section className="border-destructive/30 space-y-4 rounded-lg border p-6">
          <h2 className="font-medium">Remover minha conta</h2>
          <Separator />

          <p className="text-muted-foreground text-sm">
            Você pode encerrar sua conta a qualquer momento. Seu nome é
            substituído em todo o sistema e suas reservas futuras são
            canceladas.
          </p>

          <p className="text-muted-foreground text-sm">
            As reservas já realizadas e os registros de auditoria permanecem,
            porque documentam o uso dos espaços da instituição e a
            rastreabilidade das operações. O que desaparece é a ligação entre
            esses registros e você. O detalhamento está na{" "}
            <Link
              href="/privacidade"
              className="hover:text-foreground underline underline-offset-2"
            >
              política de privacidade
            </Link>
            .
          </p>

          <ExcluirConta />
        </section>
      </main>
    </>
  );
}
