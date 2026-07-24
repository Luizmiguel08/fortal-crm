import { Router } from "express";
import db from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { redistributeThroughQueue, clearRankOverride } from "../lib/distribution.js";
import { fireWebhook } from "../lib/webhooks.js";

const router = Router();
router.use(requireAuth, requireAdmin); // gestão de filas é coisa de admin

function withMembers(queue) {
  const members = db
    .prepare(
      `SELECT u.id, u.name, u.active, m.priority,
        MAX(COALESCE(u.queue_rank_override,''), COALESCE((SELECT MAX(assigned_at) FROM leads WHERE assigned_to = u.id),'')) as last_assigned
       FROM distribution_queue_members m JOIN users u ON u.id = m.user_id
       WHERE m.queue_id = ?
       ORDER BY m.priority ASC, u.name ASC`
    )
    .all(queue.id);

  // quem seria o próximo a receber (respeita um "próximo vendedor" forçado manualmente)
  let nextUp;
  if (queue.forced_next_user_id) {
    nextUp = members.find((m) => m.id === queue.forced_next_user_id);
  }
  if (!nextUp) {
    nextUp = members
      .filter((m) => m.active)
      .sort((a, b) => a.priority - b.priority || (a.last_assigned || "").localeCompare(b.last_assigned || ""))[0];
  }

  return { ...queue, active: !!queue.active, members, nextUp: nextUp?.name || null, forced: !!queue.forced_next_user_id };
}

router.get("/queues", (req, res) => {
  const queues = db.prepare("SELECT * FROM distribution_queues ORDER BY priority ASC").all();
  res.json({ queues: queues.map(withMembers) });
});

router.post("/queues", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Nome é obrigatório" });

  const maxPriority = db.prepare("SELECT MAX(priority) as m FROM distribution_queues").get().m;
  const result = db
    .prepare("INSERT INTO distribution_queues (name, type, active, priority) VALUES (?, 'rodizio', 1, ?)")
    .run(name, (maxPriority ?? -1) + 1);

  const queue = db.prepare("SELECT * FROM distribution_queues WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json({ queue: withMembers(queue) });
});

router.patch("/queues/:id", (req, res) => {
  const { name, active } = req.body;
  const fields = [];
  const params = [];
  if (name !== undefined) {
    fields.push("name = ?");
    params.push(name);
  }
  if (active !== undefined) {
    fields.push("active = ?");
    params.push(active ? 1 : 0);
  }
  if (!fields.length) return res.status(400).json({ error: "Nada para atualizar" });

  params.push(req.params.id);
  db.prepare(`UPDATE distribution_queues SET ${fields.join(", ")} WHERE id = ?`).run(...params);
  const queue = db.prepare("SELECT * FROM distribution_queues WHERE id = ?").get(req.params.id);
  res.json({ queue: withMembers(queue) });
});

