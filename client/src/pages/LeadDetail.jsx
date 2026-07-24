import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Phone, Mail, MapPin, MessageCircle, X, Plus, Tag as TagIcon } from "lucide-react";
import { api } from "../api.js";
import TempBadge from "../components/TempBadge.jsx";

const STATUS_OPTIONS = ["novo", "atendimento", "qualificado", "proposta", "ganho", "perdido"];
const TEMP_OPTIONS = ["quente", "morno", "frio"];

function DealModal({ onClose, onConfirm }) {
  const [form, setForm] = useState({ value: "", date: new Date().toISOString().slice(0, 10), type: "venda" });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onConfirm(form);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/60 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl2 w-full max-w-sm p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-display font-semibold text-ink">Fechar negócio</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500">Valor do negócio (R$)</label>
            <input type="number" step="0.01" className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
              value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Data</label>
            <input type="date" className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
              value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Tipo de negociação</label>
            <select className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
              value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="venda">Venda</option>
              <option value="aluguel">Aluguel</option>
            </select>
          </div>
          <button disabled={saving} className="w-full bg-ganho text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-60">
            {saving ? "Salvando..." : "Confirmar negócio ganho"}
          </button>
        </form>
      </div>
    </div>
  );
}

function LostReasonModal({ reasons, onClose, onConfirm }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onConfirm(reason);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/60 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl2 w-full max-w-sm p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-display font-semibold text-ink">Motivo da perda</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <select className="w-full rounded-lg border border-line px-3 py-2 text-sm" value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="">Selecione (opcional)</option>
            {reasons.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
          </select>
          <button disabled={saving} className="w-full bg-perdido text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-60">
            {saving ? "Salvando..." : "Marcar como perdido"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [agents, setAgents] = useState([]);
  const [tab, setTab] = useState("whatsapp"); // whatsapp | timeline
  const [queues, setQueues] = useState([]);
  const [redistributeQueue, setRedistributeQueue] = useState("");
  const [redistributing, setRedistributing] = useState(false);
  const [allTags, setAllTags] = useState([]);
  const [lostReasons, setLostReasons] = useState([]);
  const [showDealModal, setShowDealModal] = useState(false);
  const [showLostModal, setShowLostModal] = useState(false);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);
  const bottomRef = useRef(null);

  function load() {
    api.getLead(id).then(setData);
  }

  useEffect(() => {
    load();
    api.getAgents().then((d) => setAgents(d.agents));
    api.getQueues().then((d) => setQueues(d.queues)).catch(() => {});
    api.getTags().then((d) => setAllTags(d.tags));
    api.getLostReasons().then((d) => setLostReasons(d.reasons));
    api.markLeadInteracted(id).catch(() => {});
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data, tab]);

  if (!data) return <div className="p-6 text-gray-400 text-sm">Carregando...</div>;
  const { lead, activities, messages } = data;

  async function updateField(field, value) {
    const { lead: updated } = await api.updateLead(id, { [field]: value });
    setData((d) => ({ ...d, lead: updated }));
  }

  function handleStatusChange(value) {
    if (value === "ganho") {
      setShowDealModal(true);
    } else if (value === "perdido") {
      setShowLostModal(true);
    } else {
      updateField("status", value);
    }
  }

  async function handleCloseDeal(form) {
    const { lead: updated } = await api.closeDeal(id, form);
    setData((d) => ({ ...d, lead: updated }));
  }

  async function handleMarkLost(reason) {
    const { lead: updated } = await api.updateLead(id, { status: "perdido", lost_reason: reason });
    setData((d) => ({ ...d, lead: updated }));
  }

  async function handleAddTag(tagId) {
    const { tags } = await api.addLeadTag(id, tagId);
    setData((d) => ({ ...d, lead: { ...d.lead, tags } }));
    setTagPickerOpen(false);
  }

  async function handleRemoveTag(tagId) {
    const { tags } = await api.removeLeadTag(id, tagId);
    setData((d) => ({ ...d, lead: { ...d.lead, tags } }));
  }

  async function handleRedistribute() {
    if (!redistributeQueue) return;
    setRedistributing(true);
    try {
      await api.redistributeLead(redistributeQueue, id);
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setRedistributing(false);
    }
  }

  async function handleAddNote(e) {
    e.preventDefault();
    if (!note.trim()) return;
    const { activities } = await api.addActivity(id, { type: "nota", content: note });
    setData((d) => ({ ...d, activities }));
    setNote("");
  }

  async function handleSendMessage(e) {
    e.preventDefault();
    if (!msg.trim()) return;
    const { message } = await api.sendMessage(id, msg);
    setData((d) => ({ ...d, messages: [...d.messages, message] }));
    setMsg("");
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      {showDealModal && <DealModal onClose={() => setShowDealModal(false)} onConfirm={handleCloseDeal} />}
      {showLostModal && <LostReasonModal reasons={lostReasons} onClose={() => setShowLostModal(false)} onConfirm={handleMarkLost} />}

      <button onClick={() => navigate("/leads")} className="flex items-center gap-1.5 text-sm text-gray-500 mb-4">
        <ArrowLeft size={16} /> Voltar para leads
      </button>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Info lateral */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-card rounded-xl2 shadow-card p-5">
            <div className="flex items-center justify-between mb-1">
              <h1 className="font-display font-semibold text-lg text-ink">{lead.name}</h1>
              <TempBadge temperature={lead.temperature} showLabel={false} />
            </div>
            {lead.interest && <p className="text-sm text-gray-500 mb-3">{lead.interest}</p>}

            <div className="flex flex-wrap items-center gap-1.5 mb-4">
              {(lead.tags || []).map((t) => (
                <span key={t.id} className="flex items-center gap-1 bg-brand/10 text-brand-dark text-xs font-medium px-2 py-1 rounded-full">
                  <TagIcon size={11} /> {t.name}
                  <button onClick={() => handleRemoveTag(t.id)} className="ml-0.5 hover:text-perdido"><X size={11} /></button>
                </span>
              ))}
              <div className="relative">
                <button onClick={() => setTagPickerOpen((o) => !o)} className="flex items-center gap-1 text-xs text-gray-400 border border-dashed border-line rounded-full px-2 py-1 hover:text-brand-dark hover:border-brand">
                  <Plus size={11} /> Tag
                </button>
                {tagPickerOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-white shadow-soft rounded-lg border border-line py-1 z-10 min-w-[140px]">
                    {allTags.filter((t) => !(lead.tags || []).some((lt) => lt.id === t.id)).map((t) => (
                      <button key={t.id} onClick={() => handleAddTag(t.id)} className="block w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-surface">
                        {t.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-600 mb-4">
              {lead.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-gray-400" /> {lead.phone}
                </div>
              )}
              {lead.phone2 && (
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-gray-400" /> {lead.phone2} <span className="text-xs text-gray-400">(2º telefone)</span>
                </div>
              )}
              {lead.email && (
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-gray-400" /> {lead.email}
                </div>
              )}
              {(lead.cidade || lead.uf || lead.bairro) && (
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-gray-400" />
                  {[lead.bairro, lead.cidade, lead.uf].filter(Boolean).join(", ")}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500">Etapa</label>
                <select
                  value={lead.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm capitalize"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {lead.status === "ganho" && lead.deal_value && (
                  <p className="text-xs text-ganho mt-1">
                    R$ {Number(lead.deal_value).toLocaleString("pt-BR")} {lead.deal_type && `· ${lead.deal_type}`}
                  </p>
                )}
                {lead.status === "perdido" && lead.lost_reason && (
                  <p className="text-xs text-perdido mt-1">Motivo: {lead.lost_reason}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Temperatura</label>
                <select
                  value={lead.temperature}
                  onChange={(e) => updateField("temperature", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm capitalize"
                >
                  {TEMP_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Corretor responsável</label>
                <select
                  value={lead.assigned_to || ""}
                  onChange={(e) => updateField("assigned_to", e.target.value ? Number(e.target.value) : null)}
                  className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
                >
                  <option value="">Sem atribuição</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              {queues.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-gray-500">Redistribuir por fila</label>
                  <div className="mt-1 flex gap-2">
                    <select
                      value={redistributeQueue}
                      onChange={(e) => setRedistributeQueue(e.target.value)}
                      className="flex-1 rounded-lg border border-line px-3 py-2 text-sm"
                    >
                      <option value="">Escolha a fila</option>
                      {queues.map((q) => (
                        <option key={q.id} value={q.id}>{q.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleRedistribute}
                      disabled={!redistributeQueue || redistributing}
                      className="bg-brand text-ink rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50 shrink-0"
                    >
                      {redistributing ? "..." : "Ir"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chat / timeline */}
        <div className="md:col-span-2 bg-card rounded-xl2 shadow-card flex flex-col h-[560px]">
          <div className="flex border-b border-line px-2">
            <button
              onClick={() => setTab("whatsapp")}
              className={`px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-1.5 ${
                tab === "whatsapp" ? "border-brand text-brand-dark" : "border-transparent text-gray-400"
              }`}
            >
              <MessageCircle size={15} /> WhatsApp
            </button>
            <button
              onClick={() => setTab("timeline")}
              className={`px-4 py-3 text-sm font-medium border-b-2 ${
                tab === "timeline" ? "border-brand text-brand-dark" : "border-transparent text-gray-400"
              }`}
            >
              Histórico
            </button>
          </div>

          {tab === "whatsapp" ? (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#EFEAE2]/40">
                {messages.length === 0 && (
                  <p className="text-center text-xs text-gray-400 mt-8">
                    Nenhuma mensagem ainda. Conecte sua conta do WhatsApp Business (ver server/routes/whatsapp.js) para envio real.
                  </p>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.direction === "out" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                        m.direction === "out" ? "bg-ganho/15 text-ink" : "bg-white text-ink shadow-sm"
                      }`}
                    >
                      {m.body}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
              <form onSubmit={handleSendMessage} className="p-3 border-t border-line flex gap-2">
                <input
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  placeholder="Escreva uma mensagem..."
                  className="flex-1 rounded-full border border-line px-4 py-2 text-sm"
                />
                <button type="submit" className="bg-brand text-ink rounded-full w-10 h-10 flex items-center justify-center shrink-0">
                  <Send size={16} />
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {activities.length === 0 && <p className="text-xs text-gray-400">Sem atividades registradas.</p>}
                {activities.map((a) => (
                  <div key={a.id} className="text-sm border-l-2 border-brand/30 pl-3">
                    <p className="text-ink">{a.content}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {a.user_name || "Sistema"} · {new Date(a.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                ))}
              </div>
              <form onSubmit={handleAddNote} className="p-3 border-t border-line flex gap-2">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Adicionar nota..."
                  className="flex-1 rounded-full border border-line px-4 py-2 text-sm"
                />
                <button type="submit" className="bg-ink text-white rounded-full px-4 text-sm font-medium">
                  Anotar
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
