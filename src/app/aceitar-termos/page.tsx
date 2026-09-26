import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { redirect } from "next/navigation";

import { Logo } from "@/components/logo";
import { sessaoAtual } from "@/lib/sessao";
import { BotaoDeAceite } from "./botao";

const DOCUMENTOS = [
  { href: "/termos", rotulo: "Termos de Uso" },
  { href: "/privacidade", rotulo: "Política de Privacidade" },
];

export const metadata = { title: "Termos de uso | CheckRoom" };
export const dynamic = "force-dynamic";

export default async function AceitarTermosPage() {
  // sessaoAtual, e não exigirSessao: esta é a tela para onde exigirSessao
  // manda quem ainda não aceitou, e chamá-la aqui seria um laço.
  const sessao = await sessaoAtual();

  if (!sessao) redirect("/login");
  if (sessao.aceitouTermosEm) redirect("/reservas");

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo altura={32} />
          <p className="text-muted-foreground text-sm">
            Antes de continuar, leia os documentos abaixo.
          </p>
        </div>

        <div className="bg-card space-y-5 rounded-lg border p-6">
          {/* Abrem em outra aba: quem lê não perde esta tela nem precisa
              voltar pelo navegador. */}
          <ul className="space-y-2">
            {DOCUMENTOS.map(({ href, rotulo }) => (
              <li key={href}>
                <Link
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:border-primary/40 hover:bg-primary-subtle flex items-center justify-between rounded-md border px-3 py-2.5 text-sm font-medium transition-colors"
                >
                  {rotulo}
                  <ExternalLink
                    aria-hidden
                    className="text-muted-foreground size-4"
                  />
                </Link>
              </li>
            ))}
          </ul>

          <BotaoDeAceite />
        </div>
      </div>
    </main>
  );
}
