"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { podeGerenciarCadastros } from "@/domain/auth/permissoes";
import {
  codigoDoEspaco,
  TIPOS_DE_ESPACO,
  validarEspaco,
  type TipoDeEspaco,
} from "@/domain/espacos/espaco";
import { semErros } from "@/domain/formulario/validacao";
import {
  falha,
  falhaDeValidacao,
  SUCESSO,
  texto,
  type EstadoDoFormulario,
  type ResultadoDaAcao,
} from "@/lib/formulario";
import {
  excluirEspaco as excluirNoBanco,
  listarEspacosParaGestao,
  salvarEspaco as salvarNoBanco,
} from "@/lib/repositories/repositorio-de-espacos";
import { sessaoAtual } from "@/lib/sessao";

const SEM_PERMISSAO = "Apenas a administração mantém o cadastro de espaços.";

const schema = z.object({
  id: z.union([z.uuid(), z.literal("")]).transform((v) => v || null),
  predio: z.coerce.number(),
  andar: z.string().trim().toUpperCase(),
  sala: z.coerce.number(),
  capacidade: z.coerce.number(),
  tipo: z.enum(TIPOS_DE_ESPACO as [TipoDeEspaco, ...TipoDeEspaco[]], {
    error: "Selecione o tipo do espaço.",
  }),
  recursoIds: z.array(z.uuid()),
});

export async function salvarEspaco(
  _estado: EstadoDoFormulario,
  formData: FormData
): Promise<EstadoDoFormulario> {
  const sessao = await sessaoAtual();
  if (!sessao || !podeGerenciarCadastros(sessao)) return falha(SEM_PERMISSAO);

  const parsed = schema.safeParse({
    id: texto(formData.get("id")),
    predio: texto(formData.get("predio")),
    andar: texto(formData.get("andar")),
    sala: texto(formData.get("sala")),
    capacidade: texto(formData.get("capacidade")),
    tipo: texto(formData.get("tipo")),
    recursoIds: formData.getAll("recursoIds").map(texto),
  });

  if (!parsed.success) return falhaDeValidacao(parsed.error);

  const dados = parsed.data;
  const erros = validarEspaco(dados, await listarEspacosParaGestao());
  if (!semErros(erros)) return falha(null, erros);

  const resultado = await salvarNoBanco(dados);

  if (!resultado.ok) {
    switch (resultado.falha) {
      case "duplicado":
        return falha(null, {
          sala: [
            `Já existe o espaço ${codigoDoEspaco(dados.predio, dados.andar, dados.sala)}.`,
          ],
        });
      case "invalido":
        return falha("Confira prédio, andar, sala e capacidade.");
      case "nao_encontrado":
        return falha("Este espaço não existe mais. Atualize a página.");
      default:
        return falha("Não foi possível salvar o espaço agora.");
    }
  }

  revalidatePath("/configuracoes/espacos");
  return SUCESSO;
}

export async function excluirEspaco(id: string): Promise<ResultadoDaAcao> {
  const sessao = await sessaoAtual();
  if (!sessao || !podeGerenciarCadastros(sessao)) {
    return { ok: false, mensagem: SEM_PERMISSAO };
  }

  const resultado = await excluirNoBanco(id);

  if (!resultado.ok) {
    return {
      ok: false,
      mensagem:
        resultado.falha === "em_uso"
          ? "Este espaço tem reservas, chamados ou palestras e não pode ser excluído."
          : resultado.falha === "nao_encontrado"
            ? "Este espaço não existe mais. Atualize a página."
            : "Não foi possível excluir o espaço agora.",
    };
  }

  revalidatePath("/configuracoes/espacos");
  return { ok: true };
}
