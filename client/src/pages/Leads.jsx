import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, X, Trash2 } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import TempBadge from "../components/TempBadge.jsx";
import ResponseCountdown from "../components/ResponseCountdown.jsx";
import MobileLeadList from "../components/MobileLeadList.jsx";
import { useLeadEvents } from "../lib/liveEvents.js";

function ClearLeadsModal({ onClose, onConfirm }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const canConfirm = text === "APAGAR TUDO";

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/60 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl2 w-full max-w-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <Trash2 size={20} className="text-perdido" />
          <h2 className="font-display font-semibold text-ink">Apagar todos os leads</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Isso apaga <strong>permanentemente</strong> todos os leads, mensagens e atividades do sistema — inclusive os
          que vieram de integrações reais. Não dá pra desfazer.
        </p>
        <p className="text-xs text-gray-500 mb-2">
          Pra confirmar, digite <strong>APAGAR TUDO</strong> abaixo:
        </p>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full rounded-lg border border-line px-3 py-2 text-sm mb-4"
          placeholder="APAGAR TUDO"
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-lg border border-line py-2.5 text-sm font-medium text-ink">
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm || loading}
            className="flex-1 rounded-lg bg-perdido text-white py-2.5 text-sm font-medium disabled:opacity-40"
          >
            {loading ? "Apagando..." : "Apagar tudo"}
          </button>
        </div>
      </div>
    </div>
  );
}

const COLUMNS = [
  { key: "novo", label: "Novo" },
  { key: "atendimento", label: "Em atendimento" },
  { key: "qualificado", label: "Qualificado" },
  { key: "proposta", label: "Proposta" },
  { key: "ganho", label: "Ganho" },
  { key: "perdido", label: "Perdido" },
];

function NewLeadModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: "", phone: "", phone2: "", email: "", source: "manual", interest: "", uf: "", cidade: "", bairro: "" });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { lead } = await api.createLead(form);
      onCreated(lead);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/60 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl2 w-full max-w-md p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-display font-semibold text-ink">Novo lead</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input required placeholder="Nome" className="w-full rounded-lg border border-line px-3 py-2 text-sm"
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Telefone" className="w-full rounded-lg border border-line px-3 py-2 text-sm"
              value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input placeholder="Telefone 2 (opcional)" className="w-full rounded-lg border border-line px-3 py-2 text-sm"
              value={form.phone2} onChange={(e) => setForm({ ...form, phone2: e.target.value })} />
          </div>
          <input placeholder="Email" className="w-full rounded-lg border border-line px-3 py-2 text-sm"
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input placeholder="Interesse (ex: Apto 2 quartos)" className="w-full rounded-lg border border-line px-3 py-2 text-sm"
            value={form.interest} onChange={(e) => setForm({ ...form, interest: e.target.value })} />
          <div className="grid grid-cols-3 gap-2">
            <input placeholder="UF" maxLength={2} className="w-full rounded-lg border border-line px-3 py-2 text-sm uppercase"
              value={form.uf} onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })} />
            <input placeholder="Cidade" className="col-span-2 w-full rounded-lg border border-line px-3 py-2 text-sm"
              value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
          </div>
          <input placeholder="Bairro" className="w-full rounded-lg border border-line px-3 py-2 text-sm"
            value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} />
          <p className="text-xs text-gray-400 -mt-1">UF/cidade/bairro são usados pelas regras de distribuição por região.</p>
          <select className="w-full rounded-lg border border-line px-3 py-2 text-sm"
            value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
            <option value="manual">Cadastro manual</option>
            <option value="Portal Imob">Portal Imob</option>
            <option value="Site próprio">Site próprio</option>
            <option value="Facebook Ads">Facebook Ads</option>
            <option value="Google Ads">Google Ads</option>
            <option value="Indicação">Indicação</option>
          </select>
          <button disabled={saving} className="w-full bg-brand text-ink rounded-lg py-2.5 text-sm font-medium disabled:opacity-60">
            {saving ? "Salvando..." : "Criar e distribuir automaticamente"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [query, setQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [dragId, setDragId] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  function load() {
    api.getLeads(query ? { q: query } : {}).then((d) => setLeads(d.leads));
  }

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [query]);

  useLeadEvents((lead) => {
    setLeads((prev) => (prev.some((l) => l.id === lead.id) ? prev : [lead, ...prev]));
  });

  async function handleDrop(status) {
    if (!dragId) return;
    setLeads((prev) => prev.map((l) => (l.id === dragId ? { ...l, status } : l)));
    await api.updateLead(dragId, { status });
    setDragId(null);
  }

  return (
    <div className="md:p-8">
      {showModal && (
        <NewLeadModal onClose={() => setShowModal(false)} onCreated={(l) => setLeads((p) => [l, ...p])} />
      )}
      {showClearModal && (
        <ClearLeadsModal
          onClose={() => setShowClearModal(false)}
          onConfirm={async () => {
            await api.deleteAllLeads();
            setLeads([]);
          }}
        />
      )}

      <MobileLeadList />
      <button
        onClick={() => setShowModal(true)}
        className="md:hidden fixed bottom-20 right-4 z-20 w-12 h-12 rounded-full bg-brand text-ink shadow-soft flex items-center justify-center"
      >
        <Plus size={22} />
      </button>

      <div className="hidden md:block p-4 md:p-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink">Leads</h1>
          <p className="text-sm text-gray-500">Arraste os cards entre as etapas do funil.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              placeholder="Buscar lead..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 pr-3 py-2 rounded-lg border border-line text-sm w-48"
            />
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 bg-brand text-ink rounded-lg px-4 py-2 text-sm font-medium"
          >
            <Plus size={16} /> Novo lead
          </button>
          {user?.role === "admin" && (
            <button
              onClick={() => setShowClearModal(true)}
              title="Apagar todos os leads (dados de teste)"
              className="flex items-center gap-1.5 border border-line text-perdido rounded-lg px-3 py-2 text-sm font-medium"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0">
        {COLUMNS.map((col) => {
          const items = leads.filter((l) => l.status === col.key);
          return (
            <div
              key={col.key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(col.key)}
              className="flex-shrink-0 w-72 bg-white/60 rounded-xl2 p-3"
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-sm font-semibold text-ink">{col.label}</span>
                <span className="text-xs text-gray-400 bg-line rounded-full px-2 py-0.5">{items.length}</span>
              </div>
              <div className="space-y-2 min-h-[60px]">
                {items.map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={() => setDragId(lead.id)}
                    onClick={() => navigate(`/leads/${lead.id}`)}
                    className="bg-card rounded-xl shadow-card p-3 cursor-pointer hover:shadow-soft transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="font-medium text-sm text-ink truncate">{lead.name}</p>
                      <TempBadge temperature={lead.temperature} showLabel={false} />
                    </div>
                    {lead.interest && (
                      <p className="text-xs text-gray-500 truncate mb-1.5">{lead.interest}</p>
                    )}
                    <div className="mb-1.5">
                      <ResponseCountdown lead={lead} compact />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-400">{lead.source}</span>
                      <span className="text-[11px] text-gray-400">
                        {lead.agent ? lead.agent.name.split(" ")[0] : "Sem corretor"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}
