import { Router } from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { pickNextAgent, clearRankOverride } from "../lib/distribution.js";
import { fireWebhook } from "../lib/webhooks.js";

const router = Router();
router.use(requireAuth);

const VALID_STATUSES = ["novo", "atendimento", "qualificado", "proposta", "ganho", "perdido"];
const VALID_TEMPS = ["quente", "morno", "frio"];

function leadWithAgent(lead) {
  if (!lead) return lead;
  const agent = lead.assigned_to
    ? db.prepare("SELECT id, name, email FROM users WHERE id = ?").get(lead.assigned_to)
    : null;
  const tags = db
    .prepare("SELECT t.id, t.name FROM lead_tags lt JOIN tags t ON t.id = lt.tag_id WHERE lt.lead_id = ?")
    .all(lead.id);
  return { ...lead, agent, tags };
}

// GET /api/leads?status=&temperature=&assigned_to=&q=
router.get("/", (req, res) => {
  const { status, temperature, assigned_to, q } = req.query;
  let sql = "SELECT * FROM leads WHERE 1=1";
  const params = [];

  if (status) {
    sql += " AND status = ?";
    params.push(status);
  }
  if (temperature) {
    sql += " AND temperature = ?";
    params.push(temperature);
  }
  if (assigned_to) {
    sql += " AND assigned_to = ?";
    params.push(assigned_to);
  }
  if (q) {
    sql += " AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)";
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  sql += " ORDER BY created_at DESC";

  const leads = db.prepare(sql).all(...params).map(leadWithAgent);
  res.json({ leads });
});

router.get("/:id", (req, res) => {
  const lead = db.prepare("SELECT * FROM leads WHERE id = ?").get(req.params.id);
  if (!lead) return res.status(404).json({ error: "Lead não encontrado" });

  const activities = db
    .prepare("SELECT a.*, u.name as user_name FROM activities a LEFT JOIN users u ON u.id = a.user_id WHERE lead_id = ? ORDER BY a.created_at DESC")
    .all(req.params.id);
  const messages = db
    .prepare("SELECT * FROM messages WHERE lead_id = ? ORDER BY created_at ASC")
    .all(req.params.id);

  res.json({ lead: leadWithAgent(lead), activities, messages });
});

// Cria lead novo e distribui automaticamente (round-robin, respeitando regras regionais)
router.post("/", (req, res) => {
  const { name, phone, phone2, email, source, interest, uf, cidade, bairro } = req.body;
  if (!name) return res.status(400).json({ error: "Nome é obrigatório" });

  const nextAgent = pickNextAgent({ uf, cidade, bairro });

  const result = db
    .prepare(
      `INSERT INTO leads (name, phone, phone2, email, source, interest, status, temperature, assigned_to, assigned_at, uf, cidade, bairro)
       VALUES (?, ?, ?, ?, ?, ?, 'novo', 'quente', ?, ${nextAgent ? "CURRENT_TIMESTAMP" : "NULL"}, ?, ?, ?)`
    )
    .run(
      name,
      phone || null,
      phone2 || null,
      email || null,
      source || "manual",
      interest || null,
      nextAgent?.id || null,
      uf || null,
      cidade || null,
      bairro || null
    );

  const leadId = result.lastInsertRowid;

  if (nextAgent) {
    db.prepare(
      "INSERT INTO activities (lead_id, user_id, type, content) VALUES (?, ?, 'atribuicao', ?)"
    ).run(leadId, nextAgent.id, `Lead distribuído automaticamente para ${nextAgent.name}`);
    clearRankOverride(nextAgent.id);
  }

  const lead = leadWithAgent(db.prepare("SELECT * FROM leads WHERE id = ?").get(leadId));
  fireWebhook("on_create_lead", lead);
  res.status(201).json({ lead });
});

router.patch("/:id", (req, res) => {
  const lead = db.prepare("SELECT * FROM leads WHERE id = ?").get(req.params.id);
  if (!lead) return res.status(404).json({ error: "Lead não encontrado" });

  const { status, temperature, assigned_to, interest, lost_reason, phone, phone2, email, uf, cidade, bairro } = req.body;

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: "Status inválido" });
  }
  if (temperature && !VALID_TEMPS.includes(temperature)) {
    return res.status(400).json({ error: "Temperatura inválida" });
  }

  const fields = [];
  const params = [];
  if (status) {
    fields.push("status = ?");
    params.push(status);
  }
  if (status === "perdido" && lost_reason !== undefined) {
    fields.push("lost_reason = ?");
    params.push(lost_reason || null);
  }
  if (temperature) {
    fields.push("temperature = ?");
    params.push(temperature);
  }
  if (assigned_to !== undefined) {
    fields.push("assigned_to = ?", "assigned_at = CURRENT_TIMESTAMP", "in_bolsao = 0");
    params.push(assigned_to);
  }
  if (interest !== undefined) {
    fields.push("interest = ?");
    params.push(interest);
  }
  if (phone !== undefined) fields.push("phone = ?"), params.push(phone || null);
  if (phone2 !== undefined) fields.push("phone2 = ?"), params.push(phone2 || null);
  if (email !== undefined) fields.push("email = ?"), params.push(email || null);
  if (uf !== undefined) fields.push("uf = ?"), params.push(uf || null);
  if (cidade !== undefined) fields.push("cidade = ?"), params.push(cidade || null);
  if (bairro !== undefined) fields.push("bairro = ?"), params.push(bairro || null);
  fields.push("updated_at = CURRENT_TIMESTAMP");

  params.push(req.params.id);
  db.prepare(`UPDATE leads SET ${fields.join(", ")} WHERE id = ?`).run(...params);

  if (status && status !== lead.status) {
    db.prepare(
      "INSERT INTO activities (lead_id, user_id, type, content) VALUES (?, ?, 'status_change', ?)"
    ).run(req.params.id, req.user.id, `Status alterado de "${lead.status}" para "${status}"`);
    if (status === "perdido" && lost_reason) {
      db.prepare(
        "INSERT INTO activities (lead_id, user_id, type, content) VALUES (?, ?, 'status_change', ?)"
      ).run(req.params.id, req.user.id, `Motivo da perda: ${lost_reason}`);
    }
  }
  if (assigned_to !== undefined && assigned_to !== lead.assigned_to) {
    const agent = assigned_to ? db.prepare("SELECT name FROM users WHERE id = ?").get(assigned_to) : null;
    db.prepare(
      "INSERT INTO activities (lead_id, user_id, type, content) VALUES (?, ?, 'atribuicao', ?)"
    ).run(req.params.id, req.user.id, agent ? `Reatribuído para ${agent.name}` : "Removida atribuição");
    if (assigned_to) clearRankOverride(assigned_to);
  }

  const updated = db.prepare("SELECT * FROM leads WHERE id = ?").get(req.params.id);
  const updatedWithAgent = leadWithAgent(updated);

  fireWebhook("on_update_lead", updatedWithAgent);
  if (status && ["ganho", "perdido"].includes(status) && status !== lead.status) {
    fireWebhook("on_close_lead", updatedWithAgent);
  }

  res.json({ lead: updatedWithAgent });
});

