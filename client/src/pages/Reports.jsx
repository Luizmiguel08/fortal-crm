import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { api } from "../api.js";

function formatDay(d) {
  const [, m, day] = d.split("-");
  return `${day}/${m}`;
}

export default function Reports() {
  const [timeline, setTimeline] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [days, setDays] = useState(30);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    api.getTimeline(days).then((d) => setTimeline(d.timeline));
  }, [days]);

  useEffect(() => {
    api.getPerformance().then((d) => setPerformance(d.performance));
  }, []);

  const chartData = timeline.map((t) => ({ ...t, label: formatDay(t.day) }));

  async function handleExport() {
    setExporting(true);
    try {
      await api.downloadLeadsCsv();
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink">Relatórios</h1>
          <p className="text-sm text-gray-500">Evolução de leads e desempenho da equipe.</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-1.5 bg-ink text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60 self-start"
        >
          <Download size={16} /> {exporting ? "Exportando..." : "Exportar leads (CSV)"}
        </button>
      </div>

      <div className="bg-card rounded-xl2 shadow-card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-ink text-sm">Leads recebidos ao longo do tempo</h2>
          <div className="flex gap-1">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  days === d ? "bg-brand text-ink" : "bg-line text-gray-500"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {chartData.length === 0 ? (
          <p className="text-sm text-gray-400 py-10 text-center">Sem dados suficientes no período.</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E6F1" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #E4E6F1", fontSize: 12 }}
                  labelFormatter={(l) => `Dia ${l}`}
                />
                <Line type="monotone" dataKey="total" name="Leads recebidos" stroke="#4A4FE0" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="ganhos" name="Ganhos" stroke="#16B87A" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="bg-card rounded-xl2 shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-line">
          <h2 className="font-display font-semibold text-ink text-sm">Desempenho por corretor</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-line">
              <th className="px-5 py-3 font-medium">Corretor</th>
              <th className="px-5 py-3 font-medium">Leads</th>
              <th className="px-5 py-3 font-medium">Ganhos</th>
              <th className="px-5 py-3 font-medium">Perdidos</th>
              <th className="px-5 py-3 font-medium">Conversão</th>
              <th className="px-5 py-3 font-medium hidden sm:table-cell">Tempo médio até 1º contato</th>
            </tr>
          </thead>
          <tbody>
            {performance.map((p) => {
              const conv = p.total_leads > 0 ? ((p.ganhos / p.total_leads) * 100).toFixed(0) : "0";
              return (
                <tr key={p.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-3 font-medium text-ink">{p.name}</td>
                  <td className="px-5 py-3">{p.total_leads}</td>
                  <td className="px-5 py-3 text-ganho font-medium">{p.ganhos}</td>
                  <td className="px-5 py-3 text-perdido">{p.perdidos}</td>
                  <td className="px-5 py-3">{conv}%</td>
                  <td className="px-5 py-3 hidden sm:table-cell text-gray-500">
                    {p.tempo_medio_resposta_horas != null ? `${p.tempo_medio_resposta_horas}h` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
