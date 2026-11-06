"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { CampoDePesquisa } from "@/components/campo-de-pesquisa";
import {
  FiltroMultiplo,
  type OpcaoDoFiltro,
} from "@/components/filtro-multiplo";

const PARAMETROS_DOS_FILTROS = ["acao", "usuario"] as const;
const PARAMETROS_DA_ORDEM = ["ordenar", "sentido"] as const;

function lerLista(valor: string | null): string[] {
  return valor ? valor.split(",").filter(Boolean) : [];
}

export function BarraDaAuditoria({
  acoes,
  usuarios,
}: {
  acoes: OpcaoDoFiltro[];
  usuarios: OpcaoDoFiltro[];
}) {
  const router = useRouter();
  const caminho = usePathname();
  const parametros = useSearchParams();
  const [texto, setTexto] = useState(parametros.get("q") ?? "");

  function ir(novos: URLSearchParams) {
    router.replace(novos.size ? `${caminho}?${novos}` : caminho, {
      scroll: false,
    });
  }

  function comFiltro(
    nome: (typeof PARAMETROS_DOS_FILTROS)[number],
    valor: string[],
  ) {
    const novos = new URLSearchParams();
    const porPagina = parametros.get("porPagina");
    if (porPagina) novos.set("porPagina", porPagina);
    const q = parametros.get("q");
    if (q) novos.set("q", q);
    for (const chave of PARAMETROS_DA_ORDEM) {
      const valor = parametros.get(chave);
      if (valor) novos.set(chave, valor);
    }
    for (const chave of PARAMETROS_DOS_FILTROS) {
      const lista = chave === nome ? valor : lerLista(parametros.get(chave));
      if (lista.length > 0) novos.set(chave, lista.join(","));
    }
    ir(novos);
  }

  useEffect(() => {
    const atual = parametros.get("q") ?? "";
    if (texto.trim() === atual) return;

    const espera = setTimeout(() => {
      const novos = new URLSearchParams();
      const porPagina = parametros.get("porPagina");
      if (porPagina) novos.set("porPagina", porPagina);
      for (const chave of [...PARAMETROS_DOS_FILTROS, ...PARAMETROS_DA_ORDEM]) {
        const valor = parametros.get(chave);
        if (valor) novos.set(chave, valor);
      }
      if (texto.trim()) novos.set("q", texto.trim());
      router.replace(novos.size ? `${caminho}?${novos}` : caminho, {
        scroll: false,
      });
    }, 300);

    return () => clearTimeout(espera);
  }, [texto, parametros, caminho, router]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <CampoDePesquisa
        valor={texto}
        onMudar={setTexto}
        rotulo="Pesquisar no log de auditoria"
        className="sm:w-72"
      />

      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        <FiltroMultiplo
          rotulo="Usuário"
          opcoes={usuarios}
          valor={lerLista(parametros.get("usuario"))}
          onChange={(valor) => comFiltro("usuario", valor)}
        />
        <FiltroMultiplo
          rotulo="Ação"
          opcoes={acoes}
          valor={lerLista(parametros.get("acao"))}
          onChange={(valor) => comFiltro("acao", valor)}
        />
      </div>
    </div>
  );
}