router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM messages WHERE lead_id = ?").run(req.params.id);
  db.prepare("DELETE FROM activities WHERE lead_id = ?").run(req.params.id);
  db.prepare("DELETE FROM leads WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// Adiciona nota/atividade manual
router.post("/:id/activities", (req, res) => {
  const { type, content } = req.body;
  if (!content) return res.status(400).json({ error: "Conteúdo é obrigatório" });

  db.prepare(
    "INSERT INTO activities (lead_id, user_id, type, content) VALUES (?, ?, ?, ?)"
  ).run(req.params.id, req.user.id, type || "nota", content);

  db.prepare("UPDATE leads SET last_contact_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);

  const activities = db
    .prepare("SELECT a.*, u.name as user_name FROM activities a LEFT JOIN users u ON u.id = a.user_id WHERE lead_id = ? ORDER BY a.created_at DESC")
    .all(req.params.id);
  res.status(201).json({ activities });
});

// Envia mensagem de WhatsApp (stub — ver routes/whatsapp.js para plugar API real)
router.post("/:id/messages", (req, res) => {
  const { body } = req.body;
  if (!body) return res.status(400).json({ error: "Mensagem vazia" });

  const result = db
    .prepare("INSERT INTO messages (lead_id, direction, body, channel) VALUES (?, 'out', ?, 'whatsapp')")
    .run(req.params.id, body);

  db.prepare("UPDATE leads SET last_contact_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);

  // TODO produção: chamar aqui a API oficial do WhatsApp (Meta Cloud API / Twilio / Z-API)
  // para enviar a mensagem de fato. Ver server/routes/whatsapp.js.

  const message = db.prepare("SELECT * FROM messages WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json({ message });
});

// Fecha negócio: marca como ganho e registra valor/data/tipo da negociação
router.post("/:id/done-deal", (req, res) => {
  const lead = db.prepare("SELECT * FROM leads WHERE id = ?").get(req.params.id);
  if (!lead) return res.status(404).json({ error: "Lead não encontrado" });

  const { value, date, type } = req.body;
  db.prepare(
    `UPDATE leads SET status = 'ganho', deal_value = ?, deal_date = ?, deal_type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).run(value ? Number(value) : null, date || null, type || null, req.params.id);

  db.prepare(
    "INSERT INTO activities (lead_id, user_id, type, content) VALUES (?, ?, 'status_change', ?)"
  ).run(
    req.params.id,
    req.user.id,
    `Negócio fechado${value ? ` — R$ ${Number(value).toLocaleString("pt-BR")}` : ""}${type ? ` (${type})` : ""}`
  );

  const updated = leadWithAgent(db.prepare("SELECT * FROM leads WHERE id = ?").get(req.params.id));
  fireWebhook("on_update_lead", updated);
  fireWebhook("on_close_lead", updated);
  res.json({ success: true, lead: updated });
});

// Marca o lead como lido/interagido pelo corretor
router.post("/:id/mark-as-interacted", (req, res) => {
  db.prepare("UPDATE leads SET read_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
  const lead = leadWithAgent(db.prepare("SELECT * FROM leads WHERE id = ?").get(req.params.id));
  res.json({ success: true, lead });
});

// --- Tags do lead ---

router.get("/:id/tags", (req, res) => {
  const tags = db
    .prepare("SELECT t.id, t.name FROM lead_tags lt JOIN tags t ON t.id = lt.tag_id WHERE lt.lead_id = ?")
    .all(req.params.id);
  res.json({ success: true, tags });
});

router.post("/:id/tags", (req, res) => {
  const { tag_id } = req.body;
  if (!tag_id) return res.status(400).json({ error: "tag_id é obrigatório" });

  db.prepare(
    "INSERT OR IGNORE INTO lead_tags (lead_id, tag_id, created_by_user_id) VALUES (?, ?, ?)"
  ).run(req.params.id, tag_id, req.user.id);

  const tags = db
    .prepare("SELECT t.id, t.name FROM lead_tags lt JOIN tags t ON t.id = lt.tag_id WHERE lt.lead_id = ?")
    .all(req.params.id);
  res.status(201).json({ success: true, tags });
});

router.post("/:id/remove-tag", (req, res) => {
  const { tag_id } = req.body;
  db.prepare("DELETE FROM lead_tags WHERE lead_id = ? AND tag_id = ?").run(req.params.id, tag_id);
  const tags = db
    .prepare("SELECT t.id, t.name FROM lead_tags lt JOIN tags t ON t.id = lt.tag_id WHERE lt.lead_id = ?")
    .all(req.params.id);
  res.json({ success: true, tags });
});

export default router;
