import Link from "next/link";

import { VERSAO_DOS_TERMOS, VIGENTE_DESDE } from "@/lib/documentos";

import { Documento, type Secao } from "../documento";
import { TabelaDoDocumento } from "../tabela-do-documento";

export const metadata = { title: "Termos de Uso | CheckRoom" };

const SECOES: Secao[] = [
  {
    id: "o-que-e",
    titulo: "O que é o CheckRoom",
    conteudo: (
      <>
        <p>
          O CheckRoom é um sistema de reserva de espaços acadêmicos: salas de
          aula, laboratórios e auditórios. Antes de confirmar uma reserva, ele
          verifica automaticamente se o horário está livre para o espaço, para o
          professor e para a turma, se o espaço comporta a turma e tem os
          equipamentos pedidos, e se o professor leciona a disciplina para
          aquela turma.
        </p>
        <p>
          É um protótipo acadêmico, desenvolvido como Projeto Final de Curso do
          Bacharelado em Sistemas de Informação da Universidade de Mogi das
          Cruzes. Não é um produto comercial, não tem garantia de
          disponibilidade e pode ser alterado ou interrompido a qualquer
          momento.
        </p>
      </>
    ),
  },
  {
    id: "quem-pode-usar",
    titulo: "Quem pode usar",
    conteudo: (
      <>
        <p>
          O acesso é restrito a pessoas convidadas pela administração do
          sistema. Não existe cadastro aberto: a conta é criada por convite
          enviado ao e-mail da pessoa, e o perfil de acesso é definido por quem
          convida, nunca por quem é convidado.
        </p>
        <p>
          Ao receber o convite, a pessoa cria a própria senha, cadastra o
          segundo fator de autenticação e aceita estes termos. Só então passa a
          usar o sistema.
        </p>
      </>
    ),
  },
  {
    id: "sua-conta",
    titulo: "Sua conta",
    conteudo: (
      <>
        <p>
          A conta é pessoal e intransferível. O acesso exige a senha e um código
          gerado por um aplicativo autenticador no seu celular. Você é
          responsável por manter os dois sob seu controle e por avisar a
          administração se suspeitar que alguém obteve acesso.
        </p>
        <p>
          Tudo o que é feito com a sua conta fica registrado em seu nome na
          trilha de auditoria. Por isso, emprestar a senha ou o autenticador a
          outra pessoa não é permitido.
        </p>
      </>
    ),
  },
  {
    id: "perfis",
    titulo: "Perfis e permissões",
    conteudo: (
      <>
        <p>O que cada perfil pode fazer nesta versão do sistema:</p>
        <TabelaDoDocumento
          colunas={["Perfil", "Pode"]}
          linhas={[
            [
              "Professor",
              "Consultar a agenda, reservar espaços em seu próprio nome e cancelar ou excluir as reservas que são suas ou que registrou.",
            ],
            [
              "Administrador",
              "Tudo o que o professor faz, em nome de qualquer docente, além de gerenciar usuários e consultar a trilha de auditoria.",
            ],
            [
              "Aluno e Equipe de TI",
              "Consultar a agenda. As funções próprias desses perfis, como inscrição em palestras e chamados de manutenção, fazem parte das próximas etapas do projeto.",
            ],
          ]}
        />
        <p>
          Um dos administradores é o <strong>administrador master</strong>,
          responsável pelo sistema. A conta dele não pode ser cancelada,
          desativada nem ter o perfil alterado, para que o sistema nunca fique
          sem quem o administre.
        </p>
        <p>
          Essas permissões são aplicadas pelo servidor e pelo banco de dados, e
          não apenas pela interface. Tentar contorná-las é uso indevido.
        </p>
      </>
    ),
  },
  {
    id: "uso-adequado",
    titulo: "Uso adequado",
    conteudo: (
      <>
        <p>Ao usar o CheckRoom, você se compromete a não:</p>
        <ul>
          <li>reservar espaços em nome de outra pessoa sem autorização;</li>
          <li>
            registrar reservas fictícias para bloquear espaços que não serão
            usados;
          </li>
          <li>
            tentar acessar dados, telas ou operações que seu perfil não permite;
          </li>
          <li>
            interferir no funcionamento do sistema ou explorar falhas, em vez de
            relatá-las à administração.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "conteudo",
    titulo: "O que você escreve no sistema",
    conteudo: (
      <p>
        Os textos que você escreve, como o título de uma reserva ou o motivo de
        um cancelamento, ficam visíveis para todas as pessoas com acesso à
        agenda, e o motivo do cancelamento também é enviado por e-mail ao
        professor da reserva. Não inclua neles informações pessoais
        desnecessárias, de outras pessoas ou de natureza sensível.
      </p>
    ),
  },
  {
    id: "disponibilidade",
    titulo: "Disponibilidade e suporte",
    conteudo: (
      <p>
        O CheckRoom depende de serviços de terceiros para banco de dados,
        autenticação, hospedagem e envio de e-mail. Falhas nesses serviços
        afetam o sistema, e não há compromisso de tempo de resposta ou de
        recuperação. Por ser um projeto acadêmico, o suporte se limita ao
        período do curso.
      </p>
    ),
  },
  {
    id: "encerramento",
    titulo: "Cancelamento da conta",
    conteudo: (
      <>
        <p>
          Você pode cancelar a sua conta a qualquer momento, em Minha conta. O
          cancelamento encerra o acesso, cancela as suas reservas futuras e
          remove os dados que identificam você, conforme descrito na{" "}
          <Link
            href="/privacidade"
            className="text-primary underline underline-offset-2"
          >
            Política de Privacidade
          </Link>
          .
        </p>
        <p>
          A administração também pode desativar ou cancelar contas de pessoas
          que deixem de ter vínculo com a instituição ou que descumpram estes
          termos.
        </p>
      </>
    ),
  },
  {
    id: "responsabilidade",
    titulo: "Responsabilidade",
    conteudo: (
      <p>
        Estes termos não retiram direitos garantidos por lei. Como protótipo
        acadêmico oferecido sem custo, o CheckRoom não responde por perdas
        causadas por indisponibilidade ou por erros de agendamento. A decisão
        final sobre o uso de um espaço continua sendo da instituição.
      </p>
    ),
  },
  {
    id: "alteracoes",
    titulo: "Alterações e legislação",
    conteudo: (
      <p>
        Quando estes termos mudarem, a nova versão ganha um número e uma data,
        indicados no topo desta página, e o sistema pede um novo aceite no
        primeiro acesso depois da mudança. Aplica-se a legislação brasileira.
      </p>
    ),
  },
];

export default function TermosPage() {
  return (
    <Documento
      titulo="Termos de Uso"
      subtitulo={`Versão ${VERSAO_DOS_TERMOS}, vigente desde ${VIGENTE_DESDE}.`}
      introducao={
        <p>
          Estes termos explicam o que o CheckRoom faz e as regras para usá-lo.
          Como o sistema trata os seus dados pessoais está descrito na{" "}
          <Link
            href="/privacidade"
            className="text-primary underline underline-offset-2"
          >
            Política de Privacidade
          </Link>
          , que é um documento à parte.
        </p>
      }
      secoes={SECOES}
    />
  );
}
