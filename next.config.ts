import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Quando o build falha por erro de tipo, a falha aparece cedo, no CI ou no
  // deploy da Vercel, e nao em producao. Por isso nenhum "ignoreBuildErrors"
  // e usado aqui: um erro de tipo deve mesmo interromper o build.
  reactStrictMode: true,
};

export default nextConfig;
