import Image from "next/image";
import { cn } from "@/lib/utils";

const PROPORCAO = 603 / 109;

type LogoProps = {
  variante?: "azul" | "branca";
  altura?: number;
  className?: string;
};

export function Logo({ variante = "azul", altura = 32, className }: LogoProps) {
  const src =
    variante === "branca"
      ? "/logo-checkroom-branca.svg"
      : "/logo-checkroom-azul.svg";

  return (
    <Image
      src={src}
      alt="CheckRoom"
      height={altura}
      width={Math.round(altura * PROPORCAO)}
      className={cn("h-auto", className)}
      priority
    />
  );
}
