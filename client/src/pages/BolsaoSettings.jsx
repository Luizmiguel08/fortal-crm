import { useEffect, useState } from "react";
import { api } from "../api.js";

const DAYS = [
  { key: "seg", label: "Segunda" },
  { key: "ter", label: "Terça" },
  { key: "qua", label: "Quarta" },
  { key: "qui", label: "Quinta" },
  { key: "sex", label: "Sexta" },
  { key: "sab", label: "Sábado" },
  { key: "dom", label: "Domingo" },
];

const MINUTE_MARKS = [5, 10, 15, 20, 30, 45, 60, 90, 120, 240, 360, 480, 720];

export default function BolsaoSettings() {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getBolsaoSettings().then((d) => setSettings(d.settings));
  }, []);

  if (!settings) return <div className="p-6 text-gray-400 text-sm">Carregando...</div>;

  function updateDay(key, field, value) {
    setSettings((s) => ({ ...s, hours: { ...s.hours, [key]: { ...s.hours[key], [field]: value } } }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { settings: updated } = await api.updateBolsaoSettings(settings);
      setSettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <h1 className="font-display text-xl font-semibold text-ink mb-1">Configurações do bolsão</h1>
      <p className="text-sm text-gray-500 mb-6">
        Defina as regras da rede de segurança para leads sem resposta.
      </p>

      <div className="bg-card rounded-xl2 shadow-card p-5 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-ink text-sm">Ativar o bolsão de leads?</p>
            <p className="text-xs text-gray-500">Quando desligado, leads nunca entram no bolsão.</p>
          </div>
          <button
            onClick={() => setSettings((s) => ({ ...s, enabled: !s.enabled }))}
            className={`w-12 h-7 rounded-full transition-colors relative shrink-0 ${settings.enabled ? "bg-brand" : "bg-line"}`}
          >
            <span
              className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-transform ${settings.enabled ? "translate-x-6" : "translate-x-1"}`}
            />
          </button>
        </div>

        <div>
          <p className="font-medium text-ink text-sm mb-1">Limite de tempo para atendimento</p>
          <p className="text-xs text-gray-500 mb-3">
            Tempo máximo que o corretor tem para responder antes do lead cair no bolsão.
          </p>
          <input
            type="range"
            min={0}
            max={MINUTE_MARKS.length - 1}
            step={1}
            value={MINUTE_MARKS.indexOf(settings.limit_minutes) === -1 ? 4 : MINUTE_MARKS.indexOf(settings.limit_minutes)}
            onChange={(e) => setSettings((s) => ({ ...s, limit_minutes: MINUTE_MARKS[Number(e.target.value)] }))}
            className="w-full accent-brand"
          />
          <p className="text-sm text-ink font-medium mt-1">
            {settings.limit_minutes < 60 ? `${settings.limit_minutes} min` : `${(settings.limit_minutes / 60).toFixed(1).replace(".0", "")}h`}
          </p>
        </div>

        <div>
          <p className="font-medium text-ink text-sm mb-2">Lead ficar disponível para</p>
          <div className="space-y-2">
            {[
              { value: "todos", label: "Qualquer usuário ativo da empresa" },
              { value: "fila", label: "Apenas corretores participantes da distribuição automática" },
            ].map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  checked={settings.visibility === opt.value}
                  onChange={() => setSettings((s) => ({ ...s, visibility: opt.value }))}
                  className="accent-brand"
                />
                {opt.label}
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            (Regras por equipe exigem um sistema de equipes, que ainda não existe neste projeto —
            posso adicionar se for útil pro seu caso.)
          </p>
        </div>

        <div>
          <p className="font-medium text-ink text-sm mb-3">Horário de funcionamento</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DAYS.map((d) => (
              <div key={d.key} className="flex items-center gap-3 border border-line rounded-lg px-3 py-2">
                <button
                  onClick={() => updateDay(d.key, "on", !settings.hours[d.key].on)}
                  className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${settings.hours[d.key].on ? "bg-brand" : "bg-line"}`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${settings.hours[d.key].on ? "translate-x-5" : "translate-x-1"}`}
                  />
                </button>
                <span className="text-sm text-ink w-20 shrink-0">{d.label}</span>
                <input
                  type="time"
                  value={settings.hours[d.key].start}
                  onChange={(e) => updateDay(d.key, "start", e.target.value)}
                  disabled={!settings.hours[d.key].on}
                  className="text-xs border border-line rounded px-1.5 py-1 disabled:opacity-40 w-full"
                />
                <input
                  type="time"
                  value={settings.hours[d.key].end}
                  onChange={(e) => updateDay(d.key, "end", e.target.value)}
                  disabled={!settings.hours[d.key].on}
                  className="text-xs border border-line rounded px-1.5 py-1 disabled:opacity-40 w-full"
                />
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-brand text-ink rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-60"
        >
          {saving ? "Salvando..." : saved ? "Salvo ✓" : "Salvar configurações"}
        </button>
      </div>
    </div>
  );
}
