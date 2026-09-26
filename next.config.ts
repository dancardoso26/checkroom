import type { NextConfig } from "next";

// Valem para toda resposta. A CSP não restringe scripts: o Next injeta scripts
// inline, e fazer isso direito exige nonce por requisição. Ela fecha o que dá
// sem quebrar nada: iframes, plugins, base e destino de formulários.
const CABECALHOS_DE_SEGURANCA = [
  {
    key: "Content-Security-Policy",
    value:
      "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
  },
  // Redundante com frame-ancestors, para navegadores antigos: impede que a
  // tela seja embutida num site falso para enganar cliques.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // O endereço completo, com a query da agenda, não vai para outros sites.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  // Só em produção: em localhost, o HSTS forçaria HTTPS onde não existe.
  ...(process.env.NODE_ENV === "production"
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: CABECALHOS_DE_SEGURANCA }];
  },
};

export default nextConfig;
