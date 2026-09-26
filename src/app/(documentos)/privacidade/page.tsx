import { VERSAO_DA_POLITICA, VIGENTE_DESDE } from "@/lib/documentos";

export const metadata = { title: "Política de Privacidade | CheckRoom" };

export default function PrivacidadePage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">
        Política de Privacidade
      </h1>
      <p className="text-muted-foreground mt-1 mb-8 text-xs">
        Versão {VERSAO_DA_POLITICA}, vigente desde {VIGENTE_DESDE}.
      </p>

      <p>
        Esta política descreve como o CheckRoom trata dados pessoais e
        corresponde ao que o sistema faz hoje, não ao que pretende fazer. Quando
        uma funcionalidade nova alterar esse tratamento, esta política muda
        junto e ganha nova versão.
      </p>

      <h2>1. Quem é responsável pelo tratamento</h2>

      <p>
        O CheckRoom é um protótipo acadêmico, desenvolvido como Projeto Final de
        Curso do Bacharelado em Sistemas de Informação da Universidade de Mogi
        das Cruzes. Numa implantação real, a controladora dos dados seria a
        instituição de ensino que adotasse o sistema, porque é ela quem decide
        as finalidades do tratamento. Enquanto o sistema existe como projeto
        acadêmico, o responsável é o autor do trabalho, que atende pelo canal
        indicado na seção 8.
      </p>

      <h2>2. Que dados são tratados, e por quê</h2>

      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b">
            <th className="py-2 pr-4 font-medium">Dado</th>
            <th className="py-2 pr-4 font-medium">Para quê</th>
            <th className="py-2 font-medium">Base legal</th>
          </tr>
        </thead>
        <tbody className="align-top">
          <tr className="border-b">
            <td className="py-2 pr-4">Nome e e-mail institucional</td>
            <td className="py-2 pr-4">
              Identificar quem usa o sistema, autenticar o acesso e avisar sobre
              reservas em seu nome
            </td>
            <td className="py-2">Execução de contrato</td>
          </tr>
          <tr className="border-b">
            <td className="py-2 pr-4">Senha</td>
            <td className="py-2 pr-4">
              Autenticar o acesso. É guardada como resumo criptográfico, nunca
              em texto legível
            </td>
            <td className="py-2">Execução de contrato</td>
          </tr>
          <tr className="border-b">
            <td className="py-2 pr-4">Segundo fator de autenticação</td>
            <td className="py-2 pr-4">
              Confirmar a identidade em cada acesso, reduzindo o risco de uso da
              conta por terceiros
            </td>
            <td className="py-2">Legítimo interesse em segurança</td>
          </tr>
          <tr className="border-b">
            <td className="py-2 pr-4">
              Papel e vínculo docente (disciplinas e turmas)
            </td>
            <td className="py-2 pr-4">
              Decidir o que cada pessoa pode fazer e validar se a reserva
              corresponde a uma atividade que ela de fato leciona
            </td>
            <td className="py-2">Execução de contrato</td>
          </tr>
          <tr className="border-b">
            <td className="py-2 pr-4">
              Reservas (espaço, data, horário, finalidade, turma e disciplina)
            </td>
            <td className="py-2 pr-4">
              Gerir a ocupação dos espaços e evitar conflitos de agendamento
            </td>
            <td className="py-2">Execução de contrato</td>
          </tr>
          <tr>
            <td className="py-2 pr-4">
              Registros de auditoria (quem fez o quê e quando)
            </td>
            <td className="py-2 pr-4">
              Permitir rastrear alterações em reservas e acessos ao sistema
            </td>
            <td className="py-2">Legítimo interesse em rastreabilidade</td>
          </tr>
        </tbody>
      </table>

      <p>
        O sistema não trata dados pessoais sensíveis na acepção do artigo 5º da
        LGPD. Não coleta CPF, data de nascimento, endereço residencial,
        fotografia nem documentos. Não usa cookies de análise ou publicidade: os
        únicos cookies existentes são os que mantêm a sessão aberta, e sem eles
        não há como permanecer autenticado.
      </p>

      <h2>3. Com quem os dados são compartilhados</h2>

      <p>
        O CheckRoom não vende nem cede dados pessoais. Três fornecedores
        processam dados por conta do sistema:
      </p>

      <ul>
        <li>
          <strong>Supabase</strong>, que hospeda o banco de dados e o serviço de
          autenticação. Recebe todos os dados descritos na seção 2. A instância
          usada está na região de São Paulo.
        </li>
        <li>
          <strong>Resend</strong>, que entrega as mensagens de e-mail, a partir
          do domínio checkroom.com.br. Recebe apenas o endereço do destinatário
          e o conteúdo da mensagem: as informações da reserva mencionada ou o
          link de recuperação de senha. O envio é feito pela região de São
          Paulo.
        </li>
        <li>
          <strong>Vercel</strong>, que hospedará a aplicação quando ela for
          publicada. Processa os dados que trafegam nas requisições.
        </li>
      </ul>

      <h2>4. Transferência internacional</h2>

      <p>
        O banco de dados e o envio de e-mail operam em infraestrutura localizada
        no Brasil. A hospedagem da aplicação, quando ocorrer, poderá processar
        requisições fora do país, conforme a região escolhida na publicação.
      </p>

      <h2>5. Por quanto tempo os dados ficam guardados</h2>

      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b">
            <th className="py-2 pr-4 font-medium">Categoria</th>
            <th className="py-2 pr-4 font-medium">Prazo</th>
            <th className="py-2 font-medium">Destino</th>
          </tr>
        </thead>
        <tbody className="align-top">
          <tr className="border-b">
            <td className="py-2 pr-4">Conta e perfil</td>
            <td className="py-2 pr-4">
              Enquanto durar o vínculo com a instituição, ou até a pessoa pedir
              a remoção
            </td>
            <td className="py-2">Anonimização</td>
          </tr>
          <tr className="border-b">
            <td className="py-2 pr-4">Reservas</td>
            <td className="py-2 pr-4">
              Preservadas como registro institucional de uso dos espaços
            </td>
            <td className="py-2">Mantidas</td>
          </tr>
          <tr className="border-b">
            <td className="py-2 pr-4">Registros de auditoria</td>
            <td className="py-2 pr-4">
              Preservados para garantir a rastreabilidade das operações
            </td>
            <td className="py-2">Mantidos, com autor anonimizado</td>
          </tr>
          <tr>
            <td className="py-2 pr-4">Dados de demonstração</td>
            <td className="py-2 pr-4">Até a conclusão do projeto acadêmico</td>
            <td className="py-2">Excluídos</td>
          </tr>
        </tbody>
      </table>

      <h2>6. Seus direitos</h2>

      <p>
        A LGPD assegura a confirmação do tratamento, o acesso aos dados, a
        correção, a anonimização ou eliminação quando cabível, a portabilidade,
        a informação sobre compartilhamentos e a oposição ao tratamento.
      </p>

      <p>
        No CheckRoom, o acesso e a correção dos próprios dados acontecem na tela
        de conta. A remoção também: o botão de excluir conta anonimiza o perfil
        e o cadastro de docente ligado a ele, apaga o endereço de e-mail dos
        registros de auditoria, cancela as reservas futuras e encerra o acesso,
        sem depender de pedido por e-mail. Depois disso, nenhum dado do sistema
        permite identificar a pessoa.
      </p>

      <p>
        Há um limite que precisa ficar claro. As reservas já realizadas e os
        registros de auditoria não são apagados, porque documentam o uso de
        espaços da instituição e a rastreabilidade das operações, com base no
        legítimo interesse. O que some é a ligação com a pessoa: o nome no
        perfil é substituído e o vínculo entre conta e docente é desfeito.
      </p>

      <h2>7. Segurança</h2>

      <p>
        As senhas são guardadas como resumo criptográfico com sal, nunca em
        texto legível, e nunca aparecem em registros do sistema. O acesso exige
        um segundo fator gerado por aplicativo autenticador. A autorização é
        verificada em duas camadas independentes: na aplicação, antes de cada
        operação, e no próprio banco de dados, por políticas que limitam quais
        linhas cada pessoa alcança. Esconder um botão na tela não é considerado
        controle de acesso neste projeto.
      </p>

      <p>
        Chaves de acesso a serviços externos ficam em variáveis de ambiente do
        servidor e não são enviadas ao navegador nem versionadas no repositório.
      </p>

      <h2>8. Incidentes e contato</h2>

      <p>
        Em caso de incidente de segurança com risco relevante, o procedimento é
        conter o problema, identificar quais dados e pessoas foram afetados,
        avaliar o risco, comunicar a Autoridade Nacional de Proteção de Dados e
        os titulares quando exigido, e registrar as medidas tomadas.
      </p>

      <p>
        Para exercer direitos ou relatar um problema de privacidade, escreva
        para o endereço de contato informado pelo responsável pelo projeto na
        entrega acadêmica.
      </p>

      <h2>9. Mudanças nesta política</h2>

      <p>
        Alterações relevantes geram nova versão, com data indicada no topo desta
        página. Quando a mudança afetar o que é tratado ou para quê, o sistema
        pede que você leia a nova versão no acesso seguinte.
      </p>
    </>
  );
}
