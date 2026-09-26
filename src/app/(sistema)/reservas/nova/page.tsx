import { redirect } from "next/navigation";

// O formulário vive agora num painel da agenda. A rota continua existindo para
// que links e favoritos antigos não caiam numa página de erro.
export default function NovaReservaPage() {
  redirect("/reservas?nova=1");
}
