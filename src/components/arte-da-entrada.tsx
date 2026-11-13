const COLUNAS = 6;
const LINHAS = 9;
const CELULA = 96;
const ESPACO = 12;
const PASSO = CELULA + ESPACO;
const LARGURA = COLUNAS * PASSO + ESPACO;
const ALTURA = LINHAS * PASSO + ESPACO;

type Bloco = {
  coluna: number;
  linha: number;
  altura: number;
  cor: string;
  opacidade?: number;
};

const BLOCOS: Bloco[] = [
  {
    coluna: 0,
    linha: 1,
    altura: 2,
    cor: "var(--chart-prioridade-baixa)",
    opacidade: 0.35,
  },
  { coluna: 1, linha: 0, altura: 1, cor: "var(--chart-2)", opacidade: 0.55 },
  {
    coluna: 1,
    linha: 4,
    altura: 3,
    cor: "var(--chart-prioridade-media)",
    opacidade: 0.7,
  },
  {
    coluna: 2,
    linha: 2,
    altura: 2,
    cor: "var(--chart-trilha)",
    opacidade: 0.25,
  },
  { coluna: 2, linha: 6, altura: 2, cor: "var(--chart-2)", opacidade: 0.45 },
  {
    coluna: 3,
    linha: 0,
    altura: 3,
    cor: "var(--chart-prioridade-media)",
    opacidade: 0.55,
  },
  {
    coluna: 4,
    linha: 1,
    altura: 1,
    cor: "var(--chart-prioridade-baixa)",
    opacidade: 0.45,
  },
  {
    coluna: 4,
    linha: 5,
    altura: 3,
    cor: "var(--chart-trilha)",
    opacidade: 0.2,
  },
  { coluna: 5, linha: 2, altura: 2, cor: "var(--chart-2)", opacidade: 0.6 },
  {
    coluna: 5,
    linha: 7,
    altura: 1,
    cor: "var(--chart-prioridade-baixa)",
    opacidade: 0.35,
  },
  {
    coluna: 0,
    linha: 6,
    altura: 2,
    cor: "var(--chart-prioridade-alta)",
    opacidade: 0.6,
  },
];

const CONFIRMADO = { coluna: 3, linha: 3, altura: 2 };

function posicao(coluna: number, linha: number) {
  return { x: ESPACO + coluna * PASSO, y: ESPACO + linha * PASSO };
}

export function ArteDaEntrada({ className }: { className?: string }) {
  const confirmado = posicao(CONFIRMADO.coluna, CONFIRMADO.linha);
  const alturaDoConfirmado = CONFIRMADO.altura * PASSO - ESPACO;

  return (
    <svg
      viewBox={`0 0 ${LARGURA} ${ALTURA}`}
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden
      focusable="false"
    >
      {Array.from({ length: COLUNAS * LINHAS }, (_, i) => {
        const { x, y } = posicao(i % COLUNAS, Math.floor(i / COLUNAS));
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={CELULA}
            height={CELULA}
            rx={14}
            fill="white"
            fillOpacity={0.04}
            stroke="white"
            strokeOpacity={0.08}
          />
        );
      })}

      {BLOCOS.map((bloco) => {
        const { x, y } = posicao(bloco.coluna, bloco.linha);
        return (
          <rect
            key={`${bloco.coluna}-${bloco.linha}`}
            x={x}
            y={y}
            width={CELULA}
            height={bloco.altura * PASSO - ESPACO}
            rx={14}
            fill={bloco.cor}
            fillOpacity={bloco.opacidade ?? 0.5}
          />
        );
      })}

      <rect
        x={confirmado.x}
        y={confirmado.y}
        width={CELULA}
        height={alturaDoConfirmado}
        rx={14}
        fill="white"
      />
      <circle
        cx={confirmado.x + CELULA / 2}
        cy={confirmado.y + alturaDoConfirmado / 2}
        r={26}
        fill="var(--chart-2)"
      />
      <path
        d={`M ${confirmado.x + CELULA / 2 - 11} ${confirmado.y + alturaDoConfirmado / 2 + 1} l 7 7 l 15 -15`}
        fill="none"
        stroke="white"
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
