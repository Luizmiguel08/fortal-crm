import { useEffect, useRef } from "react";

const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/api\/?$/, "");

// Toca um beep curtinho via Web Audio API — sem precisar de nenhum arquivo de áudio.
function playPing() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    /* navegador pode bloquear áudio sem interação do usuário — tudo bem, ignora */
  }
}

// Conecta no stream de eventos do servidor (SSE) e chama onLeadCreated toda vez
// que um lead novo cai no sistema — vindo de qualquer fonte (Facebook, portal,
// manual). Reconecta sozinho se a conexão cair.
export function useLeadEvents(onLeadCreated, { sound = true } = {}) {
  const callbackRef = useRef(onLeadCreated);
  callbackRef.current = onLeadCreated;

  useEffect(() => {
    const token = localStorage.getItem("c2s_token");
    if (!token) return;

    let es;
    let closed = false;

    function connect() {
      es = new EventSource(`${API_BASE}/api/events/stream?token=${encodeURIComponent(token)}`);
      es.addEventListener("lead_created", (e) => {
        const lead = JSON.parse(e.data);
        if (sound) playPing();
        callbackRef.current?.(lead);
      });
      es.onerror = () => {
        es.close();
        if (!closed) setTimeout(connect, 3000);
      };
    }

    connect();
    return () => {
      closed = true;
      es?.close();
    };
  }, [sound]);
}
