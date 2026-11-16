"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  podeCadastrarPalestra,
  podeInscreverEmPalestra,
} from "@/domain/auth/permissoes";
import {
  MENSAGEM_DA_INSCRICAO,
  recusaDaInscricaoNoBanco,
  validarPalestra,
} from "@/domain/palestras/palestra";
import { semErros } from "@/domain/formulario/validacao";
import { combinarDataEHora, formatarPeriodo } from "@/lib/datas";
import { mesmoNome } from "@/domain/palestras/palestrante";
import {
  avisarPalestrante,
  avisarSobreNovaPalestra,
  avisarSobrePalestraCancelada,
} from "@/lib/email/enviar";
import { enderecoDoSite } from "@/lib/endereco-do-site";
import {
  falha,
  falhaDeValidacao,
  SUCESSO,
  texto,
  type EstadoDoFormulario,
  type ResultadoDaAcao,
} from "@/lib/formulario";
import { listarCursos } from "@/lib/repositories/repositorio-de-cursos";
import { buscarContatoDoProfessor } from "@/lib/repositories/repositorio-de-professores";
import {
  avisoDePalestraExcluida,
  cadastrarPalestra as cadastrarNoBanco,
  cancelarInscricao as cancelarNoBanco,
  emailsDosAlunos,
  excluirPalestra as excluirNoBanco,
  inscrever,
  listarInscritos,
  ocupacoesDoEspaco,
  type InscritoDaPalestra,
} from "@/lib/repositories/repositorio-de-palestras";
import { carregarCalendarioDoDia } from "@/lib/repositories/repositorio-do-calendario";
import { buscarEspacoParaReserva } from "@/lib/repositories/repositorio-de-espacos";
import { sessaoAtual } from "@/lib/sessao";

const PREFIXO_DE_TESTE = "[e2e]";

const schema = z.object({
  titulo: z.string().trim().max(150, "Use no máximo 150 caracteres."),
  palestrante: z.string().trim().max(120, "Use no máximo 120 caracteres."),
  palestranteProfessorId: z.union([z.uuid(), z.literal("")]),
  espacoId: z.union([z.uuid(), z.literal("")]),
  data: z.iso.date("Informe a data."),
  inicio: z.iso.time("Informe o horário de início."),
  fim: z.iso.time("Informe o horário de término."),
  vagas: z.coerce.number(),
  cursoIds: z.array(z.uuid()),
});

export async function cadastrarPalestra(
  _estado: EstadoDoFormulario,
  dadosDoFormulario: FormData,
): Promise<EstadoDoFormulario> {
  const sessao = await sessaoAtual();
  if (!sessao || !podeCadastrarPalestra(sessao)) {
    return falha("Apenas a administração cadastra palestras.");
  }

  const validado = schema.safeParse({
    titulo: texto(dadosDoFormulario.get("titulo")),
    palestrante: texto(dadosDoFormulario.get("palestrante")),
    palestranteProfessorId: texto(
      dadosDoFormulario.get("palestranteProfessorId"),
    ),
    espacoId: texto(dadosDoFormulario.get("espacoId")),
    data: texto(dadosDoFormulario.get("data")),
    inicio: texto(dadosDoFormulario.get("inicio")),
    fim: texto(dadosDoFormulario.get("fim")),
    vagas: texto(dadosDoFormulario.get("vagas")),
    cursoIds: dadosDoFormulario.getAll("cursoIds").map(texto),
  });

  if (!validado.success) return falhaDeValidacao(validado.error);

  const entrada = validado.data;
  const dados = {
    titulo: entrada.titulo,
    palestrante: entrada.palestrante,
    espacoId: entrada.espacoId,
    inicio: combinarDataEHora(entrada.data, entrada.inicio),
    fim: combinarDataEHora(entrada.data, entrada.fim),
    vagas: entrada.vagas,
    cursoIds: [...new Set(entrada.cursoIds)],
  };

  const [espaco, ocupacoes, calendario] = await Promise.all([
    dados.espacoId ? buscarEspacoParaReserva(dados.espacoId) : null,
    dados.espacoId
      ? ocupacoesDoEspaco(dados.espacoId, dados.inicio, dados.fim)
      : [],
    carregarCalendarioDoDia(entrada.data),
  ]);

  const erros = validarPalestra(dados, {
    capacidadeDoEspaco: espaco?.capacidade ?? null,
    ocupacoes,
    agora: new Date(),
    bloqueios: calendario.bloqueios,
  });
  if (!semErros(erros)) return falha(null, erros);

  const professorEscolhido = entrada.palestranteProfessorId
    ? await buscarContatoDoProfessor(entrada.palestranteProfessorId)
    : null;
  const professor =
    professorEscolhido && mesmoNome(professorEscolhido.nome, dados.palestrante)
      ? professorEscolhido
      : null;

  const resultado = await cadastrarNoBanco(
    dados,
    professor ? entrada.palestranteProfessorId : null,
  );

  if (!resultado.ok) {
    switch (resultado.falha) {
      case "conflito":
        return falha(null, {
          espacoId: [
            "O espaço acabou de ser ocupado neste horário. Escolha outro.",
          ],
        });
      case "vagas":
        return falha(null, {
          vagas: ["As vagas passam da capacidade do espaço."],
        });
      case "sem_curso":
        return falha(null, {
          cursoIds: ["Selecione ao menos um curso de destino."],
        });
      case "espaco":
        return falha(null, { espacoId: ["Este espaço não existe mais."] });
      default:
        return falha("Não foi possível cadastrar a palestra agora.");
    }
  }

  if (espaco && !dados.titulo.startsWith(PREFIXO_DE_TESTE)) {
    const cursos = await listarCursos();
    const aviso = {
      titulo: dados.titulo,
      palestrante: dados.palestrante,
      espaco: espaco.nome,
      periodo: formatarPeriodo(dados.inicio, dados.fim),
      vagas: String(dados.vagas),
      cursos: cursos
        .filter((c) => dados.cursoIds.includes(c.id))
        .map((c) => c.nome)
        .join(", "),
      link: `${enderecoDoSite()}/palestras`,
    };

    await avisarSobreNovaPalestra(await emailsDosAlunos(dados.cursoIds), aviso);

    if (professor) await avisarPalestrante(professor.email, aviso);
  }

  revalidatePath("/palestras");
  revalidatePath("/reservas");
  return SUCESSO;
}

