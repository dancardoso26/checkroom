import Link from "next/link";
import { Logo } from "@/components/logo";

export function AppHeader() {
  return (
    // O <header> não é escolha estética: é o que permite a um leitor de tela
    // reconhecer esta faixa como o cabeçalho e saltá-la.
    <header className="bg-card border-b">
      <div className="mx-auto flex max-w-5xl items-center px-6 py-4">
        <Link href="/" aria-label="Página inicial do CheckRoom">
          <Logo altura={28} />
        </Link>
      </div>
    </header>
  );
}
