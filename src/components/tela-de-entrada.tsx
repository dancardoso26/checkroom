import Link from "next/link";

import { Logo } from "@/components/logo";

// A moldura das telas de quem ainda não entrou: marca no canto, o formulário
// sozinho no centro e os documentos legais sempre à vista no rodapé.
export function TelaDeEntrada({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="px-6 py-5">
        <Link href="/login" aria-label="CheckRoom" className="inline-block">
          <Logo altura={28} />
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-8">
        <div className="w-full max-w-sm space-y-6">
          <h1 className="text-center text-2xl font-semibold tracking-tight">
            {titulo}
          </h1>
          {children}
        </div>
      </main>

      {/* Os documentos ficam acessíveis antes do login, a qualquer momento,
          como a LGPD pede, e abrem sem tirar a pessoa desta tela. */}
      <footer className="text-muted-foreground flex justify-center gap-4 px-6 py-5 text-sm">
        <Link
          href="/termos"
          target="_blank"
          className="hover:text-foreground underline-offset-2 hover:underline"
        >
          Termos de Uso
        </Link>
        <span aria-hidden>·</span>
        <Link
          href="/privacidade"
          target="_blank"
          className="hover:text-foreground underline-offset-2 hover:underline"
        >
          Política de Privacidade
        </Link>
      </footer>
    </div>
  );
}
