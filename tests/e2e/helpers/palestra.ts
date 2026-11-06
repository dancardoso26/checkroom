import type { Locator, Page } from "@playwright/test";
import { escolherData, escolherHora } from "./seletores";

export type DadosDaPalestra = {
  titulo: string;
  palestrante?: string;
  espaco?: string;
  data: string;
  inicio: string;
  fim: string;
  vagas: string;
  cursos: string[];
};

async function marcarCursosDoPainel(
  page: Page,
  painel: Locator,
  cursos: string[]
) {
  if (cursos.length === 0) return;

  await painel.getByLabel("Cursos", { exact: true }).click();
  for (const curso of cursos) {
    await page.getByLabel("Pesquisar cursos").fill(curso);
    await page.getByRole("checkbox", { name: curso }).check();
  }
  await page.keyboard.press("Escape");
}

export async function preencherPalestra(page: Page, dados: DadosDaPalestra) {
  await page.goto("/palestras");
  await page.getByRole("button", { name: "Nova palestra" }).click();

  const painel = page.getByRole("dialog", { name: "Nova palestra" });
  await painel.getByLabel("Título da atividade").fill(dados.titulo);
  await escolherData(page, painel, "Data e hora", dados.data);
  await escolherHora(page, painel, "Início", dados.inicio);
  await escolherHora(page, painel, "Término", dados.fim);
  await painel
    .getByLabel("Palestrante")
    .fill(dados.palestrante ?? "Dra. Helena Souza");
  await marcarCursosDoPainel(page, painel, dados.cursos);

  if (dados.espaco) {
    await painel.getByLabel("Espaço", { exact: true }).click();
    await page.getByRole("option", { name: new RegExp(dados.espaco) }).click();
  }

  await painel.getByLabel("Vagas").fill(dados.vagas);

  return painel;
}

export async function cadastrarPalestra(page: Page, dados: DadosDaPalestra) {
  const painel = await preencherPalestra(page, dados);
  await painel.getByRole("button", { name: "Cadastrar palestra" }).click();
  return painel;
}
