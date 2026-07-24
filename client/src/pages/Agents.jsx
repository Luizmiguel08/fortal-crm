import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../AuthContext.jsx";

function NewAgentModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { agent } = await api.createAgent(form);
      onCreated(agent);
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
          <h2 className="font-display font-semibold text-ink">Novo corretor</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input required placeholder="Nome" className="w-full rounded-lg border border-line px-3 py-2 text-sm"
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input required type="email" placeholder="Email" className="w-full rounded-lg border border-line px-3 py-2 text-sm"
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input required type="password" placeholder="Senha provisória" className="w-full rounded-lg border border-line px-3 py-2 text-sm"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          {error && <p className="text-sm text-perdido">{error}</p>}
          <button disabled={saving} className="w-full bg-brand text-ink rounded-lg py-2.5 text-sm font-medium disabled:opacity-60">
            {saving ? "Salvando..." : "Criar corretor"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Agents() {
  const { user } = useAuth();
  const [agents, setAgents] = useState([]);
  const [showModal, setShowModal] = useState(false);

  function load() {
    api.getAgents().then((d) => setAgents(d.agents));
  }

  useEffect(load, []);

  async function toggleActive(agent) {
    const { agent: updated } = await api.updateAgent(agent.id, { active: !agent.active });
    setAgents((prev) => prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)));
  }

  async function toggleBolsao(agent) {
    const { agent: updated } = await api.updateAgent(agent.id, { sees_bolsao: !agent.sees_bolsao });
    setAgents((prev) => prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)));
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {showModal && (
        <NewAgentModal onClose={() => setShowModal(false)} onCreated={(a) => setAgents((p) => [...p, { ...a, total_leads: 0, leads_ganhos: 0 }])} />
      )}

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink">Corretores</h1>
          <p className="text-sm text-gray-500">Equipe elegível para distribuição automática de leads.</p>
        </div>
        {user?.role === "admin" && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 bg-brand text-ink rounded-lg px-4 py-2 text-sm font-medium"
          >
            <Plus size={16} /> Novo corretor
          </button>
        )}
      </div>

      <div className="bg-card rounded-xl2 shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 border-b border-line">
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium hidden sm:table-cell">Email</th>
              <th className="px-4 py-3 font-medium">Leads</th>
              <th className="px-4 py-3 font-medium">Ganhos</th>
              <th className="px-4 py-3 font-medium hidden sm:table-cell">Vê o bolsão</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((a) => (
              <tr key={a.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-medium text-ink">{a.name}</td>
                <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{a.email}</td>
                <td className="px-4 py-3">{a.total_leads}</td>
                <td className="px-4 py-3">{a.leads_ganhos}</td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <button
                    onClick={() => toggleBolsao(a)}
                    disabled={user?.role !== "admin"}
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      a.sees_bolsao ? "bg-brand/10 text-brand-dark" : "bg-line text-gray-400"
                    }`}
                  >
                    {a.sees_bolsao ? "Sim" : "Não"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  {a.role === "admin" ? (
                    <span className="text-xs text-gray-400">Admin</span>
                  ) : (
                    <button
                      onClick={() => toggleActive(a)}
                      disabled={user?.role !== "admin"}
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        a.active ? "bg-ganho/10 text-ganho" : "bg-perdido/10 text-perdido"
                      }`}
                    >
                      {a.active ? "Ativo" : "Inativo"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
