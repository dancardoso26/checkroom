import { redirect } from "next/navigation";

/**
 * Raiz do sistema.
 *
 * Até aqui esta página exibia uma amostra da identidade visual, usada para
 * conferir que a paleta, a tipografia e o logo estavam aplicados. Aquilo era
 * andaime de setup: agora existe tela de verdade, e uma página que não leva a
 * lugar nenhum é o primeiro lugar onde alguém abre o sistema.
 *
 * O redirecionamento é assumidamente temporário. O painel com indicadores de
 * ocupação é uma das entregas seguintes e vai ocupar esta rota; quando isso
 * acontecer, a linha abaixo dá lugar ao componente do painel.
 *
 * redirect() do next/navigation funciona no servidor: a resposta já sai como um
 * redirecionamento HTTP, sem que o navegador chegue a renderizar esta página e
 * navegar em seguida.
 */
export default function Home() {
  redirect("/reservas");
}
