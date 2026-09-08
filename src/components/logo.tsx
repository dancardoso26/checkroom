import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Logo do CheckRoom.
 *
 * Existe como componente, e não como <img> espalhada pelas telas, para que
 * qualquer ajuste futuro (troca do arquivo, mudança de tamanho padrão, versão
 * nova da marca) aconteça em um lugar só.
 *
 * Duas variações, conforme definido na seção 9 da IDV:
 *   - "azul"   para uso sobre fundo claro, que é o caso da maior parte do sistema
 *   - "branca" para uso sobre o azul da marca, como em cabeçalhos preenchidos
 *
 * O SVG original tem 603x109, proporção de aproximadamente 5.53 para 1. A
 * altura é o parâmetro controlado e a largura é calculada a partir dela, para
 * a marca nunca aparecer distorcida.
 */

const PROPORCAO = 603 / 109;

type LogoProps = {
  /** Variação de cor. Use "branca" apenas sobre fundos escuros. */
  variante?: "azul" | "branca";
  /** Altura em pixels. A largura é derivada da proporção original. */
  altura?: number;
  className?: string;
};

export function Logo({
  variante = "azul",
  altura = 32,
  className,
}: LogoProps) {
  const src =
    variante === "branca"
      ? "/logo-checkroom-branca.svg"
      : "/logo-checkroom-azul.svg";

  return (
    <Image
      src={src}
      // O texto alternativo descreve a marca, não o arquivo. É o que o leitor
      // de tela anuncia no lugar da imagem.
      alt="CheckRoom"
      height={altura}
      width={Math.round(altura * PROPORCAO)}
      className={cn("h-auto", className)}
      // A marca aparece no cabeçalho, ou seja, acima da dobra em toda página.
      // "priority" evita que ela seja carregada com atraso.
      priority
    />
  );
}
