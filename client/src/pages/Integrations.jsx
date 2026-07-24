import { useEffect, useState } from "react";
import { Facebook, Trash2, ExternalLink, Webhook, Link2, Copy, Check, RefreshCw } from "lucide-react";
import { api } from "../api.js";

const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/api\/?$/, "");

const HOOK_ACTIONS = [
  { key: "on_create_lead", label: "Lead criado" },
  { key: "on_update_lead", label: "Lead atualizado" },
  { key: "on_close_lead", label: "Lead fechado (ganho/perdido)" },
];

function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div className="mb-3">
      <label className="text-xs font-medium text-gray-500">{label}</label>
      <div className="mt-1 flex gap-2">
        <input readOnly value={value} className="flex-1 rounded-lg border border-line px-3 py-2 text-xs bg-surface text-gray-600" />
        <button onClick={copy} className="shrink-0 rounded-lg border border-line px-3 text-xs font-medium text-ink flex items-center gap-1">
          {copied ? <Check size={13} className="text-ganho" /> : <Copy size={13} />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
    </div>
  );
}

function PortalIntakeCard() {
  const [apiKey, setApiKey] = useState("");
  const [rotating, setRotating] = useState(false);

  useEffect(() => {
    api.getIntakeKey().then((d) => setApiKey(d.api_key));
  }, []);

  async function handleRotate() {
    if (!confirm("Gerar uma chave nova vai invalidar a atual — qualquer portal/Zapier configurado com a chave antiga vai parar de enviar leads até você atualizar lá também. Continuar?")) return;
    setRotating(true);
    try {
      const { api_key } = await api.rotateIntakeKey();
      setApiKey(api_key);
    } finally {
      setRotating(false);
    }
  }

  const webhookUrl = apiKey ? `${API_BASE}/api/lead-intake/inbound?key=${apiKey}` : "";

  return (
    <div className="bg-card rounded-xl2 shadow-card p-5 mb-4">
      <div className="flex items-center gap-2 mb-1">
        <Link2 size={20} className="text-brand" />
        <h2 className="font-display font-semibold text-ink text-sm">Portais imobiliários / Zapier / Make</h2>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Use essa URL como "Webhook" na configuração de leads do portal (ZAP, VivaReal, OLX, Chaves na Mão) ou como ação
        de webhook no Zapier/Make. Cada envio já entra distribuído automaticamente pro corretor da vez.
      </p>

      {apiKey && <CopyField label="URL do webhook (POST)" value={webhookUrl} />}

      <div className="text-xs text-gray-500 bg-surface rounded-lg p-3 mb-3 space-y-1">
        <p className="font-medium text-gray-600">Corpo (JSON) esperado:</p>
        <code className="block text-[11px] whitespace-pre-wrap">{`{ "name": "...", "phone": "...", "email": "...", "source": "ZAP Imóveis", "interest": "Apto 2 quartos" }`}</code>
      </div>

      <button
        onClick={handleRotate}
        disabled={rotating}
        className="flex items-center gap-1.5 text-xs font-medium text-perdido disabled:opacity-60"
      >
        <RefreshCw size={13} /> {rotating ? "Gerando..." : "Gerar nova chave (invalida a atual)"}
      </button>
    </div>
  );
}

