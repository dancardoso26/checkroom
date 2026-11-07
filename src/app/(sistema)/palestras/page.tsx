import { redirect } from "next/navigation";

import {
  podeCadastrarPalestra,
  podeInscreverEmPalestra,
  podeVerPalestras,
} from "@/domain/auth/permissoes";
import { situacaoParaOAluno } from "@/domain/palestras/palestra";
import { toDateInputValue } from "@/lib/datetime";
import {
  listarPalestras,
  minhasInscricoes,
} from "@/lib/repositories/repositorio-de-palestras";
import { exigirSessao } from "@/lib/sessao";
import { AtualizacaoAoVivo } from "@/components/atualizacao-ao-vivo";

import { carregarCatalogos } from "../reservas/catalogos";
import { ListaDePalestras } from "./lista-de-palestras";
import { PalestrasDoAluno } from "./palestras-do-aluno";

export const metadata = { title: "Palestras | CheckRoom" };
export const dynamic = "force-dynamic";

export default async function PalestrasPage() {
  const sessao = await exigirSessao();
  if (!podeVerPalestras(sessao)) redirect("/reservas");

  const agora = new Date();
  const cadastra = podeCadastrarPalestra(sessao);
  const inscreve = podeInscreverEmPalestra(sessao);

  const hoje = toDateInputValue(agora);

  const [palestras, inscricoes, catalogos] = await Promise.all([
    listarPalestras({ aPartirDe: null }),
    inscreve
      ? minhasInscricoes(sessao.profileId)
      : Promise.resolve(new Set<string>()),
    cadastra
      ? carregarCatalogos(hoje, { comCursos: true })
      : Promise.resolve(null),
  ]);

  const doCurso = inscreve
    ? palestras.filter(
        (p) => sessao.cursoId && p.cursoIds.includes(sessao.cursoId),
      )
    : palestras;

  const visiveis = [
    ...doCurso
      .filter((p) => p.fim > agora)
      .sort((a, b) => a.inicio.getTime() - b.inicio.getTime()),
    ...doCurso
      .filter((p) => p.fim <= agora)
      .sort((a, b) => b.inicio.getTime() - a.inicio.getTime()),
  ];

  const itens = visiveis.map((p) => ({
    ...p,
    iniciada: p.inicio <= agora,
    situacaoDoAluno: inscreve
      ? situacaoParaOAluno(
          p,
          { cursoId: sessao.cursoId, jaInscrito: inscricoes.has(p.id) },
          agora,
        )
      : null,
  }));

  const aoVivo = (
    <AtualizacaoAoVivo tabelas={["lectures", "lecture_enrollments"]} />
  );

  if (inscreve) {
    return (
      <>
        {aoVivo}
        <PalestrasDoAluno palestras={itens} semCurso={!sessao.cursoId} />
      </>
    );
  }

  return (
    <>
      {aoVivo}
      <ListaDePalestras
        palestras={itens}
        catalogos={catalogos}
        hoje={hoje}
        semCurso={false}
      />
    </>
  );
}
