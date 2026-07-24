import { Router } from "express";
import db from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { fireWebhook } from "../lib/webhooks.js";

const router = Router();
router.use(requireAuth);

function withActiveCount(stand) {
  const activeCount = db
    .prepare("SELECT COUNT(*) as c FROM stand_checkins WHERE stand_id = ? AND check_out_at IS NULL")
    .get(stand.id).c;
  return { ...stand, active: !!stand.active, activeCount };
}

router.get("/", (req, res) => {
  const stands = db.prepare("SELECT * FROM stands ORDER BY created_at DESC").all();
  res.json({ stands: stands.map(withActiveCount) });
});

router.post("/", requireAdmin, (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: "Nome é obrigatório" });

  const result = db
    .prepare("INSERT INTO stands (name, description) VALUES (?, ?)")
    .run(name, description || null);
  const stand = db.prepare("SELECT * FROM stands WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json({ stand: withActiveCount(stand) });
});

router.patch("/:id", requireAdmin, (req, res) => {
  const { name, description, active } = req.body;
  const fields = [];
  const params = [];
  if (name !== undefined) fields.push("name = ?"), params.push(name);
  if (description !== undefined) fields.push("description = ?"), params.push(description);
  if (active !== undefined) fields.push("active = ?"), params.push(active ? 1 : 0);
  if (!fields.length) return res.status(400).json({ error: "Nada para atualizar" });

  params.push(req.params.id);
  db.prepare(`UPDATE stands SET ${fields.join(", ")} WHERE id = ?`).run(...params);
  const stand = db.prepare("SELECT * FROM stands WHERE id = ?").get(req.params.id);
  res.json({ stand: withActiveCount(stand) });
});

router.delete("/:id", requireAdmin, (req, res) => {
  db.prepare("DELETE FROM stand_checkins WHERE stand_id = ?").run(req.params.id);
  db.prepare("DELETE FROM stands WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// Quem está atualmente com check-in feito neste estande
router.get("/:id/active", (req, res) => {
  const active = db
    .prepare(
      `SELECT c.id as checkin_id, u.id, u.name, c.check_in_at
       FROM stand_checkins c JOIN users u ON u.id = c.user_id
       WHERE c.stand_id = ? AND c.check_out_at IS NULL
       ORDER BY c.check_in_at ASC`
    )
    .all(req.params.id);
  res.json({ active });
});

router.post("/:id/checkin", (req, res) => {
  const already = db
    .prepare("SELECT * FROM stand_checkins WHERE stand_id = ? AND user_id = ? AND check_out_at IS NULL")
    .get(req.params.id, req.user.id);
  if (already) return res.status(400).json({ error: "Você já está com check-in neste estande" });

  db.prepare("INSERT INTO stand_checkins (stand_id, user_id) VALUES (?, ?)").run(req.params.id, req.user.id);
  res.status(201).json({ ok: true });
});

router.post("/:id/checkout", (req, res) => {
  const open = db
    .prepare("SELECT * FROM stand_checkins WHERE stand_id = ? AND user_id = ? AND check_out_at IS NULL")
    .get(req.params.id, req.user.id);
  if (!open) return res.status(400).json({ error: "Você não está com check-in neste estande" });

  db.prepare("UPDATE stand_checkins SET check_out_at = CURRENT_TIMESTAMP WHERE id = ?").run(open.id);
  res.json({ ok: true });
});

// Captura um lead no estande — distribui só entre quem está com check-in feito ali (round-robin)
router.post("/:id/leads", (req, res) => {
  const { name, phone, email, interest } = req.body;
  if (!name) return res.status(400).json({ error: "Nome é obrigatório" });

  const stand = db.prepare("SELECT * FROM stands WHERE id = ?").get(req.params.id);
  if (!stand) return res.status(404).json({ error: "Estande não encontrado" });

  const checkedIn = db
    .prepare(
      `SELECT u.id, u.name, (SELECT MAX(assigned_at) FROM leads WHERE assigned_to = u.id) as last_assigned
       FROM stand_checkins c JOIN users u ON u.id = c.user_id
       WHERE c.stand_id = ? AND c.check_out_at IS NULL AND u.active = 1
       ORDER BY last_assigned ASC NULLS FIRST
       LIMIT 1`
    )
    .get(req.params.id);

  if (!checkedIn) {
    return res.status(400).json({ error: "Nenhum vendedor com check-in feito neste estande no momento" });
  }

  const result = db
    .prepare(
      `INSERT INTO leads (name, phone, email, source, interest, status, temperature, assigned_to, assigned_at, stand_id)
       VALUES (?, ?, ?, ?, ?, 'novo', 'quente', ?, CURRENT_TIMESTAMP, ?)`
    )
    .run(name, phone || null, email || null, `Estande: ${stand.name}`, interest || null, checkedIn.id, stand.id);

  const leadId = result.lastInsertRowid;
  db.prepare(
    "INSERT INTO activities (lead_id, user_id, type, content) VALUES (?, ?, 'atribuicao', ?)"
  ).run(leadId, checkedIn.id, `Lead capturado no estande "${stand.name}" e distribuído para ${checkedIn.name}`);

  const lead = db.prepare("SELECT * FROM leads WHERE id = ?").get(leadId);
  fireWebhook("on_create_lead", lead);
  res.status(201).json({ lead, seller: checkedIn });
});

// Resumo de presenças: quantos check-ins, quantos leads recebidos e tempo médio no estande, por vendedor
router.get("/:id/attendance-summary", (req, res) => {
  const rows = db
    .prepare(
      `SELECT u.id, u.name,
        COUNT(c.id) as total_attendances,
        SUM(CASE WHEN c.check_out_at IS NOT NULL THEN 1 ELSE 0 END) as check_out_count,
        COUNT(c.id) as check_in_count,
        ROUND(AVG(CASE WHEN c.check_out_at IS NOT NULL
          THEN (julianday(c.check_out_at) - julianday(c.check_in_at)) * 24 * 60
          ELSE NULL END), 1) as average_attendance_time_minutes,
        (SELECT COUNT(*) FROM leads WHERE stand_id = ? AND assigned_to = u.id) as total_leads_received
       FROM stand_checkins c JOIN users u ON u.id = c.user_id
       WHERE c.stand_id = ?
       GROUP BY u.id
       ORDER BY total_leads_received DESC`
    )
    .all(req.params.id, req.params.id);
  res.json({ summary: rows });
});

export default router;
