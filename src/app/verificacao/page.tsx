import { TelaDeEntrada } from "@/components/tela-de-entrada";
import { VoltarAoLogin } from "./voltar-ao-login";
import { SegundoFator } from "./segundo-fator";

export const metadata = { title: "Verificação em duas etapas | CheckRoom" };

export default function VerificacaoPage() {
  return (
    <TelaDeEntrada
      titulo="Verificação em duas etapas"
      descricao="Abra seu aplicativo autenticador e informe o código gerado."
    >
      <SegundoFator cadastrando={false} />
      <VoltarAoLogin />
    </TelaDeEntrada>
  );
}
