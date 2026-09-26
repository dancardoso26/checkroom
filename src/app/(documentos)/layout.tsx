import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Logo } from "@/components/logo";

export default function DocumentosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Fundo branco na página inteira: o azul-claro do resto do sistema cansa a
    // leitura de um texto longo.
    <div className="bg-card min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" aria-label="Página inicial do CheckRoom">
            <Logo altura={28} />
          </Link>
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Voltar ao CheckRoom
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