export async function listarInscritosDaPalestra(
  id: string,
): Promise<
  | { ok: true; inscritos: InscritoDaPalestra[] }
  | { ok: false; mensagem: string }
> {
  const sessao = await sessaoAtual();
  if (!sessao || !podeCadastrarPalestra(sessao)) {
    return { ok: false, mensagem: "Apenas a administração vê os inscritos." };
  }

  try {
    return { ok: true, inscritos: await listarInscritos(id) };
  } catch {
    return {
      ok: false,
      mensagem: "Não foi possível carregar os inscritos agora.",
    };
  }
}

export async function excluirPalestra(id: string): Promise<ResultadoDaAcao> {
  const sessao = await sessaoAtual();
  if (!sessao || !podeCadastrarPalestra(sessao)) {
    return { ok: false, mensagem: "Apenas a administração exclui palestras." };
  }

  const aviso = await avisoDePalestraExcluida(id);
  const resultado = await excluirNoBanco(id);

  if (!resultado.ok) {
    return {
      ok: false,
      mensagem:
        resultado.falha === "nao_encontrado"
          ? "Esta palestra não existe mais. Atualize a página."
          : "Não foi possível excluir a palestra agora.",
    };
  }

  if (
    aviso &&
    aviso.inicio > new Date() &&
    !aviso.titulo.startsWith(PREFIXO_DE_TESTE)
  ) {
    const dados = {
      titulo: aviso.titulo,
      palestrante: aviso.palestrante,
      espaco: aviso.espaco,
      periodo: formatarPeriodo(aviso.inicio, aviso.fim),
      canceladaPor: sessao.nome,
    };

    await avisarSobrePalestraCancelada(aviso.emailsDosInscritos, dados);

    if (aviso.palestranteProfessorId) {
      const professor = await buscarContatoDoProfessor(
        aviso.palestranteProfessorId,
      );
      if (professor) {
        await avisarSobrePalestraCancelada([professor.email], dados, true);
      }
    }
  }

  revalidatePath("/palestras");
  revalidatePath("/reservas");
  return { ok: true };
}

export async function inscreverEmPalestra(
  id: string,
): Promise<ResultadoDaAcao> {
  const sessao = await sessaoAtual();
  if (!sessao || !podeInscreverEmPalestra(sessao)) {
    return { ok: false, mensagem: MENSAGEM_DA_INSCRICAO.NAO_E_ALUNO };
  }

  const recusa = recusaDaInscricaoNoBanco(await inscrever(id));

  if (recusa === "ERRO") {
    return { ok: false, mensagem: "Não foi possível fazer a inscrição agora." };
  }
  if (recusa) return { ok: false, mensagem: MENSAGEM_DA_INSCRICAO[recusa] };

  revalidatePath("/palestras");
  revalidatePath("/reservas");
  return { ok: true };
}

export async function cancelarInscricao(id: string): Promise<ResultadoDaAcao> {
  const sessao = await sessaoAtual();
  if (!sessao || !podeInscreverEmPalestra(sessao)) {
    return { ok: false, mensagem: MENSAGEM_DA_INSCRICAO.NAO_E_ALUNO };
  }

  const codigo = await cancelarNoBanco(id);

  if (codigo !== "cancelled") {
    return {
      ok: false,
      mensagem:
        codigo === "started"
          ? "A palestra já começou; a inscrição não pode mais ser cancelada."
          : codigo === "not_enrolled"
            ? "Você não está inscrito nesta palestra."
            : "Não foi possível cancelar a inscrição agora.",
    };
  }

  revalidatePath("/palestras");
  revalidatePath("/reservas");
  return { ok: true };
}
