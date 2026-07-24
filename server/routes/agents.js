import { Router } from "express";
import bcrypt from "bcryptjs";
import db from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { batchUpdateTimeshift } from "../lib/distribution.js";

const router = Router();
router.use(requireAuth);

const AGENT_FIELDS = `id, name, email, role, active, sees_bolsao, external_id, can_access_users, show_in_metrics, company_id, created_at`;

router.get("/", (req, res) => {
  const agents = db
    .prepare(
      `SELECT ${AGENT_FIELDS},
        (SELECT COUNT(*) FROM leads WHERE assigned_to = users.id) as total_leads,
        (SELECT COUNT(*) FROM leads WHERE assigned_to = users.id AND status = 'ganho') as leads_ganhos
       FROM users ORDER BY name ASC`
    )
    .all();
  res.json({ agents });
});

router.post("/", requireAdmin, (req, res) => {
  const { name, email, password, role, external_id, can_access_users, show_in_metrics, company_id } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Nome, email e senha são obrigatórios" });
  }
  const hash = bcrypt.hashSync(password, 8);
  try {
    const result = db
      .prepare(
        `INSERT INTO users (name, email, password, role, external_id, can_access_users, show_in_metrics, company_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        name,
        email,
        hash,
        role || "agent",
        external_id || null,
        can_access_users ? 1 : 0,
        show_in_metrics === false ? 0 : 1,
        company_id || null
      );
    const agent = db.prepare(`SELECT ${AGENT_FIELDS} FROM users WHERE id = ?`).get(result.lastInsertRowid);
    res.status(201).json({ agent });
  } catch (err) {
    res.status(400).json({ error: "Email já cadastrado" });
  }
});

router.patch("/:id", requireAdmin, (req, res) => {
  const {
    active, name, role, sees_bolsao,
    external_id, can_access_users, show_in_metrics, company_id,
  } = req.body;
  const fields = [];
  const params = [];
  const set = (col, val) => {
    fields.push(`${col} = ?`);
    params.push(val);
  };

  if (active !== undefined) set("active", active ? 1 : 0);
  if (name) set("name", name);
  if (role) set("role", role);
  if (sees_bolsao !== undefined) set("sees_bolsao", sees_bolsao ? 1 : 0);
  if (external_id !== undefined) set("external_id", external_id || null);
  if (can_access_users !== undefined) set("can_access_users", can_access_users ? 1 : 0);
  if (show_in_metrics !== undefined) set("show_in_metrics", show_in_metrics ? 1 : 0);
  if (company_id !== undefined) set("company_id", company_id || null);
  if (!fields.length) return res.status(400).json({ error: "Nada para atualizar" });

  params.push(req.params.id);
  db.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).run(...params);
  const agent = db.prepare(`SELECT ${AGENT_FIELDS} FROM users WHERE id = ?`).get(req.params.id);
  res.json({ agent });
});

// Atualiza em lote a ordem de prioridade de vários vendedores no rodízio,
// sem precisar mexer fila por fila (equivalente ao PUT /sellers/batch_update_timeshift)
router.put("/batch-timeshift", requireAdmin, (req, res) => {
  const { seller_ids } = req.body;
  if (!Array.isArray(seller_ids) || !seller_ids.length) {
    return res.status(400).json({ error: "seller_ids deve ser uma lista não vazia" });
  }
  batchUpdateTimeshift(seller_ids);
  res.json({ success: true });
});

export default router;
