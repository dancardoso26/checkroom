import { TelaDeEntrada } from "@/components/tela-de-entrada";
import { VoltarAoLogin } from "../voltar-ao-login";
import { SegundoFator } from "../segundo-fator";

export const metadata = { title: "Configurar verificação | CheckRoom" };

export default function ConfigurarVerificacaoPage() {
  return (
    <TelaDeEntrada
      titulo="Configurar verificação"
      descricao="Escaneie QR Code no seu aplicativo autenticador para concluir."
    >
      <SegundoFator cadastrando />
      <VoltarAoLogin />
    </TelaDeEntrada>
  );
}
