import { Logo } from "@/components/logo";
import { SegundoFator } from "../segundo-fator";

export const metadata = { title: "Configurar verificação | CheckRoom" };

export default function ConfigurarVerificacaoPage() {
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

        <div className="bg-card rounded-lg border p-6">
          <SegundoFator cadastrando />
        </div>
      </div>
    </main>
  );
}
