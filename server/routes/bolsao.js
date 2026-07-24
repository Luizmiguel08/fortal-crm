import { Router } from "express";
import db from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const DAY_KEYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"]; // getDay(): 0=domingo

function getSettings() {
  const row = db.prepare("SELECT * FROM bolsao_settings WHERE id = 1").get();
  return { ...row, enabled: !!row.enabled, hours: JSON.parse(row.hours) };
}

function isWithinBusinessHours(settings) {
  const now = new Date();
  const dayKey = DAY_KEYS[now.getDay()];
  const day = settings.hours[dayKey];
  if (!day || !day.on) return false;

  const [sh, sm] = day.start.split(":").map(Number);
  const [eh, em] = day.end.split(":").map(Number);
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  return minutesNow >= sh * 60 + sm && minutesNow <= eh * 60 + em;
}

// Verifica leads que estouraram o prazo de resposta e os move pro bolsão.
// Chamado no início de toda rota deste arquivo, então fica sempre atualizado.
function refreshBolsao() {
  const settings = getSettings();
  if (!settings.enabled || !isWithinBusinessHours(settings)) return;

  const candidates = db
    .prepare(
      `SELECT * FROM leads
       WHERE assigned_to IS NOT NULL
         AND in_bolsao = 0
         AND status NOT IN ('ganho', 'perdido')
         AND assigned_at IS NOT NULL
         AND (julianday('now') - julianday(assigned_at)) * 24 * 60 > ?
         AND (last_contact_at IS NULL OR last_contact_at < assigned_at)`
    )
    .all(settings.limit_minutes);

  for (const lead of candidates) {
    db.prepare("UPDATE leads SET in_bolsao = 1 WHERE id = ?").run(lead.id);
    db.prepare(
      "INSERT INTO bolsao_events (lead_id, lost_by_user_id) VALUES (?, ?)"
    ).run(lead.id, lead.assigned_to);
    db.prepare(
      "INSERT INTO activities (lead_id, type, content) VALUES (?, 'bolsao', 'Lead caiu no bolsão por falta de resposta a tempo')"
    ).run(lead.id);
  }
}

// GET /api/bolsao — leads disponíveis para o usuário atual assumir
router.get("/", (req, res) => {
  refreshBolsao();
  const settings = getSettings();
  const me = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);

  if (!me.sees_bolsao) {
    return res.json({ leads: [], settings, canView: false });
  }
  if (settings.visibility === "fila" && me.role !== "agent") {
    return res.json({ leads: [], settings, canView: false });
  }

  const leads = db
    .prepare(
      `SELECT l.*, u.name as agent_name FROM leads l
       LEFT JOIN users u ON u.id = l.assigned_to
       WHERE l.in_bolsao = 1
       ORDER BY l.assigned_at ASC`
    )
    .all();

  res.json({ leads, settings, canView: true });
});

// POST /api/bolsao/:id/claim — usuário assume o lead
router.post("/:id/claim", (req, res) => {
  refreshBolsao();
  const lead = db.prepare("SELECT * FROM leads WHERE id = ?").get(req.params.id);
  if (!lead || !lead.in_bolsao) {
    return res.status(400).json({ error: "Este lead não está mais disponível no bolsão" });
  }

  db.prepare(
    "UPDATE leads SET assigned_to = ?, assigned_at = CURRENT_TIMESTAMP, in_bolsao = 0 WHERE id = ?"
  ).run(req.user.id, req.params.id);

  db.prepare(
    `UPDATE bolsao_events SET claimed_by_user_id = ?, claimed_at = CURRENT_TIMESTAMP
     WHERE lead_id = ? AND claimed_at IS NULL`
  ).run(req.user.id, req.params.id);

  db.prepare(
    "INSERT INTO activities (lead_id, user_id, type, content) VALUES (?, ?, 'atribuicao', ?)"
  ).run(req.params.id, req.user.id, `${req.user.name} assumiu o lead através do bolsão`);

  const updated = db.prepare("SELECT * FROM leads WHERE id = ?").get(req.params.id);
  res.json({ lead: updated });
});

router.get("/settings", (req, res) => {
  res.json({ settings: getSettings() });
});

router.put("/settings", requireAdmin, (req, res) => {
  const { enabled, limit_minutes, visibility, hours } = req.body;
  db.prepare(
    "UPDATE bolsao_settings SET enabled = ?, limit_minutes = ?, visibility = ?, hours = ? WHERE id = 1"
  ).run(enabled ? 1 : 0, limit_minutes, visibility, JSON.stringify(hours));
  res.json({ settings: getSettings() });
});

// GET /api/bolsao/report — ranking de quem mais assumiu vs. quem mais perdeu leads pro bolsão
router.get("/report", (req, res) => {
  const claimed = db
    .prepare(
      `SELECT u.id, u.name, COUNT(*) as total
       FROM bolsao_events e JOIN users u ON u.id = e.claimed_by_user_id
       WHERE e.claimed_by_user_id IS NOT NULL
       GROUP BY u.id ORDER BY total DESC`
    )
    .all();

  const lost = db
    .prepare(
      `SELECT u.id, u.name, COUNT(*) as total
       FROM bolsao_events e JOIN users u ON u.id = e.lost_by_user_id
       WHERE e.lost_by_user_id IS NOT NULL
       GROUP BY u.id ORDER BY total DESC`
    )
    .all();

  res.json({ claimed, lost });
});

export default router;
