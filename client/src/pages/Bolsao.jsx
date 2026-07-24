import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Inbox, Clock, Settings, BarChart3 } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import TempBadge from "../components/TempBadge.jsx";

function timeSince(dateStr) {
  const diff = Date.now() - new Date(dateStr + "Z").getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h}h${min % 60}min`;
}

export default function Bolsao() {
  const [data, setData] = useState(null);
  const [claiming, setClaiming] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  function load() {
    api.getBolsao().then(setData);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, []);

  async function handleClaim(id) {
    setClaiming(id);
    try {
      await api.claimBolsaoLead(id);
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setClaiming(null);
    }
  }

  if (!data) return <div className="p-6 text-gray-400 text-sm">Carregando...</div>;

  if (!data.canView) {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto text-center py-16">
        <Inbox className="mx-auto text-gray-300 mb-3" size={40} />
        <h1 className="font-display text-lg font-semibold text-ink mb-1">Bolsão de leads</h1>
        <p className="text-sm text-gray-500">
          Você não tem permissão para visualizar o bolsão. Fale com o administrador da conta.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Inbox size={20} className="text-brand" />
          <h1 className="font-display text-xl font-semibold text-ink">Bolsão de leads</h1>
        </div>
        {user?.role === "admin" && (
          <div className="flex gap-1">
            <Link to="/bolsao/relatorio" className="p-2 text-gray-400 hover:text-brand" title="Relatório">
              <BarChart3 size={18} />
            </Link>
            <Link to="/bolsao/configuracoes" className="p-2 text-gray-400 hover:text-brand" title="Configurações">
              <Settings size={18} />
            </Link>
          </div>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Leads que não foram respondidos a tempo caem aqui. Clique para se tornar responsável.
      </p>

      {data.leads.length === 0 ? (
        <div className="bg-card rounded-xl2 shadow-card p-10 text-center text-sm text-gray-400">
          Nenhum lead no bolsão agora. Tudo em dia! 🎉
        </div>
      ) : (
        <div className="space-y-2">
          {data.leads.map((lead) => (
            <div key={lead.id} className="bg-card rounded-xl2 shadow-card p-4 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-ink truncate">{lead.name}</p>
                  <TempBadge temperature={lead.temperature} showLabel={false} />
                </div>
                {lead.interest && <p className="text-xs text-gray-500 truncate">{lead.interest}</p>}
                <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> no bolsão há {timeSince(lead.assigned_at)}
                  </span>
                  <span>era de {lead.agent_name}</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => navigate(`/leads/${lead.id}`)}
                  className="text-sm text-gray-500 px-3 py-2"
                >
                  Ver
                </button>
                <button
                  onClick={() => handleClaim(lead.id)}
                  disabled={claiming === lead.id}
                  className="bg-brand text-ink rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
                >
                  {claiming === lead.id ? "Assumindo..." : "Assumir lead"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
