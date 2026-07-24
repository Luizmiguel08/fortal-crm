import { Router } from "express";
import db from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", (req, res) => {
  const reasons = db.prepare("SELECT * FROM lost_reasons ORDER BY name ASC").all();
  res.json({ reasons });
});

router.post("/", requireAdmin, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Nome é obrigatório" });
  try {
    const result = db.prepare("INSERT INTO lost_reasons (name) VALUES (?)").run(name);
    const reason = db.prepare("SELECT * FROM lost_reasons WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json({ reason });
  } catch {
    res.status(400).json({ error: "Esse motivo já existe" });
  }
});

router.delete("/:id", requireAdmin, (req, res) => {
  db.prepare("DELETE FROM lost_reasons WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

export default router;
