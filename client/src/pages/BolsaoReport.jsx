import { useEffect, useState } from "react";
import { api } from "../api.js";

function RankingList({ title, data, color }) {
  const max = Math.max(...data.map((d) => d.total), 1);
  return (
    <div className="bg-card rounded-xl2 shadow-card p-5">
      <h2 className="font-display font-semibold text-ink text-sm mb-4">{title}</h2>
      {data.length === 0 ? (
        <p className="text-sm text-gray-400">Sem dados ainda.</p>
      ) : (
        <div className="space-y-3">
          {data.map((d) => (
            <div key={d.id} className="flex items-center gap-3">
              <span className="text-sm text-gray-600 w-32 shrink-0 truncate">{d.name}</span>
              <div className="flex-1 h-6 bg-line rounded-md overflow-hidden">
                <div
                  className={`h-full ${color} flex items-center justify-end px-2`}
                  style={{ width: `${(d.total / max) * 100}%` }}
                >
                  <span className="text-xs text-white font-medium">{d.total}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BolsaoReport() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.getBolsaoReport().then(setData);
  }, []);

  if (!data) return <div className="p-6 text-gray-400 text-sm">Carregando...</div>;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <h1 className="font-display text-xl font-semibold text-ink mb-1">Relatório do bolsão</h1>
      <p className="text-sm text-gray-500 mb-6">Quem mais assume leads do bolsão x quem mais perde leads pra ele.</p>

      <div className="grid md:grid-cols-2 gap-4">
        <RankingList title="Leads assumidos através do bolsão" data={data.claimed} color="bg-ganho" />
        <RankingList title="Leads perdidos para o bolsão" data={data.lost} color="bg-perdido" />
      </div>
    </div>
  );
}
