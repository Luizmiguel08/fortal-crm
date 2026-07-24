import { useEffect, useState } from "react";
import { Plus, ChevronUp, ChevronDown, Trash2, Shield, X, Target } from "lucide-react";
import { api } from "../api.js";

function MembersModal({ queue, agents, onClose, onSaved }) {
  const [selected, setSelected] = useState(
    Object.fromEntries(queue.members.map((m) => [m.id, m.priority]))
  );
  const [saving, setSaving] = useState(false);

  function toggle(id) {
    setSelected((s) => {
      const copy = { ...s };
      if (id in copy) delete copy[id];
      else copy[id] = 0;
      return copy;
    });
  }

  function setPriority(id, value) {
    setSelected((s) => ({ ...s, [id]: Number(value) }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const userIds = Object.keys(selected).map(Number);
      const { queue: updated } = await api.setQueueMembers(queue.id, userIds);
      const priorities = Object.entries(selected).map(([user_id, priority]) => ({ user_id: Number(user_id), priority }));
      const { queue: withPriorities } = await api.setQueuePriorities(queue.id, priorities);
      onSaved(withPriorities || updated);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/60 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl2 w-full max-w-sm p-5">
        <div className="flex justify-between items-center mb-1">
          <h2 className="font-display font-semibold text-ink">Usuários ativos na fila</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Prioridade menor é atendido primeiro (0 = máxima prioridade). Deixe igual pra rodízio normal entre eles.
        </p>
        <div className="space-y-2 max-h-72 overflow-y-auto mb-4">
          {agents.map((a) => (
            <div key={a.id} className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer flex-1">
                <input type="checkbox" checked={a.id in selected} onChange={() => toggle(a.id)} className="accent-brand" />
                {a.name}
              </label>
              {a.id in selected && (
                <input
                  type="number"
                  min={0}
                  value={selected[a.id]}
                  onChange={(e) => setPriority(a.id, e.target.value)}
                  className="w-14 text-xs border border-line rounded px-1.5 py-1"
                />
              )}
            </div>
          ))}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-brand text-ink rounded-lg py-2.5 text-sm font-medium disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </div>
  );
}

function NextSellerModal({ queue, onClose, onSaved }) {
  const [userId, setUserId] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!userId) return;
    setSaving(true);
    try {
      const { queue: updated } = await api.setNextSeller(queue.id, Number(userId));
      onSaved(updated);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/60 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl2 w-full max-w-sm p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-display font-semibold text-ink">Definir próximo vendedor</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Vale só pro próximo lead que cair nesta fila — depois volta ao rodízio normal.
        </p>
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="w-full rounded-lg border border-line px-3 py-2 text-sm mb-4"
        >
          <option value="">Selecione um usuário da fila</option>
          {queue.members.filter((m) => m.active).map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        <button
          onClick={handleSave}
          disabled={saving || !userId}
          className="w-full bg-brand text-ink rounded-lg py-2.5 text-sm font-medium disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Definir"}
        </button>
      </div>
    </div>
  );
}

function RegionalRules({ agents }) {
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState({ cod_1: "", cod_2: "", cod_3: "", type_rule: "distribution", seller_id: "", priority: 0 });

  function load() {
    api.getRules().then((d) => setRules(d.rules));
  }
  useEffect(load, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.seller_id) return;
    await api.createRule({ ...form, seller_id: Number(form.seller_id), priority: Number(form.priority) });
    setForm({ cod_1: "", cod_2: "", cod_3: "", type_rule: "distribution", seller_id: "", priority: 0 });
    load();
  }

  async function toggleActive(rule) {
    await api.updateRule(rule.id, { active: !rule.active });
    load();
  }

  async function handleDelete(id) {
    if (!confirm("Excluir esta regra?")) return;
    await api.deleteRule(id);
    load();
  }

  return (
    <div className="bg-card rounded-xl2 shadow-card p-5">
      <div className="flex items-center gap-2 mb-1">
        <Target size={16} className="text-brand" />
        <h2 className="font-display font-semibold text-ink text-sm">Regras de distribuição por região</h2>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Se um lead novo bater com os códigos abaixo (ex: estado, cidade), ele vai direto pro vendedor
        da regra, antes mesmo de olhar as filas. "Rotação" faz rodízio entre todas as regras com os
        mesmos códigos; "Distribuição" sempre manda pro mesmo vendedor fixo.
      </p>

      <form onSubmit={handleCreate} className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
        <input placeholder="Cód. 1 (UF)" value={form.cod_1} onChange={(e) => setForm({ ...form, cod_1: e.target.value })} className="rounded-lg border border-line px-2.5 py-2 text-sm" />
        <input placeholder="Cód. 2 (cidade)" value={form.cod_2} onChange={(e) => setForm({ ...form, cod_2: e.target.value })} className="rounded-lg border border-line px-2.5 py-2 text-sm" />
        <input placeholder="Cód. 3 (bairro)" value={form.cod_3} onChange={(e) => setForm({ ...form, cod_3: e.target.value })} className="rounded-lg border border-line px-2.5 py-2 text-sm" />
        <select value={form.type_rule} onChange={(e) => setForm({ ...form, type_rule: e.target.value })} className="rounded-lg border border-line px-2.5 py-2 text-sm">
          <option value="distribution">Distribuição (fixo)</option>
          <option value="rotation">Rotação</option>
        </select>
        <select value={form.seller_id} onChange={(e) => setForm({ ...form, seller_id: e.target.value })} className="rounded-lg border border-line px-2.5 py-2 text-sm" required>
          <option value="">Vendedor</option>
          {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <button className="bg-brand text-ink rounded-lg px-3 py-2 text-sm font-medium flex items-center justify-center gap-1">
          <Plus size={14} /> Criar
        </button>
      </form>

      <div className="space-y-1.5">
        {rules.length === 0 && <p className="text-sm text-gray-400">Nenhuma regra cadastrada.</p>}
        {rules.map((r) => (
          <div key={r.id} className="flex items-center justify-between text-sm border border-line rounded-lg px-3 py-2">
            <div>
              <span className="font-medium text-ink">{[r.cod_1, r.cod_2, r.cod_3].filter(Boolean).join(" / ") || "Qualquer região"}</span>
              <span className="text-gray-400"> → {r.seller_name}</span>
              <span className="text-xs text-gray-400 ml-2">({r.type_rule === "rotation" ? "rotação" : "fixo"}, prio. {r.priority})</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => toggleActive(r)}
                className={`w-9 h-5 rounded-full relative transition-colors ${r.active ? "bg-brand" : "bg-line"}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${r.active ? "translate-x-4" : "translate-x-0.5"}`} />
              </button>
              <button onClick={() => handleDelete(r.id)} className="text-perdido"><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Distribution() {
  const [queues, setQueues] = useState([]);
  const [agents, setAgents] = useState([]);
  const [fallback, setFallbackState] = useState(null);
  const [editingMembers, setEditingMembers] = useState(null);
  const [editingNextSeller, setEditingNextSeller] = useState(null);
  const [newName, setNewName] = useState("");

  function load() {
    api.getQueues().then((d) => setQueues(d.queues));
    api.getAgents().then((d) => setAgents(d.agents));
    api.getFallback().then((d) => setFallbackState(d.fallback_user_id));
  }
  useEffect(load, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    await api.createQueue(newName);
    setNewName("");
    load();
  }

  async function toggleActive(queue) {
    await api.updateQueue(queue.id, { active: !queue.active });
    load();
  }

  async function handleDelete(id) {
    if (!confirm("Excluir esta fila? Os corretores dela deixam de receber leads automaticamente por ela.")) return;
    await api.deleteQueue(id);
    load();
  }

  async function move(index, direction) {
    const newOrder = [...queues];
    const target = index + direction;
    if (target < 0 || target >= newOrder.length) return;
    [newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]];
    setQueues(newOrder);
    await api.reorderQueues(newOrder.map((q) => q.id));
    load();
  }

  async function handleFallbackChange(userId) {
    setFallbackState(userId);
    await api.setFallback(userId || null);
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      {editingMembers && (
        <MembersModal queue={editingMembers} agents={agents} onClose={() => setEditingMembers(null)} onSaved={load} />
      )}
      {editingNextSeller && (
        <NextSellerModal queue={editingNextSeller} onClose={() => setEditingNextSeller(null)} onSaved={load} />
      )}

      <div>
        <h1 className="font-display text-xl font-semibold text-ink mb-1">Filas de distribuição</h1>
        <p className="text-sm text-gray-500 mb-6">
          Cada lead novo é oferecido para a primeira fila ativa que tiver alguém disponível,
          em ordem de prioridade (a fila do topo tem prioridade sobre as de baixo).
        </p>

        <form onSubmit={handleCreate} className="flex gap-2 mb-4">
          <input
            placeholder="Nome da nova fila (ex: Time Zona Sul)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 rounded-lg border border-line px-3 py-2 text-sm"
          />
          <button className="flex items-center gap-1.5 bg-brand text-ink rounded-lg px-4 py-2 text-sm font-medium">
            <Plus size={16} /> Adicionar fila
          </button>
        </form>

        <div className="space-y-2">
          {queues.map((q, i) => (
            <div key={q.id} className="bg-card rounded-xl2 shadow-card p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <button onClick={() => move(i, -1)} disabled={i === 0} className="text-gray-300 disabled:opacity-30 hover:text-brand-dark">
                      <ChevronUp size={16} />
                    </button>
                    <button onClick={() => move(i, 1)} disabled={i === queues.length - 1} className="text-gray-300 disabled:opacity-30 hover:text-brand-dark">
                      <ChevronDown size={16} />
                    </button>
                  </div>
                  <span className="text-xs text-gray-400 w-5">{i + 1}</span>
                  <div>
                    <p className="font-medium text-ink text-sm">{q.name}</p>
                    <p className="text-xs text-gray-500">
                      {q.members.length} {q.members.length === 1 ? "usuário" : "usuários"} na fila
                      {q.nextUp && (
                        <> · próximo: <span className="text-brand-dark font-medium">{q.nextUp}</span>{q.forced && " (forçado)"}</>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button onClick={() => setEditingNextSeller(q)} className="text-xs text-brand-dark font-medium">
                    Forçar próximo
                  </button>
                  <button onClick={() => setEditingMembers(q)} className="text-xs text-brand-dark font-medium">
                    Usuários
                  </button>
                  <button
                    onClick={() => toggleActive(q)}
                    className={`w-11 h-6 rounded-full relative transition-colors ${q.active ? "bg-brand" : "bg-line"}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${q.active ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                  <button onClick={() => handleDelete(q.id)} className="text-perdido">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          <div className="bg-card rounded-xl2 shadow-card p-4 opacity-90">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-gray-400 ml-1" />
                <div>
                  <p className="font-medium text-ink text-sm">Usuário de segurança</p>
                  <p className="text-xs text-gray-500">Recebe leads quando nenhuma fila acima tem alguém disponível</p>
                </div>
              </div>
              <select
                value={fallback || ""}
                onChange={(e) => handleFallbackChange(e.target.value ? Number(e.target.value) : null)}
                className="text-sm border border-line rounded-lg px-2 py-1.5"
              >
                <option value="">Nenhum</option>
                {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      <RegionalRules agents={agents} />
    </div>
  );
}
