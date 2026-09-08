// O Tailwind v4 e carregado como plugin do PostCSS. Diferente da v3, nao existe
// mais o arquivo tailwind.config.js: a configuracao do tema mora no proprio CSS,
// dentro do bloco @theme em globals.css.
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
