"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

// A busca vai para a URL, e não fica só na tela: o link copiado leva junto o
// filtro, e recarregar a página não o perde.
export function BuscaNaAuditoria() {
  const router = useRouter();
  const caminho = usePathname();
  const parametros = useSearchParams();
  const [texto, setTexto] = useState(parametros.get("q") ?? "");

  // Espera a pessoa parar de digitar: uma navegação por tecla recarregaria a
  // trilha inteira a cada letra.
  useEffect(() => {
    const atual = parametros.get("q") ?? "";
    if (texto.trim() === atual) return;

    const espera = setTimeout(() => {
      // Mantém o tamanho da página escolhido; a página em si volta à primeira.
      const novos = new URLSearchParams();
      const porPagina = parametros.get("porPagina");
      if (porPagina) novos.set("porPagina", porPagina);
      if (texto.trim()) novos.set("q", texto.trim());
      router.replace(novos.size ? `${caminho}?${novos}` : caminho, {
        scroll: false,
      });
    }, 300);

    return () => clearTimeout(espera);
  }, [texto, parametros, caminho, router]);

  return (
    <div className="relative w-full sm:w-72">
      <Search
        aria-hidden
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
      />
      <Input
        type="search"
        aria-label="Pesquisar na trilha de auditoria"
        placeholder="Pesquisar"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        className="bg-card pl-8"
      />
    </div>
  );
}
