import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Logo } from "@/components/logo";

export default function DocumentosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="bg-card border-b">
        <div className="mx-auto flex max-w-3xl items-center px-6 py-4">
          <Link href="/" aria-label="Página inicial do CheckRoom">
            <Logo altura={28} />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        <Link
          href="/login"
          className="text-muted-foreground hover:text-foreground hover:bg-accent/50 mb-8 inline-flex items-center gap-1 rounded-[6px] px-2 py-1 text-sm transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Voltar
        </Link>

        {/* prose não existe sem o plugin de tipografia, então o espaçamento sai
            de seletores explícitos aplicados aos filhos diretos. */}
        <article className="[&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:font-medium [&_li]:mb-1.5 [&_p]:mb-4 [&_p]:leading-relaxed [&_table]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 text-sm">
          {children}
        </article>
      </main>
    </>
  );
}
