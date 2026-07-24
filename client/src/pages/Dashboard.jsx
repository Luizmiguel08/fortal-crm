import { useEffect, useState } from "react";
import { TrendingUp, Users, Target, AlertTriangle, AlertCircle, Trophy, Timer } from "lucide-react";
import { api } from "../api.js";
import TempBadge from "../components/TempBadge.jsx";
import { useLeadEvents } from "../lib/liveEvents.js";

function formatMinutes(min) {
  if (min == null) return "—";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h}h${String(min % 60).padStart(2, "0")}min`;
}

const STATUS_LABELS = {
  novo: "Novo",
  atendimento: "Em atendimento",
  qualificado: "Qualificado",
  proposta: "Proposta",
  ganho: "Ganho",
  perdido: "Perdido",
};

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-card rounded-xl2 shadow-card p-4 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${accent}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-display font-semibold text-ink leading-none">{value}</p>
        <p className="text-xs text-gray-500 mt-1">{label}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.getStats().then(setStats).catch(() => {});
  }, []);

  useLeadEvents(() => api.getStats().then(setStats).catch(() => {}), { sound: false });

  if (!stats) {
    return <div className="p-6 text-gray-400 text-sm">Carregando métricas...</div>;
  }

  const maxStatus = Math.max(...stats.byStatus.map((s) => s.count), 1);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <h1 className="font-display text-xl font-semibold text-ink mb-1">Painel</h1>
      <p className="text-sm text-gray-500 mb-6">Visão geral da operação de leads da equipe.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Users} label="Leads totais" value={stats.total} accent="bg-brand" />
        <StatCard icon={Target} label="Taxa de conversão" value={`${stats.taxaConversao}%`} accent="bg-ganho" />
        <StatCard icon={TrendingUp} label="Negócios ganhos" value={stats.ganhos} accent="bg-morno" />
        <StatCard icon={AlertTriangle} label="Sem atribuição" value={stats.semAtribuicao} accent="bg-perdido" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-xl2 shadow-card p-5">
          <h2 className="font-display font-semibold text-ink text-sm mb-4 flex items-center gap-2">
            <AlertCircle size={16} className="text-perdido" /> Corretores com mais leads sem resposta
          </h2>
          {stats.semResposta?.length ? (
            <div className="space-y-3">
              {stats.semResposta.map((r, i) => (
                <div key={r.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 truncate">
                    <span className="text-gray-400 mr-2">{i + 1}</span>
                    {r.name}
                  </span>
                  <span className="text-xs font-semibold text-perdido bg-perdido/10 rounded-full px-2 py-0.5 shrink-0">
                    {r.total} lead{r.total > 1 ? "s" : ""}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">Ninguém com pendências agora. 🎉</p>
          )}
        </div>

        <div className="bg-card rounded-xl2 shadow-card p-5">
          <h2 className="font-display font-semibold text-ink text-sm mb-4 flex items-center gap-2">
            <Trophy size={16} className="text-morno" /> Resposta mais rápida
          </h2>
          {stats.respostaRapida?.length ? (
            <div className="space-y-3">
              {stats.respostaRapida.map((r, i) => (
                <div key={r.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 truncate">
                    <span className="mr-2">{["🥇", "🥈", "🥉"][i] || `#${i + 1}`}</span>
                    {r.name}
                  </span>
                  <span className="text-xs font-medium text-ink shrink-0">{formatMinutes(r.media_minutos)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">Ainda sem dados suficientes.</p>
          )}
        </div>

        <div className="bg-card rounded-xl2 shadow-card p-5 flex flex-col justify-center items-center text-center">
          <h2 className="font-display font-semibold text-ink text-sm mb-2 flex items-center gap-2">
            <Timer size={16} className="text-brand-dark" /> Tempo médio de resposta
          </h2>
          <p className="text-3xl font-display font-semibold text-brand-dark">{formatMinutes(stats.tempoMedioMinutos)}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl2 shadow-card p-5">
          <h2 className="font-display font-semibold text-ink text-sm mb-4">Funil por etapa</h2>
          <div className="space-y-3">
            {stats.byStatus.map((s) => (
              <div key={s.status}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600 font-medium">{STATUS_LABELS[s.status] || s.status}</span>
                  <span className="text-gray-400">{s.count}</span>
                </div>
                <div className="h-2 rounded-full bg-line overflow-hidden">
                  <div
                    className="h-full bg-brand rounded-full"
                    style={{ width: `${(s.count / maxStatus) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl2 shadow-card p-5">
          <h2 className="font-display font-semibold text-ink text-sm mb-4">Temperatura dos leads</h2>
          <div className="space-y-3">
            {stats.byTemperature.map((t) => (
              <div key={t.temperature} className="flex items-center justify-between">
                <TempBadge temperature={t.temperature} />
                <span className="text-sm font-medium text-ink">{t.count}</span>
              </div>
            ))}
          </div>

          <h2 className="font-display font-semibold text-ink text-sm mt-6 mb-3">Ranking de corretores</h2>
          <div className="space-y-2">
            {stats.ranking.map((r, i) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  <span className="text-gray-400 mr-2">#{i + 1}</span>
                  {r.name}
                </span>
                <span className="font-medium text-ink">
                  {r.ganhos} <span className="text-gray-400 font-normal">/ {r.total_leads}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
