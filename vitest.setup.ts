// Adiciona ao Vitest as verificacoes especificas de DOM da Testing Library,
// como toBeInTheDocument() e toHaveTextContent(). Sem este import, essas
// funcoes nao existem e o teste falha dizendo que o metodo nao e uma funcao.
import "@testing-library/jest-dom/vitest";
