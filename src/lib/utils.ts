import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Junta classes CSS resolvendo conflitos do Tailwind.
 *
 * O problema que esta função resolve: em Tailwind, se um elemento receber
 * "p-2" e "p-4" ao mesmo tempo, qual vence depende da ordem em que as classes
 * foram geradas no arquivo CSS, não da ordem em que foram escritas no JSX.
 * Isso torna imprevisível sobrescrever o estilo de um componente.
 *
 * O twMerge entende a semântica das classes do Tailwind e mantém apenas a
 * última de cada categoria, então "p-2 p-4" vira "p-4". O clsx, por sua vez,
 * cuida das classes condicionais, ignorando valores falsos.
 *
 * É a função padrão do shadcn/ui, e todo componente dele depende dela.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
