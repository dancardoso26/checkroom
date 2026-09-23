import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Logo } from "@/components/logo";
import { FormularioDeCodigo } from "./formulario";

export const metadata = { title: "Verificação em duas etapas | CheckRoom" };
export const dynamic = "force-dynamic";

export default async function VerificacaoPage() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.mfa.listFactors();

  if (error) redirect("/login");

  const fator = data.totp.at(0);

  // Sem fator confirmado não há o que desafiar: o caminho é cadastrar.
  if (!fator) redirect("/verificacao/configurar");

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo altura={32} />
          <div className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck aria-hidden className="text-primary size-4" />
            Verificação em duas etapas
          </div>
          <p className="text-muted-foreground text-sm">
            Abra seu aplicativo autenticador e informe o código gerado para o
            CheckRoom.
          </p>
        </div>

        <div className="bg-card rounded-lg border p-6">
          <FormularioDeCodigo factorId={fator.id} />
        </div>
      </div>
    </main>
  );
}
