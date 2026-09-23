import { redirect } from "next/navigation";
import Image from "next/image";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Logo } from "@/components/logo";
import { FormularioDeCodigo } from "../formulario";

export const metadata = { title: "Configurar verificação | CheckRoom" };
export const dynamic = "force-dynamic";

export default async function ConfigurarVerificacaoPage() {
  const supabase = await createSupabaseServerClient();

  const { data: fatores, error: erroDosFatores } =
    await supabase.auth.mfa.listFactors();

  if (erroDosFatores) redirect("/login");
  if (fatores.totp.length > 0) redirect("/verificacao");

  // Um cadastro interrompido deixa o fator pendente para trás. Removê-lo evita
  // acumular fatores mortos a cada visita a esta tela.
  const pendente = fatores.all.find(
    (fator) => fator.factor_type === "totp" && fator.status === "unverified"
  );

  if (pendente) await supabase.auth.mfa.unenroll({ factorId: pendente.id });

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "CheckRoom",
  });

  if (error) redirect("/login");

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo altura={32} />
          <p className="text-muted-foreground text-sm">
            O CheckRoom exige uma segunda etapa de verificação. Escaneie o
            código no seu aplicativo autenticador para concluir.
          </p>
        </div>

        <div className="bg-card space-y-6 rounded-lg border p-6">
          <div className="flex flex-col items-center gap-4">
            <Image
              src={data.totp.qr_code}
              alt="QR code para o aplicativo autenticador"
              width={180}
              height={180}
              unoptimized
              className="rounded border bg-white p-2"
            />

            <details className="w-full text-center">
              <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-xs">
                Não consigo escanear
              </summary>
              <code className="mt-2 block break-all text-xs">
                {data.totp.secret}
              </code>
            </details>
          </div>

          <FormularioDeCodigo factorId={data.id} primeiroUso />
        </div>
      </div>
    </main>
  );
}