function WebhooksCard() {
  const [config, setConfig] = useState(null);
  const [url, setUrl] = useState("");
  const [actions, setActions] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function load() {
    api.getWebhooks().then((d) => {
      setConfig(d.config);
      setUrl(d.config.hook_url || "");
      setActions({
        on_create_lead: !!d.config.on_create_lead,
        on_update_lead: !!d.config.on_update_lead,
        on_close_lead: !!d.config.on_close_lead,
      });
    });
  }
  useEffect(load, []);

  function toggleAction(key) {
    setActions((a) => ({ ...a, [key]: !a[key] }));
  }

  async function handleSave() {
    if (!url.trim()) return;
    setSaving(true);
    try {
      for (const { key } of HOOK_ACTIONS) {
        if (actions[key]) {
          await api.subscribeWebhook(key, url);
        } else if (config[key]) {
          await api.unsubscribeWebhook(key);
        }
      }
      load();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  if (!config) return null;

  return (
    <div className="bg-card rounded-xl2 shadow-card p-5">
      <div className="flex items-center gap-2 mb-1">
        <Webhook size={20} className="text-brand" />
        <h2 className="font-display font-semibold text-ink text-sm">Webhooks</h2>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Avise outro sistema seu em tempo real sempre que um lead for criado, atualizado ou fechado.
      </p>

      <input
        placeholder="https://seu-sistema.com/webhook"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="w-full rounded-lg border border-line px-3 py-2 text-sm mb-3"
      />

      <div className="space-y-2 mb-4">
        {HOOK_ACTIONS.map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={!!actions[key]} onChange={() => toggleAction(key)} className="accent-brand" />
            {label}
          </label>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !url.trim()}
        className="bg-brand text-ink rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {saving ? "Salvando..." : saved ? "Salvo ✓" : "Salvar"}
      </button>
    </div>
  );
}

export default function Integrations() {
  const [pages, setPages] = useState([]);
  const [form, setForm] = useState({ page_id: "", access_token: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function load() {
    api.getFbPages().then((d) => setPages(d.pages));
  }
  useEffect(load, []);

  async function handleConnect(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.addFbPage(form);
      setForm({ page_id: "", access_token: "" });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id) {
    await api.removeFbPage(id);
    load();
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <h1 className="font-display text-xl font-semibold text-ink mb-1">Integrações</h1>
      <p className="text-sm text-gray-500 mb-6">
        Conecte suas páginas do Facebook/Instagram para que os leads de formulário caiam aqui automaticamente.
      </p>

      <div className="bg-card rounded-xl2 shadow-card p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Facebook size={20} className="text-brand" />
          <h2 className="font-display font-semibold text-ink text-sm">Facebook/Instagram Lead Ads</h2>
        </div>

        {pages.length > 0 && (
          <div className="space-y-2 mb-4">
            {pages.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-ganho/10 rounded-lg px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-ink">{p.page_name}</p>
                  <p className="text-xs text-gray-500">Integrado com sucesso</p>
                </div>
                <button onClick={() => handleRemove(p.id)} className="text-perdido p-1.5">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleConnect} className="space-y-2">
          <input
            placeholder="Page ID"
            value={form.page_id}
            onChange={(e) => setForm({ ...form, page_id: e.target.value })}
            className="w-full rounded-lg border border-line px-3 py-2 text-sm"
            required
          />
          <input
            placeholder="Page Access Token"
            value={form.access_token}
            onChange={(e) => setForm({ ...form, access_token: e.target.value })}
            className="w-full rounded-lg border border-line px-3 py-2 text-sm"
            required
          />
          {error && <p className="text-sm text-perdido">{error}</p>}
          <button
            disabled={saving}
            className="bg-brand text-ink rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            {saving ? "Conectando..." : "Integrar"}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-line text-xs text-gray-500 space-y-1">
          <p className="font-medium text-gray-600 flex items-center gap-1">
            Como conseguir o Page ID e o Access Token
          </p>
          <p>
            1. Crie um App em{" "}
            <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer" className="text-brand-dark inline-flex items-center gap-0.5">
              developers.facebook.com/apps <ExternalLink size={11} />
            </a>
          </p>
          <p>2. Gere um token com permissão <code className="bg-line px-1 rounded">leads_retrieval</code> no Graph API Explorer</p>
          <p>3. Configure o webhook do App apontando para <code className="bg-line px-1 rounded">/api/facebook/webhook</code> do seu backend publicado</p>
          <p className="text-gray-400">Isso só funciona com o backend publicado (não em localhost) — veja o DEPLOY.md.</p>
        </div>
      </div>

      <PortalIntakeCard />

      <WebhooksCard />
    </div>
  );
}
