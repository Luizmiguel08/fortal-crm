import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { api } from "../api.js";

export default function NotificationBell({ dark = false }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  function load() {
    api.getNotifications().then((d) => setNotifications(d.notifications)).catch(() => {});
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000); // atualiza a cada 1 min
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const count = notifications.length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`relative p-1.5 rounded-lg ${dark ? "text-white/70 hover:bg-white/5" : "text-gray-500 hover:bg-line/60"}`}
      >
        <Bell size={19} />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-quente text-white text-[10px] font-semibold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white rounded-xl2 shadow-soft border border-line z-40">
          <div className="px-4 py-3 border-b border-line">
            <p className="text-sm font-semibold text-ink">Alertas</p>
            <p className="text-xs text-gray-400">Leads que precisam de atenção agora</p>
          </div>
          {count === 0 ? (
            <p className="text-sm text-gray-400 px-4 py-6 text-center">Tudo em dia por aqui 🎉</p>
          ) : (
            <ul>
              {notifications.map((n) => (
                <li
                  key={n.id}
                  onClick={() => {
                    setOpen(false);
                    navigate(`/leads/${n.lead_id}`);
                  }}
                  className="px-4 py-3 text-sm border-b border-line last:border-0 cursor-pointer hover:bg-surface flex items-start gap-2"
                >
                  <span
                    className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                      n.severity === "alta" ? "bg-perdido" : "bg-morno"
                    }`}
                  />
                  <span className="text-ink">{n.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
