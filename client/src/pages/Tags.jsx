import { useEffect, useState } from "react";
import { Plus, Trash2, Tag as TagIcon } from "lucide-react";
import { api } from "../api.js";

export default function Tags() {
  const [tags, setTags] = useState([]);
  const [name, setName] = useState("");

  function load() {
    api.getTags().then((d) => setTags(d.tags));
  }
  useEffect(load, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    await api.createTag({ name });
    setName("");
    load();
  }

  async function toggleEnabled(tag) {
    await api.updateTag(tag.id, { enabled: !tag.enabled });
    load();
  }

  async function handleDelete(id) {
    if (!confirm("Excluir esta tag? Ela será removida de todos os leads.")) return;
    await api.deleteTag(id);
    load();
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <h1 className="font-display text-xl font-semibold text-ink mb-1">Tags</h1>
      <p className="text-sm text-gray-500 mb-6">
        Crie etiquetas pra organizar e filtrar seus leads (ex: Quente, Investidor, VIP).
      </p>

      <form onSubmit={handleCreate} className="flex gap-2 mb-4">
        <input
          placeholder="Nome da tag"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-lg border border-line px-3 py-2 text-sm"
        />
        <button className="flex items-center gap-1.5 bg-brand text-ink rounded-lg px-4 py-2 text-sm font-medium">
          <Plus size={16} /> Criar
        </button>
      </form>

      <div className="bg-card rounded-xl2 shadow-card divide-y divide-line">
        {tags.length === 0 && <p className="text-sm text-gray-400 p-5">Nenhuma tag ainda.</p>}
        {tags.map((t) => (
          <div key={t.id} className="flex items-center justify-between px-4 py-3">
            <span className="flex items-center gap-2 text-sm text-ink font-medium">
              <TagIcon size={14} className="text-brand" /> {t.name}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => toggleEnabled(t)}
                className={`w-10 h-5.5 rounded-full relative transition-colors ${t.enabled ? "bg-brand" : "bg-line"}`}
              >
                <span className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white transition-transform ${t.enabled ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
              <button onClick={() => handleDelete(t.id)} className="text-perdido"><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
