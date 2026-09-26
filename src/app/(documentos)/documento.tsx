"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export type Secao = {
  id: string;
  titulo: string;
  conteudo: React.ReactNode;
};

// Termos e política têm a mesma estrutura: seções numeradas, cada uma com
// âncora própria, e um índice que acompanha a leitura.
export function Documento({
  titulo,
  subtitulo,
  introducao,
  secoes,
}: {
  titulo: string;
  subtitulo: string;
  introducao: React.ReactNode;
  secoes: Secao[];
}) {
  const [atual, setAtual] = useState(secoes[0]?.id);

  // Marca no índice a seção que está no topo da tela.
  useEffect(() => {
    const observador = new IntersectionObserver(
      (entradas) => {
        const visivel = entradas.find((e) => e.isIntersecting);
        if (visivel) setAtual(visivel.target.id);
      },
      { rootMargin: "-10% 0px -80% 0px" }
    );

    for (const { id } of secoes) {
      const elemento = document.getElementById(id);
      if (elemento) observador.observe(elemento);
    }

    return () => observador.disconnect();
  }, [secoes]);

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_14rem] lg:gap-12">
      <article className="min-w-0">
        <header className="mb-8 border-b pb-6">
          <h1 className="text-3xl font-semibold tracking-tight">{titulo}</h1>
          <p className="text-muted-foreground mt-2 text-sm">{subtitulo}</p>
        </header>

        <div className="text-base leading-[1.75] [&_p]:mb-4">{introducao}</div>

        {secoes.map(({ id, titulo: tituloDaSecao, conteudo }, i) => (
          <section
            key={id}
            id={id}
            // O deslocamento evita que o título fique colado no topo ao
            // navegar pelo índice.
            className="scroll-mt-8 border-t pt-8 pb-2 first-of-type:mt-8"
          >
            <h2 className="mb-4 flex items-baseline gap-3 text-xl font-semibold tracking-tight">
              <span className="text-primary text-base tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              {tituloDaSecao}
            </h2>
            <div className="text-[0.95rem] leading-[1.75] [&_li]:mb-2 [&_p]:mb-4 [&_strong]:font-semibold [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
              {conteudo}
            </div>
          </section>
        ))}
      </article>

      <nav aria-label="Nesta página" className="hidden lg:block">
        <div className="sticky top-8">
          <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
            Nesta página
          </p>
          <ol className="space-y-1 border-l text-sm">
            {secoes.map(({ id, titulo: tituloDaSecao }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  aria-current={atual === id ? "location" : undefined}
                  className={cn(
                    "-ml-px block border-l-2 py-1 pl-3 transition-colors",
                    atual === id
                      ? "border-primary text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground border-transparent"
                  )}
                >
                  {tituloDaSecao}
                </a>
              </li>
            ))}
          </ol>
        </div>
      </nav>
    </div>
  );
}
