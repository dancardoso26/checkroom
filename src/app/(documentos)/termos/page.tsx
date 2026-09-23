import { VERSAO_DOS_TERMOS, VIGENTE_DESDE } from "@/lib/documentos";

export const metadata = { title: "Termos de Uso | CheckRoom" };

export default function TermosPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Termos de Uso</h1>
      <p className="text-muted-foreground mt-1 mb-8 text-xs">
        Versão {VERSAO_DOS_TERMOS}, vigente desde {VIGENTE_DESDE}.
      </p>

      <p>
        Estes termos regulam o uso do CheckRoom. Eles tratam do que o serviço
        faz e do que se espera de quem o usa. O tratamento de dados pessoais é
        assunto da Política de Privacidade, que é documento separado e não é
        substituído por este.
      </p>

      <h2>1. O que é o CheckRoom</h2>

      <p>
        O CheckRoom é um sistema de gestão de espaços e eventos acadêmicos.
        Permite reservar salas, laboratórios e auditórios para atividades de
        ensino, verificando automaticamente conflitos de horário, capacidade do
        espaço, recursos disponíveis e vínculo do professor com a disciplina e a
        turma.
      </p>

      <p>
        É um protótipo acadêmico, desenvolvido como Projeto Final de Curso. Não
        é um produto comercial, não tem garantia de disponibilidade e pode ser
        alterado ou interrompido a qualquer momento, inclusive durante a
        avaliação do trabalho.
      </p>

      <h2>2. Quem pode usar</h2>

      <p>
        O acesso é destinado a professores e à administração de uma instituição
        de ensino superior. As contas são criadas pela instituição, não por
        autocadastro: não há como se inscrever sozinho, e ninguém escolhe o
        próprio papel no sistema.
      </p>

      <h2>3. Sua conta</h2>

      <p>
        A conta é pessoal e intransferível. O acesso exige senha e um segundo
        fator gerado por aplicativo autenticador. Você é responsável por manter
        ambos sob seu controle e por avisar a instituição se suspeitar que
        alguém obteve acesso.
      </p>

      <p>
        Ações realizadas com sua conta são registradas como suas na trilha de
        auditoria. Compartilhar credenciais compromete essa rastreabilidade e
        não é permitido.
      </p>

      <h2>4. Papéis e permissões</h2>

      <ul>
        <li>
          <strong>Professor</strong> reserva espaços em seu próprio nome, e pode
          cancelar ou excluir as reservas que são suas ou que registrou.
        </li>
        <li>
          <strong>Administração</strong> reserva em nome de qualquer docente,
          gerencia qualquer reserva e consulta a trilha de auditoria.
        </li>
      </ul>

      <p>
        Essas regras são aplicadas pelo servidor e pelo banco de dados, não
        apenas pela interface. Tentar contorná-las manipulando requisições é uso
        indevido.
      </p>

      <h2>5. Uso adequado</h2>

      <p>Ao usar o CheckRoom, você concorda em não:</p>

      <ul>
        <li>reservar espaços em nome de outra pessoa sem autorização para isso;</li>
        <li>
          registrar reservas fictícias para bloquear espaços que não serão
          utilizados;
        </li>
        <li>
          tentar acessar dados, telas ou operações que seu papel não permite;
        </li>
        <li>
          interferir no funcionamento do sistema, sobrecarregá-lo ou explorar
          falhas em vez de reportá-las.
        </li>
      </ul>

      <h2>6. Conteúdo que você insere</h2>

      <p>
        Os textos que você escreve, como a finalidade de uma reserva ou o motivo
        de um cancelamento, ficam visíveis a outras pessoas autenticadas no
        sistema. Não inclua neles informações pessoais desnecessárias, de
        terceiros ou de natureza sensível.
      </p>

      <h2>7. Disponibilidade e suporte</h2>

      <p>
        O sistema depende de serviços de terceiros para banco de dados,
        hospedagem e envio de e-mail. Interrupções nesses serviços afetam o
        CheckRoom, e não há compromisso de tempo de resposta ou de recuperação.
        Sendo um projeto acadêmico, o suporte se limita ao período do curso.
      </p>

      <h2>8. Encerramento da conta</h2>

      <p>
        Você pode encerrar sua conta a qualquer momento pela tela de conta. Ao
        fazer isso, seu perfil é anonimizado, suas reservas futuras são
        canceladas e o acesso é encerrado.
      </p>

      <p>
        As reservas já realizadas permanecem como registro institucional de uso
        dos espaços, e os registros de auditoria permanecem para preservar a
        rastreabilidade, ambos sem vínculo com sua identidade. A instituição
        também pode encerrar contas de pessoas que deixem de ter vínculo com ela
        ou que descumpram estes termos.
      </p>

      <h2>9. Responsabilidade</h2>

      <p>
        Estes termos não retiram direitos assegurados por lei nem transferem a
        você a responsabilidade por falhas do sistema. Como protótipo acadêmico
        oferecido sem contrapartida, o CheckRoom não responde por perdas
        decorrentes de indisponibilidade ou de erros de agendamento, e a decisão
        final sobre o uso de um espaço continua sendo da instituição.
      </p>

      <h2>10. Alterações e foro</h2>

      <p>
        Alterações relevantes geram nova versão destes termos, com data indicada
        no topo, e o aceite é pedido novamente no acesso seguinte. Aplica-se a
        legislação brasileira.
      </p>
    </>
  );
}
