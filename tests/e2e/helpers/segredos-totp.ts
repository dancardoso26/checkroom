import { existsSync, readFileSync, writeFileSync } from "node:fs";

export const ARQUIVO_DE_SEGREDOS = "tests/e2e/.segredos-totp.json";

export const CONTAS_COM_TOTP_FIXO = [
  "adm@umc.br",
  "professor@umc.br",
  "aluno@umc.br",
  "suporte@umc.br",
];

export type SegredoTotp = {
  fatorId: string;
  segredo: string;
  qrCode: string;
};

export function lerSegredos(): Record<string, SegredoTotp> {
  if (!existsSync(ARQUIVO_DE_SEGREDOS)) return {};

  return JSON.parse(readFileSync(ARQUIVO_DE_SEGREDOS, "utf8"));
}

export function salvarSegredos(segredos: Record<string, SegredoTotp>) {
  writeFileSync(ARQUIVO_DE_SEGREDOS, JSON.stringify(segredos, null, 2));
}
