import { useEffect, useState } from "react";
import { Plus, LogIn, LogOut, UserPlus, X, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.jsx";

function NewStandModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { stand } = await api.createStand(form);
      onCreated(stand);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/60 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl2 w-full max-w-sm p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-display font-semibold text-ink">Novo estande</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input required placeholder="Nome (ex: Feirão Shopping Sul)" className="w-full rounded-lg border border-line px-3 py-2 text-sm"
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Descrição (opcional)" className="w-full rounded-lg border border-line px-3 py-2 text-sm"
            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <button disabled={saving} className="w-full bg-brand text-ink rounded-lg py-2.5 text-sm font-medium disabled:opacity-60">
            {saving ? "Criando..." : "Criar estande"}
          </button>
        </form>
      </div>
    </div>
  );
}

function CaptureLeadModal({ stand, onClose, onCreated }) {
  const [form, setForm] = useState({ name: "", phone: "", email: "", interest: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { seller } = await api.createStandLead(stand.id, form);
      onCreated(seller);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/60 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl2 w-full max-w-sm p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-display font-semibold text-ink">Capturar lead — {stand.name}</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input required placeholder="Nome do visitante" className="w-full rounded-lg border border-line px-3 py-2 text-sm"
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Telefone" className="w-full rounded-lg border border-line px-3 py-2 text-sm"
            value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input placeholder="Email" className="w-full rounded-lg border border-line px-3 py-2 text-sm"
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input placeholder="Interesse" className="w-full rounded-lg border border-line px-3 py-2 text-sm"
            value={form.interest} onChange={(e) => setForm({ ...form, interest: e.target.value })} />
          {error && <p className="text-sm text-perdido">{error}</p>}
          <button disabled={saving} className="w-full bg-brand text-ink rounded-lg py-2.5 text-sm font-medium disabled:opacity-60">
            {saving ? "Salvando..." : "Capturar e distribuir"}
          </button>
        </form>
      </div>
    </div>
  );
}

function StandCard({ stand, onChanged }) {
  const { user } = useAuth();
  const [active, setActive] = useState([]);
  const [showCapture, setShowCapture] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [summary, setSummary] = useState(null);
  const [lastAssigned, setLastAssigned] = useState(null);

  function loadActive() {
    api.getStandActive(stand.id).then((d) => setActive(d.active));
  }
  useEffect(loadActive, [stand.id]);

  const myCheckin = active.find((a) => a.id === user?.id);

  async function handleCheckin() {
    await api.standCheckin(stand.id);
    loadActive();
    onChanged();
  }
  async function handleCheckout() {
    await api.standCheckout(stand.id);
    loadActive();
    onChanged();
  }

  async function toggleExpand() {
    setExpanded((e) => !e);
    if (!expanded && !summary) {
      const d = await api.getStandAttendance(stand.id);
      setSummary(d.summary);
    }
  }

  async function handleDelete() {
    if (!confirm(`Excluir o estande "${stand.name}"?`)) return;
    await api.deleteStand(stand.id);
    onChanged();
  }

  return (
    <div className="bg-card rounded-xl2 shadow-card p-4">
      {showCapture && (
        <CaptureLeadModal
          stand={stand}
          onClose={() => setShowCapture(false)}
          onCreated={(seller) => setLastAssigned(seller.name)}
        />
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="font-medium text-ink text-sm">{stand.name}</p>
          <p className="text-xs text-gray-500">
            {stand.description || "Sem descrição"} · {stand.activeCount} com check-in agora
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {myCheckin ? (
            <button onClick={handleCheckout} className="flex items-center gap-1.5 text-xs font-medium text-perdido border border-perdido/30 rounded-lg px-3 py-1.5">
              <LogOut size={14} /> Check-out
            </button>
          ) : (
            <button onClick={handleCheckin} className="flex items-center gap-1.5 text-xs font-medium text-ganho border border-ganho/30 rounded-lg px-3 py-1.5">
              <LogIn size={14} /> Check-in
            </button>
          )}
          <button onClick={() => setShowCapture(true)} className="flex items-center gap-1.5 text-xs font-medium bg-brand text-ink rounded-lg px-3 py-1.5">
            <UserPlus size={14} /> Capturar lead
          </button>
          {user?.role === "admin" && (
            <button onClick={handleDelete} className="text-perdido"><Trash2 size={15} /></button>
          )}
        </div>
      </div>

      {lastAssigned && (
        <p className="text-xs text-ganho mt-2">✓ Lead distribuído para {lastAssigned}</p>
      )}

      {active.length > 0 && (
        <p className="text-xs text-gray-400 mt-2">
          Com check-in: {active.map((a) => a.name).join(", ")}
        </p>
      )}

      <button onClick={toggleExpand} className="flex items-center gap-1 text-xs text-brand-dark font-medium mt-3">
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Resumo de presenças
      </button>

      {expanded && (
        <div className="mt-2 border-t border-line pt-2">
          {!summary || summary.length === 0 ? (
            <p className="text-xs text-gray-400">Sem histórico de presenças ainda.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-400">
                  <th className="py-1 font-medium">Vendedor</th>
                  <th className="py-1 font-medium">Presenças</th>
                  <th className="py-1 font-medium">Leads recebidos</th>
                  <th className="py-1 font-medium">Tempo médio</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((s) => (
                  <tr key={s.id} className="border-t border-line">
                    <td className="py-1.5 text-ink font-medium">{s.name}</td>
                    <td className="py-1.5">{s.total_attendances}</td>
                    <td className="py-1.5">{s.total_leads_received}</td>
                    <td className="py-1.5">{s.average_attendance_time_minutes != null ? `${s.average_attendance_time_minutes} min` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default function Stands() {
  const { user } = useAuth();
  const [stands, setStands] = useState([]);
  const [showModal, setShowModal] = useState(false);

  function load() {
    api.getStands().then((d) => setStands(d.stands));
  }
  useEffect(load, []);

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      {showModal && (
        <NewStandModal onClose={() => setShowModal(false)} onCreated={(s) => setStands((p) => [s, ...p])} />
      )}

      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-xl font-semibold text-ink">Stand de vendas</h1>
        {user?.role === "admin" && (
          <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 bg-brand text-ink rounded-lg px-4 py-2 text-sm font-medium">
            <Plus size={16} /> Novo estande
          </button>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Faça check-in quando estiver presente num evento/estande — os leads capturados ali são
        distribuídos só entre quem estiver com check-in feito no momento.
      </p>

      <div className="space-y-3">
        {stands.length === 0 && (
          <div className="bg-card rounded-xl2 shadow-card p-8 text-center text-sm text-gray-400">
            Nenhum estande cadastrado ainda.
          </div>
        )}
        {stands.map((s) => (
          <StandCard key={s.id} stand={s} onChanged={load} />
        ))}
      </div>
    </div>
  );
}