router.delete("/queues/:id", (req, res) => {
  db.prepare("DELETE FROM distribution_queue_members WHERE queue_id = ?").run(req.params.id);
  db.prepare("DELETE FROM distribution_queues WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// Reordena a prioridade das filas — recebe um array de IDs na ordem desejada
router.put("/queues/reorder", (req, res) => {
  const { order } = req.body; // [id1, id2, id3, ...]
  if (!Array.isArray(order)) return res.status(400).json({ error: "order deve ser uma lista de IDs" });

  const update = db.prepare("UPDATE distribution_queues SET priority = ? WHERE id = ?");
  order.forEach((id, index) => update.run(index, id));

  const queues = db.prepare("SELECT * FROM distribution_queues ORDER BY priority ASC").all();
  res.json({ queues: queues.map(withMembers) });
});

router.put("/queues/:id/members", (req, res) => {
  const { user_ids } = req.body;
  if (!Array.isArray(user_ids)) return res.status(400).json({ error: "user_ids deve ser uma lista" });

  db.prepare("DELETE FROM distribution_queue_members WHERE queue_id = ?").run(req.params.id);
  const insert = db.prepare("INSERT INTO distribution_queue_members (queue_id, user_id) VALUES (?, ?)");
  for (const userId of user_ids) insert.run(req.params.id, userId);

  const queue = db.prepare("SELECT * FROM distribution_queues WHERE id = ?").get(req.params.id);
  res.json({ queue: withMembers(queue) });
});

// Usuário de segurança: recebe leads quando nenhuma fila ativa tem alguém disponível
router.get("/fallback", (req, res) => {
  const settings = db.prepare("SELECT * FROM distribution_settings WHERE id = 1").get();
  res.json({ fallback_user_id: settings?.fallback_user_id || null });
});

router.put("/fallback", (req, res) => {
  const { user_id } = req.body;
  db.prepare(
    "INSERT INTO distribution_settings (id, fallback_user_id) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET fallback_user_id = excluded.fallback_user_id"
  ).run(user_id || null);
  res.json({ fallback_user_id: user_id || null });
});

// Define manualmente quem deve ser o próximo a receber um lead nesta fila
// (vale só pra uma vez — depois volta ao rodízio normal)
router.post("/queues/:id/next-seller", (req, res) => {
  const { user_id } = req.body;
  const isMember = db
    .prepare("SELECT 1 FROM distribution_queue_members WHERE queue_id = ? AND user_id = ?")
    .get(req.params.id, user_id);
  if (!isMember) return res.status(400).json({ error: "Esse usuário não participa desta fila" });

  db.prepare("UPDATE distribution_queues SET forced_next_user_id = ? WHERE id = ?").run(user_id, req.params.id);
  const queue = db.prepare("SELECT * FROM distribution_queues WHERE id = ?").get(req.params.id);
  res.json({ queue: withMembers(queue) });
});

// Redistribui um lead específico através desta fila (reatribuição manual)
router.post("/queues/:id/redistribute", (req, res) => {
  const { lead_id } = req.body;
  const lead = db.prepare("SELECT * FROM leads WHERE id = ?").get(lead_id);
  if (!lead) return res.status(404).json({ error: "Lead não encontrado" });

  const nextAgent = redistributeThroughQueue(req.params.id);
  if (!nextAgent) return res.status(400).json({ error: "Nenhum membro ativo disponível nesta fila" });

  db.prepare(
    "UPDATE leads SET assigned_to = ?, assigned_at = CURRENT_TIMESTAMP, in_bolsao = 0 WHERE id = ?"
  ).run(nextAgent.id, lead_id);
  db.prepare(
    "INSERT INTO activities (lead_id, user_id, type, content) VALUES (?, ?, 'atribuicao', ?)"
  ).run(lead_id, req.user.id, `Lead redistribuído manualmente pela fila para ${nextAgent.name}`);

  const updated = db.prepare("SELECT * FROM leads WHERE id = ?").get(lead_id);
  fireWebhook("on_update_lead", updated);
  clearRankOverride(nextAgent.id);
  res.json({ success: true, lead_id, new_seller: nextAgent });
});

// Atualiza a prioridade dos membros dentro de uma fila (menor número = atendido primeiro)
router.put("/queues/:id/priorities", (req, res) => {
  const { priorities } = req.body; // [{ user_id, priority }, ...]
  if (!Array.isArray(priorities)) return res.status(400).json({ error: "priorities deve ser uma lista" });

  const update = db.prepare(
    "UPDATE distribution_queue_members SET priority = ? WHERE queue_id = ? AND user_id = ?"
  );
  for (const p of priorities) update.run(p.priority, req.params.id, p.user_id);

  const queue = db.prepare("SELECT * FROM distribution_queues WHERE id = ?").get(req.params.id);
  res.json({ queue: withMembers(queue) });
});

// --- Regras de distribuição por região (cod_1 = UF, cod_2 = cidade, cod_3 = bairro/tipo) ---

router.get("/rules", (req, res) => {
  const rules = db
    .prepare(
      `SELECT r.*, u.name as seller_name FROM distribution_rules r
       JOIN users u ON u.id = r.seller_id
       ORDER BY r.priority ASC`
    )
    .all();
  res.json({ rules: rules.map((r) => ({ ...r, active: !!r.active })) });
});

router.post("/rules", (req, res) => {
  const { cod_1, cod_2, cod_3, priority, type_rule, seller_id } = req.body;
  if (!seller_id) return res.status(400).json({ error: "seller_id é obrigatório" });

  const result = db
    .prepare(
      `INSERT INTO distribution_rules (cod_1, cod_2, cod_3, priority, type_rule, seller_id, active)
       VALUES (?, ?, ?, ?, ?, ?, 1)`
    )
    .run(cod_1 || null, cod_2 || null, cod_3 || null, priority ?? 0, type_rule || "distribution", seller_id);

  const rule = db.prepare("SELECT * FROM distribution_rules WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json({ rule: { ...rule, active: true } });
});

router.patch("/rules/:id", (req, res) => {
  const { cod_1, cod_2, cod_3, priority, type_rule, seller_id, active } = req.body;
  const fields = [];
  const params = [];
  const set = (col, val) => {
    fields.push(`${col} = ?`);
    params.push(val);
  };
  if (cod_1 !== undefined) set("cod_1", cod_1 || null);
  if (cod_2 !== undefined) set("cod_2", cod_2 || null);
  if (cod_3 !== undefined) set("cod_3", cod_3 || null);
  if (priority !== undefined) set("priority", priority);
  if (type_rule !== undefined) set("type_rule", type_rule);
  if (seller_id !== undefined) set("seller_id", seller_id);
  if (active !== undefined) set("active", active ? 1 : 0);
  if (!fields.length) return res.status(400).json({ error: "Nada para atualizar" });

  params.push(req.params.id);
  db.prepare(`UPDATE distribution_rules SET ${fields.join(", ")} WHERE id = ?`).run(...params);
  const rule = db.prepare("SELECT * FROM distribution_rules WHERE id = ?").get(req.params.id);
  res.json({ rule: { ...rule, active: !!rule.active } });
});

router.delete("/rules/:id", (req, res) => {
  db.prepare("DELETE FROM distribution_rules WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

export default router;
