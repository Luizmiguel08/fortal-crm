import { useEffect, useState } from "react";
import { Plus, Trash2, Building2 } from "lucide-react";
import { api } from "../api.js";

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [name, setName] = useState("");

  function load() {
    api.getCompanies().then((d) => setCompanies(d.companies));
  }
  useEffect(load, []);

  const matriz = companies.find((c) => !c.parent_company_id);

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim() || !matriz) return;
    await api.createCompany({ name, parent_company_id: matriz.id });
    setName("");
    load();
  }

  async function handleDelete(id) {
    if (!confirm("Excluir esta filial? Usuários e leads dela ficam sem empresa.")) return;
    try {
      await api.deleteCompany(id);
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <h1 className="font-display text-xl font-semibold text-ink mb-1">Empresas</h1>
      <p className="text-sm text-gray-500 mb-6">
        Sua empresa matriz e as filiais do grupo. Cada corretor e cada lead pertence a uma empresa.
      </p>

      <form onSubmit={handleCreate} className="flex gap-2 mb-4">
        <input
          placeholder="Nome da nova filial"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-lg border border-line px-3 py-2 text-sm"
        />
        <button className="flex items-center gap-1.5 bg-brand text-ink rounded-lg px-4 py-2 text-sm font-medium">
          <Plus size={16} /> Adicionar filial
        </button>
      </form>

      <div className="bg-card rounded-xl2 shadow-card divide-y divide-line">
        {companies.map((c) => (
          <div key={c.id} className="flex items-center justify-between px-4 py-3">
            <span className="flex items-center gap-2 text-sm text-ink">
              <Building2 size={14} className="text-brand" />
              <span className="font-medium">{c.name}</span>
              {!c.parent_company_id && <span className="text-xs text-gray-400">(matriz)</span>}
            </span>
            {c.parent_company_id && (
              <button onClick={() => handleDelete(c.id)} className="text-perdido"><Trash2 size={15} /></button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
