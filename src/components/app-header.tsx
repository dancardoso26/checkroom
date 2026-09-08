import Link from "next/link";
import { Logo } from "@/components/logo";

/**
 * Cabeçalho do sistema.
 *
 * Fica em um componente próprio porque toda tela do CheckRoom o exibe, e porque
 * ele vai crescer nas próximas entregas: chamados, painel e, em 28/09, o menu
 * do usuário autenticado.
 *
 * POR QUE NÃO HÁ MENU DE NAVEGAÇÃO
 *
 * Havia um link para "Reservas", que foi removido. Com uma rota só, ele
 * apontava para a página em que o usuário já estava, e um item de menu que não
 * leva a lugar nenhum ensina a ignorar o menu.
 *
 * O logo continua sendo o caminho de volta, que é a convenção que as pessoas já
 * conhecem. O menu volta quando houver mais de um destino.
 */
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
