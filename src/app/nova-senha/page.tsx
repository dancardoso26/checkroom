import { FormularioDeNovaSenha } from "./formulario";

export const metadata = { title: "Criar senha | CheckRoom" };

export default async function NovaSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ convite?: string }>;
}) {
  const { convite } = await searchParams;
  return <FormularioDeNovaSenha convite={convite === "1"} />;
}
