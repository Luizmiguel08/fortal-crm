const CONFIG = {
  quente: { color: "bg-quente", text: "text-quente", label: "Quente", pulse: true },
  morno: { color: "bg-morno", text: "text-morno", label: "Morno", pulse: false },
  frio: { color: "bg-frio", text: "text-frio", label: "Frio", pulse: false },
};

export default function TempBadge({ temperature, showLabel = true }) {
  const cfg = CONFIG[temperature] || CONFIG.morno;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${cfg.color} ${cfg.pulse ? "pulse-dot" : ""}`} />
      {showLabel && <span className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</span>}
    </span>
  );
}
