import { redirect } from "next/navigation";

// A tela de configurações é o submenu; abrir a raiz leva à primeira opção.
export default function ConfiguracoesPage() {
  redirect("/configuracoes/usuarios");
}
