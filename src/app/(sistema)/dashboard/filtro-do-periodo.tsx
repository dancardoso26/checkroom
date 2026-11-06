"use client";

import { useRouter } from "next/navigation";

import { SeletorDePeriodo } from "@/components/seletor-de-periodo";

import { enderecoDoPainel, type AbaDoPainel } from "./abas";

export function FiltroDoPeriodo({
  aba,
  de,
  ate,
  hoje,
}: {
  aba: AbaDoPainel;
  de: string;
  ate: string;
  hoje: string;
}) {
  const router = useRouter();

  return (
    <SeletorDePeriodo
      de={de}
      ate={ate}
      hoje={hoje}
      onAplicar={(periodo) =>
        router.replace(enderecoDoPainel(aba, periodo.de, periodo.ate))
      }
    />
  );
}
