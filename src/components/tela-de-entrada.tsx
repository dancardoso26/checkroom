import Link from "next/link";

import { ArteDaEntrada } from "@/components/arte-da-entrada";
import { Logo } from "@/components/logo";

export function TelaDeEntrada({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="bg-card flex flex-col">
        <header className="px-6 py-5 sm:px-10">
          <Link href="/login" aria-label="CheckRoom" className="inline-block">
            <Logo altura={28} />
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center px-6 py-8 sm:px-10">
          <div className="w-full max-w-sm space-y-6">
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">
                {titulo}
              </h1>
              {descricao && (
                <p className="text-muted-foreground text-sm">{descricao}</p>
              )}
            </div>
            {children}
          </div>
        </main>

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

      <aside className="bg-primary text-primary-foreground relative hidden overflow-hidden lg:block">
        <ArteDaEntrada className="absolute inset-0 size-full" />
      </aside>
    </div>
  );
}
