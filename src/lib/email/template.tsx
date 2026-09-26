import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export type DadosDaReserva = {
  professorNome: string;
  finalidade: string;
  espaco: string;
  periodo: string;
  turma: string;
  registradoPor: string;
  motivo?: string | null;
};

const corpo = { backgroundColor: "#f6f8fa", fontFamily: "system-ui, sans-serif" };
const caixa = {
  backgroundColor: "#ffffff",
  border: "1px solid #e4e7eb",
  borderRadius: "8px",
  margin: "32px auto",
  maxWidth: "520px",
  padding: "32px",
};
const titulo = { fontSize: "18px", fontWeight: 600, margin: "0 0 16px" };
const texto = { color: "#3f4a56", fontSize: "14px", lineHeight: "22px", margin: "0 0 12px" };
const rotulo = { color: "#6b7785", fontSize: "12px", margin: "0 0 2px" };
const valor = { fontSize: "14px", fontWeight: 500, margin: "0 0 12px" };
const rodape = { color: "#8a95a1", fontSize: "12px", margin: 0 };

function Linha({ termo, children }: { termo: string; children: string }) {
  return (
    <>
      <Text style={rotulo}>{termo}</Text>
      <Text style={valor}>{children}</Text>
    </>
  );
}

// Um template para os dois avisos: o que muda entre criar e cancelar é o
// título e uma frase, não a estrutura.
export function EmailDeReserva({
  cancelada,
  dados,
}: {
  cancelada: boolean;
  dados: DadosDaReserva;
}) {
  const assunto = cancelada
    ? "Sua reserva foi cancelada"
    : "Nova reserva registrada em seu nome";

  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{`${assunto}: ${dados.finalidade}`}</Preview>
      <Body style={corpo}>
        <Container style={caixa}>
          <Heading style={titulo}>{assunto}</Heading>

          <Text style={texto}>
            {cancelada
              ? `${dados.professorNome}, a reserva abaixo foi cancelada e o horário voltou a ficar livre.`
              : `${dados.professorNome}, uma reserva foi registrada em seu nome no CheckRoom.`}
          </Text>

          <Hr style={{ borderColor: "#e4e7eb", margin: "20px 0" }} />

          <Section>
            <Linha termo="Atividade">{dados.finalidade}</Linha>
            <Linha termo="Espaço">{dados.espaco}</Linha>
            <Linha termo="Data e horário">{dados.periodo}</Linha>
            <Linha termo="Turma">{dados.turma}</Linha>
            <Linha termo="Registrada por">{dados.registradoPor}</Linha>
            {cancelada && dados.motivo && (
              <Linha termo="Motivo do cancelamento">{dados.motivo}</Linha>
            )}
          </Section>

          <Hr style={{ borderColor: "#e4e7eb", margin: "20px 0" }} />

          <Text style={rodape}>
            Mensagem automática do CheckRoom, sistema de gestão de espaços
            acadêmicos. Não responda a este e-mail.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
