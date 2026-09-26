import { clienteAdmin } from "./global-setup";

const CONTA_COM_SEGUNDO_FATOR = "teste.mfa@exemplo.edu.br";

export default async function globalTeardown() {
  const { supabase } = clienteAdmin();

  const { data } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const conta = data?.users.find((u) => u.email === CONTA_COM_SEGUNDO_FATOR);

  if (conta) await supabase.auth.admin.deleteUser(conta.id);
}
