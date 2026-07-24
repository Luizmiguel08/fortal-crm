import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { api } from "../api.js";

// Cacheia o limite de minutos do bolsão em memória, pra não repetir a chamada
// em cada card da lista.
let cachedLimit = null;
let cachedPromise = null;
function getLimitMinutes() {
  if (cachedLimit !== null) return Promise.resolve(cachedLimit);
  if (!cachedPromise) {
    cachedPromise = api
      .getBolsaoSettings()
      .then((d) => {
        cachedLimit = d.settings.limit_minutes;
        return cachedLimit;
      })
      .catch(() => 5);
  }
  return cachedPromise;
}

const DONE_STATUSES = ["ganho", "perdido"];

// Mostra quanto tempo falta pro corretor responder antes do lead cair no bolsão.
// Fica vermelho e pulsando no último minuto. Se já caiu no bolsão, mostra isso.
export default function ResponseCountdown({ lead, compact = false }) {
  const [limitMinutes, setLimitMinutes] = useState(cachedLimit);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (limitMinutes === null) getLimitMinutes().then(setLimitMinutes);
  }, [limitMinutes]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (lead.in_bolsao) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-perdido bg-perdido/10 rounded-full px-2 py-0.5 shrink-0">
        <Clock size={11} /> No bolsão
      </span>
    );
  }

  if (!lead.assigned_at || limitMinutes === null || DONE_STATUSES.includes(lead.status)) return null;

  const assignedAt = new Date(lead.assigned_at + "Z").getTime();
  const lastContactAt = lead.last_contact_at ? new Date(lead.last_contact_at + "Z").getTime() : null;
  // Já respondeu depois de assumir o lead — sem risco de cair no bolsão
  if (lastContactAt && lastContactAt >= assignedAt) return null;

  const deadline = assignedAt + limitMinutes * 60000;
  const remainingMs = deadline - now;

  if (remainingMs <= 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-perdido rounded-full px-2 py-0.5 animate-pulse shrink-0">
        <Clock size={11} /> Indo pro bolsão...
      </span>
    );
  }

  const totalSec = Math.floor(remainingMs / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  const urgent = remainingMs < 60000;

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5 shrink-0 ${
        urgent ? "text-white bg-perdido animate-pulse" : "text-morno bg-morno/10"
      }`}
      title={`Prazo de resposta: ${limitMinutes} min`}
    >
      <Clock size={11} />
      {mm}:{ss}
      {!compact && " p/ bolsão"}
    </span>
  );
}
