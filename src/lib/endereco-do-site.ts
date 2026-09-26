import "server-only";

// Os links dos e-mails usam este endereço, e não o cabeçalho Origin da
// requisição, que quem faz a requisição pode forjar.
export function enderecoDoSite(): string {
  return (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
