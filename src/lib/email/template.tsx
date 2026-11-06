import {
  Body,
  Button,
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
  link?: string;
};

type Acao = { rotulo: string; href: string };

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
const botao = {
  backgroundColor: "#2b5973",
  borderRadius: "6px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "14px",
  fontWeight: 600,
  padding: "10px 20px",
  textDecoration: "none",
};

function Linha({ termo, children }: { termo: string; children: string }) {
  return (
    <>
      <Text style={rotulo}>{termo}</Text>
      <Text style={valor}>{children}</Text>
    </>
  );
}

function EmailDoCheckRoom({
  assunto,
  frase,
  linhas,
  acao,
}: {
  assunto: string;
  frase: string;
  linhas: [string, string | null | undefined][];
  acao?: Acao;
}) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{assunto}</Preview>
      <Body style={corpo}>
        <Container style={caixa}>
          <Heading style={titulo}>{assunto}</Heading>

          <Text style={texto}>{frase}</Text>

          <Hr style={{ borderColor: "#e4e7eb", margin: "20px 0" }} />

          <Section>
            {linhas
              .filter((linha): linha is [string, string] => Boolean(linha[1]))
              .map(([termo, conteudo]) => (
                <Linha key={termo} termo={termo}>
                  {conteudo}
                </Linha>
              ))}
          </Section>

          {acao && (
            <Section style={{ margin: "8px 0 0" }}>
              <Button href={acao.href} style={botao}>
                {acao.rotulo}
              </Button>
            </Section>
          )}

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

export function EmailDeReserva({
  cancelada,
  dados,
}: {
  cancelada: boolean;
  dados: DadosDaReserva;
}) {
  return (
    <EmailDoCheckRoom
      assunto={
        cancelada
          ? "Sua reserva foi cancelada"
          : "Nova reserva registrada em seu nome"
      }
      frase={
        cancelada
          ? `${dados.professorNome}, a reserva abaixo foi cancelada e o horário voltou a ficar livre.`
          : `${dados.professorNome}, uma reserva foi registrada em seu nome no CheckRoom.`
      }
      linhas={[
        ["Atividade", dados.finalidade],
        ["Espaço", dados.espaco],
        ["Data e horário", dados.periodo],
        ["Turma", dados.turma],
        ["Registrada por", dados.registradoPor],
        ["Motivo do cancelamento", cancelada ? dados.motivo : null],
      ]}
      acao={
        !cancelada && dados.link
          ? { rotulo: "Ver reserva", href: dados.link }
          : undefined
      }
    />
  );
}

export type DadosDoChamadoResolvido = {
  solicitanteNome: string;
  espaco: string;
  descricao: string;
  nota: string;
  resolvidoPor: string;
  abertoEm: string;
};

export function EmailDeChamadoResolvido({
  dados,
}: {
  dados: DadosDoChamadoResolvido;
}) {
  return (
    <EmailDoCheckRoom
      assunto="Seu chamado foi resolvido"
      frase={`${dados.solicitanteNome}, a equipe de TI concluiu o atendimento do chamado abaixo.`}
      linhas={[
        ["Espaço", dados.espaco],
        ["Problema relatado", dados.descricao],
        ["Criado em", dados.abertoEm],
        ["Solução", dados.nota],
        ["Resolvido por", dados.resolvidoPor],
      ]}
    />
  );
}

export type DadosDaNovaPalestra = {
  titulo: string;
  palestrante: string;
  espaco: string;
  periodo: string;
  vagas: string;
  cursos: string;
  link: string;
};

export function EmailDeNovaPalestra({ dados }: { dados: DadosDaNovaPalestra }) {
  return (
    <EmailDoCheckRoom
      assunto={`Nova palestra: ${dados.titulo}`}
      frase="Uma palestra foi cadastrada para o seu curso. A inscrição é feita no CheckRoom, enquanto houver vagas."
      linhas={[
        ["Palestra", dados.titulo],
        ["Palestrante", dados.palestrante],
        ["Data e horário", dados.periodo],
        ["Espaço", dados.espaco],
        ["Vagas", dados.vagas],
        ["Cursos", dados.cursos],
      ]}
      acao={{ rotulo: "Ver palestra", href: dados.link }}
    />
  );
}
