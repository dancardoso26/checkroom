import Image from "next/image";
import { cn } from "@/lib/utils";

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
