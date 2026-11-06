export const ABAS_DO_PAINEL = [
  { id: "reservas", rotulo: "Reservas" },
  { id: "palestras", rotulo: "Palestras" },
  { id: "chamados", rotulo: "Chamados" },
] as const;

export type AbaDoPainel = (typeof ABAS_DO_PAINEL)[number]["id"];

export function lerAba(valor: string | undefined): AbaDoPainel {
  return ABAS_DO_PAINEL.find((a) => a.id === valor)?.id ?? "reservas";
}

export function enderecoDoPainel(aba: AbaDoPainel, de: string, ate: string): string {
  return `/dashboard?aba=${aba}&de=${de}&ate=${ate}`;
}
