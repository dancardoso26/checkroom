import { BarraLateral } from "@/components/barra-lateral";
import { Logo } from "@/components/logo";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { dispensaSegundoFator } from "@/domain/auth/segundo-fator";
import { sessaoAtual } from "@/lib/sessao";

export default async function SistemaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessao = await sessaoAtual();

  return (
    <SidebarProvider defaultOpen>
      {sessao && (
        <BarraLateral
          nome={sessao.nome}
          papel={sessao.papel}
          semSegundoFator={dispensaSegundoFator(sessao.email)}
        />
      )}

      <SidebarInset className="min-w-0">
        <header className="bg-card flex h-12 shrink-0 items-center gap-2 border-b px-3 md:hidden">
          <SidebarTrigger />
          <Logo altura={20} />
        </header>

        <main className="min-w-0 flex-1 px-3 py-4 sm:px-4">{children}</main>
        <div id="rodape-fixo" className="sticky bottom-0 z-20 empty:hidden" />
      </SidebarInset>
    </SidebarProvider>
  );
}
