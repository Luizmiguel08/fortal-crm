import { Router } from "express";
import db from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// GET /api/tags?name=&autofill=
router.get("/", (req, res) => {
  const { name, autofill } = req.query;
  let sql = "SELECT * FROM tags WHERE 1=1";
  const params = [];
  if (name) {
    sql += " AND name = ?";
    params.push(name);
  }
  if (autofill !== undefined) {
    sql += " AND autofill = ?";
    params.push(autofill === "true" ? 1 : 0);
  }
  sql += " ORDER BY name ASC";

  const tags = db.prepare(sql).all(...params).map((t) => ({ ...t, enabled: !!t.enabled, autofill: !!t.autofill }));
  res.json({ tags });
});

// Cria uma tag nova. Se já existir uma com o mesmo nome, retorna a existente (201).
router.post("/", requireAdmin, (req, res) => {
  const { name, autofill, instructions } = req.body.tag || req.body;
  if (!name) return res.status(422).json({ error: "Nome é obrigatório" });

  const existing = db.prepare("SELECT * FROM tags WHERE name = ?").get(name);
  if (existing) {
    return res.status(201).json({ tag: { ...existing, enabled: !!existing.enabled, autofill: !!existing.autofill } });
  }

  const result = db
    .prepare("INSERT INTO tags (name, autofill, instructions) VALUES (?, ?, ?)")
    .run(name, autofill ? 1 : 0, instructions || null);
  const tag = db.prepare("SELECT * FROM tags WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json({ tag: { ...tag, enabled: true, autofill: !!tag.autofill } });
});

router.patch("/:id", requireAdmin, (req, res) => {
  const { name, enabled, autofill, instructions } = req.body;
  const fields = [];
  const params = [];
  if (name !== undefined) fields.push("name = ?"), params.push(name);
  if (enabled !== undefined) fields.push("enabled = ?"), params.push(enabled ? 1 : 0);
  if (autofill !== undefined) fields.push("autofill = ?"), params.push(autofill ? 1 : 0);
  if (instructions !== undefined) fields.push("instructions = ?"), params.push(instructions);
  if (!fields.length) return res.status(400).json({ error: "Nada para atualizar" });

  params.push(req.params.id);
  db.prepare(`UPDATE tags SET ${fields.join(", ")} WHERE id = ?`).run(...params);
  const tag = db.prepare("SELECT * FROM tags WHERE id = ?").get(req.params.id);
  res.json({ tag: { ...tag, enabled: !!tag.enabled, autofill: !!tag.autofill } });
});

router.delete("/:id", requireAdmin, (req, res) => {
  db.prepare("DELETE FROM lead_tags WHERE tag_id = ?").run(req.params.id);
  db.prepare("DELETE FROM tags WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

export default router;
