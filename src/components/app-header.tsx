import Link from "next/link";

import { Logo } from "@/components/logo";
import { MenuDoUsuario } from "@/components/menu-do-usuario";
import { sessaoAtual } from "@/lib/sessao";
import { podeVerAuditoria } from "@/domain/auth/permissoes";

export async function AppHeader() {
  const sessao = await sessaoAtual();

  return (
    // O <header> não é escolha estética: é o que permite a um leitor de tela
    // reconhecer esta faixa como o cabeçalho e saltá-la.
    <header className="bg-card border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" aria-label="Página inicial do CheckRoom">
          <Logo altura={28} />
        </Link>

        {sessao && (
          <MenuDoUsuario
            nome={sessao.nome}
            papel={sessao.papel}
            mostrarAuditoria={podeVerAuditoria(sessao)}
          />
        )}
      </div>
    </header>
  );
}
