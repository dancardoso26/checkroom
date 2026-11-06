"use client";

import { useRouter } from "next/navigation";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ABAS_DO_PAINEL, enderecoDoPainel, type AbaDoPainel } from "./abas";

export function AbasDoPainel({
  aba,
  de,
  ate,
}: {
  aba: AbaDoPainel;
  de: string;
  ate: string;
}) {
  const router = useRouter();

  return (
    <Tabs
      value={aba}
      onValueChange={(valor) =>
        router.replace(enderecoDoPainel(valor as AbaDoPainel, de, ate))
      }
    >
      <TabsList>
        {ABAS_DO_PAINEL.map(({ id, rotulo }) => (
          <TabsTrigger key={id} value={id}>
            {rotulo}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
