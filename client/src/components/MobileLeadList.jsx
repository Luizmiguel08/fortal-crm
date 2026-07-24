import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, SlidersHorizontal } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import ResponseCountdown from "./ResponseCountdown.jsx";
import { useLeadEvents } from "../lib/liveEvents.js";

const TABS = [
  { key: "a_fazer", label: "A fazer" },
  { key: "visitas", label: "Visitas" },
  { key: "futuras", label: "Futuras" },
  { key: "favoritos", label: "Favoritos" },
  { key: "todos", label: "Todos" },
];

const DONE_STATUSES = ["ganho", "perdido"];

function isNaoRespondido(lead) {
  if (!lead.assigned_at) return false;
  return !lead.last_contact_at || lead.last_contact_at < lead.assigned_at;
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + (iso.includes("Z") ? "" : "Z"));
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function LeadRow({ lead, onClick }) {
  const naoRespondido = isNaoRespondido(lead) && !DONE_STATUSES.includes(lead.status) && !lead.in_bolsao;
  return (
    <div onClick={onClick} className="bg-white border-b border-line px-4 py-3 active:bg-surface">
      <div className="flex items-center justify-between mb-1">
        <p className="font-semibold text-ink text-[15px] truncate">{lead.name}</p>
        {lead.in_bolsao ? (
          <ResponseCountdown lead={lead} compact />
        ) : naoRespondido ? (
          <ResponseCountdown lead={lead} compact />
        ) : (
          <span className="text-[11px] text-gray-400 shrink-0">
            {lead.status === "ganho" ? "Ganho" : lead.status === "perdido" ? "Perdido" : "Em atendimento"}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-0.5 flex items-center gap-1.5">📣 {lead.interest || "Indefinido"}</p>
      <p className="text-sm text-gray-500 mb-1.5">
        💲 {lead.deal_value ? `R$ ${Number(lead.deal_value).toLocaleString("pt-BR")}` : "Indefinido -"}
      </p>
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{lead.source}</span>
        <span>{lead.agent ? lead.agent.name : "Sem corretor"}</span>
      </div>
      <p className="text-[11px] text-gray-400 mt-1">
        {lead.next_activity_at ? `Agendado: ${formatDate(lead.next_activity_at)}` : `Recebido: ${formatDate(lead.created_at)}`}
      </p>
    </div>
  );
}

export default function MobileLeadList() {
  const [leads, setLeads] = useState([]);
  const [tab, setTab] = useState("a_fazer");
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  function load() {
    api.getLeads(query ? { q: query } : {}).then((d) => setLeads(d.leads));
  }

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const t = setInterval(load, 20000); // atualiza sozinho, já que o bolsão se move com o tempo
    return () => clearInterval(t);
  }, [query]);

  useLeadEvents(() => load(), { sound: false });

  useEffect(() => {
    api
      .getMyQueuePosition()
      .then((d) => setPosition(d))
      .catch(() => setPosition(null));
  }, []);

  const meusLeads = useMemo(() => leads.filter((l) => l.assigned_to === user?.id && !l.in_bolsao), [leads, user]);

  const filtered = useMemo(() => {
    switch (tab) {
      case "a_fazer":
        return meusLeads.filter((l) => !DONE_STATUSES.includes(l.status) && isNaoRespondido(l));
      case "visitas":
        return meusLeads.filter((l) => l.next_activity_type === "visita");
      case "futuras":
        return meusLeads.filter((l) => l.next_activity_at && new Date(l.next_activity_at) > new Date());
      case "favoritos":
        return meusLeads.filter((l) => l.is_favorite);
      case "todos":
      default:
        return meusLeads;
    }
  }, [meusLeads, tab]);

  const pendentesCount = meusLeads.filter((l) => !DONE_STATUSES.includes(l.status) && isNaoRespondido(l)).length;

  const counts = {
    a_fazer: pendentesCount,
    visitas: meusLeads.filter((l) => l.next_activity_type === "visita").length,
    futuras: meusLeads.filter((l) => l.next_activity_at && new Date(l.next_activity_at) > new Date()).length,
    favoritos: meusLeads.filter((l) => l.is_favorite).length,
    todos: meusLeads.length,
  };

  return (
    <div className="md:hidden">
      <div className="px-4 pt-3 pb-2 bg-surface sticky top-14 z-20 border-b border-line">
        <div className="flex items-center gap-2 mb-3">
          {position?.position && (
            <div className="flex flex-col items-center leading-none shrink-0">
              <span className="text-lg font-display font-bold text-brand-dark">{position.position}°</span>
              <span className="text-[9px] text-gray-400">na fila</span>
            </div>
          )}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              placeholder="Busque por nome, telefone..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-line text-sm bg-white"
            />
          </div>
          <button className="p-2 rounded-lg border border-line bg-white shrink-0">
            <SlidersHorizontal size={16} className="text-ink" />
          </button>
        </div>

        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border ${
                tab === t.key ? "bg-brand text-ink border-brand" : "bg-white text-gray-500 border-line"
              }`}
            >
              {t.label}
              {counts[t.key] > 0 && (
                <span className={`text-[10px] rounded-full px-1.5 ${tab === t.key ? "bg-ink/10" : "bg-line"}`}>{counts[t.key]}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {tab === "a_fazer" && filtered.length > 0 && (
        <p className="px-4 pt-3 pb-1 text-sm font-semibold text-ink">Não respondidas ({filtered.length})</p>
      )}

      {filtered.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-gray-400">
          {tab === "a_fazer" ? "Nenhum lead pendente por aqui. 🎉" : "Nada por aqui ainda."}
        </div>
      ) : (
        <div>
          {filtered.map((lead) => (
            <LeadRow key={lead.id} lead={lead} onClick={() => navigate(`/leads/${lead.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
