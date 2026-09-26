import { cn } from "@/lib/utils";

// Sem "use client": renderiza no servidor, e o índice lateral, que é de
// cliente, recebe a tabela já pronta.
// Tabelas dos documentos: cabeçalho destacado, bordas e rolagem própria no
// celular, em vez de alargar a página inteira.
export function TabelaDoDocumento({
  colunas,
  linhas,
}: {
  colunas: string[];
  linhas: React.ReactNode[][];
}) {
  return (
    <div className="mb-6 overflow-x-auto rounded-lg border">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-muted">
          <tr>
            {colunas.map((coluna) => (
              <th
                key={coluna}
                scope="col"
                className="px-4 py-2.5 font-semibold whitespace-nowrap"
              >
                {coluna}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha, i) => (
            <tr key={i} className="border-t align-top">
              {linha.map((celula, j) => (
                <td
                  key={j}
                  className={cn(
                    "px-4 py-3 leading-relaxed",
                    j === 0 && "font-medium"
                  )}
                >
                  {celula}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
