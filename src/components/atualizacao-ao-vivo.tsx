"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type TabelaAoVivo = "bookings" | "lectures" | "lecture_enrollments" | "tickets";

const ESPERA_EM_MS = 400;

export function AtualizacaoAoVivo({ tabelas }: { tabelas: TabelaAoVivo[] }) {
  const router = useRouter();
  const chave = [...tabelas].sort().join(",");
  const [conectado, setConectado] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let agendada: ReturnType<typeof setTimeout> | null = null;

    const atualizar = () => {
      if (agendada) clearTimeout(agendada);
      agendada = setTimeout(() => router.refresh(), ESPERA_EM_MS);
    };

    let canal = supabase.channel(`ao-vivo:${chave}:${crypto.randomUUID()}`);
    for (const tabela of chave.split(",")) {
      canal = canal.on(
        "postgres_changes",
        { event: "*", schema: "public", table: tabela },
        atualizar,
      );
    }
    canal.subscribe((status) => setConectado(status === "SUBSCRIBED"));

    const aoVoltar = () => {
      if (document.visibilityState === "visible") atualizar();
    };
    document.addEventListener("visibilitychange", aoVoltar);

    return () => {
      if (agendada) clearTimeout(agendada);
      document.removeEventListener("visibilitychange", aoVoltar);
      void supabase.removeChannel(canal);
    };
  }, [chave, router]);

  return <span hidden data-ao-vivo={conectado ? "conectado" : "desconectado"} />;
}
