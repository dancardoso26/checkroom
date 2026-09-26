import Link from "next/link";

import { VERSAO_DA_POLITICA, VIGENTE_DESDE } from "@/lib/documentos";

import { Documento, type Secao } from "../documento";
import { TabelaDoDocumento } from "../tabela-do-documento";

export const metadata = { title: "Política de Privacidade | CheckRoom" };

const CANAL = "privacidade@checkroom.com.br";

const linkDoCanal = (
  <a
    href={`mailto:${CANAL}`}
    className="text-primary underline underline-offset-2"
  >
    {CANAL}
  </a>
);

const SECOES: Secao[] = [
  {
    id: "responsavel",
    titulo: "Quem é responsável pelos dados",
    conteudo: (
      <>
        <p>
          O CheckRoom é um protótipo acadêmico, desenvolvido por Daniel Cardoso
          Leão como Projeto Final de Curso do Bacharelado em Sistemas de
          Informação da Universidade de Mogi das Cruzes. Enquanto o sistema
          existir como projeto acadêmico, o autor é o responsável pelo
          tratamento dos dados descritos aqui.
        </p>
        <p>
          Numa implantação real, a responsável seria a instituição de ensino que
          adotasse o sistema, porque é ela quem decide para que os dados são
          usados.
        </p>
      </>
    ),
  },
  {
    id: "dados",
    titulo: "Quais dados são tratados, e por quê",
    conteudo: (
      <>
        <TabelaDoDocumento
          colunas={["Dado", "Para quê", "Base legal (LGPD, art. 7º)"]}
          linhas={[
            [
              "Nome e e-mail",
              "Identificar quem usa o sistema, enviar o convite, permitir a recuperação de senha e avisar sobre reservas feitas ou canceladas em seu nome.",
              "Execução de contrato (inciso V)",
            ],
            [
              "Senha",
              "Autenticar o acesso. É guardada apenas como resumo criptográfico, nunca em texto legível.",
              "Execução de contrato (inciso V)",
            ],
            [
              "Segredo do segundo fator",
              "Gerar e conferir os códigos do aplicativo autenticador em cada acesso.",
              "Legítimo interesse em segurança (inciso IX)",
            ],
            [
              "Perfil e vínculo docente",
              "Definir o que cada pessoa pode fazer e conferir se uma aula é reservada por quem leciona a disciplina para aquela turma.",
              "Execução de contrato (inciso V)",
            ],
            [
              "Reservas",
              "Espaço, data, horário, título, turma, disciplina e, no cancelamento, o motivo. Servem para organizar o uso dos espaços e evitar conflitos.",
              "Execução de contrato (inciso V)",
            ],
            [
              "Registros de acesso",
              "Data e hora do último acesso, e o endereço IP e o navegador registrados pelo serviço de autenticação. Servem para proteger as contas e investigar acessos indevidos.",
              "Legítimo interesse em segurança (inciso IX)",
            ],
            [
              "Trilha de auditoria",
              "Quem fez o quê e quando: entradas, saídas, tentativas de acesso recusadas (com o e-mail digitado), reservas e gestão de usuários. Serve para rastrear as operações.",
              "Legítimo interesse em rastreabilidade (inciso IX)",
            ],
          ]}
        />
        <p>
          <strong>O que o sistema não coleta.</strong> Não há dados pessoais
          sensíveis (LGPD, art. 5º, II), nem CPF, data de nascimento, endereço,
          telefone, fotografia ou documentos. Os alunos não são cadastrados
          individualmente: cada turma guarda apenas a quantidade de alunos,
          usada para conferir se o espaço comporta a turma.
        </p>
        <p>
          <strong>Cookies.</strong> O sistema usa apenas os cookies que mantêm a
          sessão aberta depois do login. Não há cookies de análise, de
          publicidade ou de terceiros.
        </p>
      </>
    ),
  },
  {
    id: "compartilhamento",
    titulo: "Com quem os dados são compartilhados",
    conteudo: (
      <>
        <p>
          O CheckRoom não vende nem cede dados pessoais. Três empresas processam
          dados em nome do sistema, apenas para prestar o serviço contratado:
        </p>
        <TabelaDoDocumento
          colunas={["Empresa", "O que faz", "O que recebe"]}
          linhas={[
            [
              "Supabase",
              "Banco de dados e autenticação, na região de São Paulo.",
              "Todos os dados da seção 2.",
            ],
            [
              "Resend",
              "Envio de e-mails a partir do domínio checkroom.com.br, pela região de São Paulo.",
              "O e-mail do destinatário e o conteúdo da mensagem: os dados da reserva, o convite ou o link de recuperação de senha.",
            ],
            [
              "Vercel",
              "Hospedagem da aplicação, quando ela for publicada.",
              "Os dados que trafegam nas requisições.",
            ],
          ]}
        />
      </>
    ),
  },
  {
    id: "transferencia",
    titulo: "Transferência internacional",
    conteudo: (
      <p>
        O banco de dados e o envio de e-mail funcionam em servidores no Brasil.
        As três empresas, porém, têm sede nos Estados Unidos, e a hospedagem da
        aplicação poderá processar requisições fora do país, conforme a região
        escolhida na publicação. Nesses casos, a transferência se apoia nas
        cláusulas contratuais de proteção de dados oferecidas por essas
        empresas.
      </p>
    ),
  },
  {
    id: "retencao",
    titulo: "Por quanto tempo os dados ficam guardados",
    conteudo: (
      <TabelaDoDocumento
        colunas={["Dado", "Prazo", "Depois do prazo"]}
        linhas={[
          [
            "Conta e perfil",
            "Enquanto a conta existir.",
            "Anonimizados quando a conta é cancelada.",
          ],
          [
            "Reservas",
            "Até o fim do projeto acadêmico.",
            "Excluídas. Se a conta for cancelada antes, ficam sem ligação com a pessoa.",
          ],
          [
            "Trilha de auditoria",
            "Até o fim do projeto acadêmico.",
            "Excluída. Se a conta for cancelada antes, o e-mail da pessoa é apagado dos registros.",
          ],
          [
            "Registros de acesso",
            "Conforme a retenção do serviço de autenticação, limitada ao fim do projeto.",
            "Excluídos.",
          ],
          [
            "Dados de demonstração",
            "Até o fim do projeto acadêmico.",
            "Excluídos.",
          ],
        ]}
      />
    ),
  },
  {
    id: "direitos",
    titulo: "Seus direitos e como exercê-los",
    conteudo: (
      <>
        <p>
          A LGPD (art. 18) garante a você confirmar se seus dados são tratados,
          acessá-los, corrigi-los, pedir a anonimização ou a eliminação, a
          portabilidade, saber com quem são compartilhados e se opor ao
          tratamento. No CheckRoom:
        </p>
        <TabelaDoDocumento
          colunas={["Direito", "Como exercer"]}
          linhas={[
            [
              "Acesso",
              "Em Minha conta, com os seus dados e a data em que aceitou os termos.",
            ],
            [
              "Correção",
              "Pedindo à administração do sistema, porque nome e vínculo docente são dados institucionais.",
            ],
            [
              "Eliminação",
              "Em Minha conta, pelo botão Cancelar conta, sem precisar pedir a ninguém.",
            ],
            [
              "Portabilidade, oposição e demais pedidos",
              <>Pelo e-mail {linkDoCanal}, com resposta em até 15 dias.</>,
            ],
          ]}
        />
        <p>
          <strong>O que o cancelamento apaga.</strong> O nome é substituído em
          todo o sistema, o cadastro de docente ligado à conta é anonimizado, o
          e-mail é apagado da trilha de auditoria, as reservas futuras são
          canceladas e o acesso é encerrado. As reservas já realizadas e os
          registros de auditoria continuam existindo, porque documentam o uso
          dos espaços, mas nada neles permite mais identificar a pessoa.
        </p>
        <p>
          <strong>Decisões automatizadas.</strong> O CheckRoom sugere o espaço
          mais adequado para cada reserva, mas a escolha final é sempre de quem
          reserva. O sistema não toma decisões automatizadas sobre pessoas, no
          sentido do art. 20 da LGPD.
        </p>
      </>
    ),
  },
  {
    id: "seguranca",
    titulo: "Como os dados são protegidos",
    conteudo: (
      <ul>
        <li>Senhas guardadas apenas como resumo criptográfico com sal.</li>
        <li>Segundo fator obrigatório, por aplicativo autenticador.</li>
        <li>
          Comunicação sempre criptografada (HTTPS) e banco de dados
          criptografado nos servidores.
        </li>
        <li>
          Permissões conferidas pela aplicação e, de novo, pelo próprio banco de
          dados, que limita quais registros cada pessoa alcança.
        </li>
        <li>
          Chaves de acesso aos serviços externos guardadas só no servidor, nunca
          enviadas ao navegador.
        </li>
      </ul>
    ),
  },
  {
    id: "incidentes",
    titulo: "Incidentes de segurança",
    conteudo: (
      <p>
        Se houver um incidente que possa causar risco ou dano relevante, o
        procedimento é conter o problema, identificar os dados e as pessoas
        afetadas, avaliar o risco, comunicar a Autoridade Nacional de Proteção
        de Dados e as pessoas afetadas quando exigido (LGPD, art. 48), e
        registrar as medidas tomadas.
      </p>
    ),
  },
  {
    id: "contato",
    titulo: "Contato",
    conteudo: (
      <>
        <p>
          Pedidos sobre dados pessoais, dúvidas sobre esta política e relatos de
          problemas de privacidade: {linkDoCanal}.
        </p>
        <p>
          Por ser um projeto acadêmico sem fins lucrativos, o CheckRoom se
          enquadra como agente de tratamento de pequeno porte e está dispensado
          de indicar um encarregado de dados, conforme a Resolução CD/ANPD nº 2,
          de 2022. Este endereço é o canal de comunicação que a mesma resolução
          exige.
        </p>
      </>
    ),
  },
  {
    id: "alteracoes",
    titulo: "Alterações nesta política",
    conteudo: (
      <p>
        Quando esta política mudar, a nova versão ganha um número e uma data,
        indicados no topo desta página, e o sistema pede que você leia a nova
        versão no primeiro acesso depois da mudança. Os{" "}
        <Link
          href="/termos"
          className="text-primary underline underline-offset-2"
        >
          Termos de Uso
        </Link>{" "}
        seguem a mesma regra.
      </p>
    ),
  },
];

export default function PrivacidadePage() {
  return (
    <Documento
      titulo="Política de Privacidade"
      subtitulo={`Versão ${VERSAO_DA_POLITICA}, vigente desde ${VIGENTE_DESDE}.`}
      introducao={
        <p>
          Esta política explica quais dados pessoais o CheckRoom trata, para
          quê, com quem os compartilha, por quanto tempo os guarda e como você
          exerce os seus direitos. Ela descreve o que o sistema faz hoje: quando
          uma funcionalidade nova mudar esse tratamento, a política muda junto.
        </p>
      }
      secoes={SECOES}
    />
  );
}
