import Link from "next/link";
import { redirect } from "next/navigation";

import { Logo } from "@/components/logo";
import { sessaoAtual } from "@/lib/sessao";
import { VERSAO_DOS_TERMOS, VERSAO_DA_POLITICA } from "@/lib/documentos";
import { BotaoDeAceite } from "./botao";

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
          <div className="space-y-3 text-sm">
            <p>
              Os{" "}
              <Link
                href="/termos"
                target="_blank"
                className="text-primary underline underline-offset-2"
              >
                termos de uso
              </Link>{" "}
              descrevem o que o sistema faz e o que se espera de quem o usa.
              Aceitá-los é condição para acessar o CheckRoom.
            </p>

            <p className="text-muted-foreground">
              A{" "}
              <Link
                href="/privacidade"
                target="_blank"
                className="hover:text-foreground underline underline-offset-2"
              >
                política de privacidade
              </Link>{" "}
              explica quais dados são tratados e com que fundamento legal. Ela
              é informativa: o tratamento descrito ali sustenta-se na execução
              do serviço e no legítimo interesse, não no seu consentimento, e
              por isso não há o que consentir.
            </p>
          </div>

          <BotaoDeAceite />

          <p className="text-muted-foreground text-center text-xs">
            Termos versão {VERSAO_DOS_TERMOS}, política versão{" "}
            {VERSAO_DA_POLITICA}.
          </p>
        </div>
      </div>
    </main>
  );
}
