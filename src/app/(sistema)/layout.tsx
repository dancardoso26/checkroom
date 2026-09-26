import { BarraLateral } from "@/components/barra-lateral";
import { TituloDaPagina } from "@/components/titulo-da-pagina";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { podeVerAuditoria } from "@/domain/auth/permissoes";
import { dispensaSegundoFator } from "@/lib/segundo-fator";
import { sessaoAtual } from "@/lib/sessao";

// A estrutura comum das telas internas. Login, verificação e termos ficam fora
// do grupo, porque acontecem antes de haver alguém para navegar.
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
          ehAdmin={podeVerAuditoria(sessao)}
        />
      )}

      {/* min-w-0: sem ele, o item flexível cresce com a tabela mais larga e a
          página inteira vaza para fora da tela. */}
      <SidebarInset className="min-w-0">
        <header className="bg-card flex h-12 shrink-0 items-center gap-2 border-b px-3">
          <SidebarTrigger />
          {/* O data- é necessário: o Separator vertical do shadcn força h-full. */}
          <Separator
            orientation="vertical"
            className="mr-1 data-[orientation=vertical]:h-4"
          />
          <TituloDaPagina />

          {sessao && dispensaSegundoFator(sessao.email) && (
            // Visível de propósito: é o que impede esta conta de aparecer por
            // engano numa demonstração do fluxo de segurança.
            <span className="border-warning/40 bg-warning-subtle text-warning ml-auto rounded-full border px-2.5 py-0.5 text-xs font-medium">
              Conta de desenvolvimento, sem segundo fator
            </span>
          )}
        </header>

        <main className="min-w-0 flex-1 px-3 py-4 sm:px-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
