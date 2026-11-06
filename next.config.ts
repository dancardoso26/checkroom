import type { NextConfig } from "next";

const CABECALHOS_DE_SEGURANCA = [
  {
    key: "Content-Security-Policy",
    value:
      "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
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
  devIndicators: false,
  async headers() {
    return [{ source: "/:path*", headers: CABECALHOS_DE_SEGURANCA }];
  },
  async redirects() {
    return [
      { source: "/painel", destination: "/dashboard", permanent: true },
      {
        source: "/auditoria",
        destination: "/configuracoes/auditoria",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
