import { Router } from "express";
import db from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// Lista todas as empresas do grupo (matriz + filiais)
router.get("/", (req, res) => {
  const companies = db.prepare("SELECT * FROM companies ORDER BY parent_company_id IS NOT NULL, name ASC").all();
  res.json({ companies });
});

router.post("/", requireAdmin, (req, res) => {
  const { name, parent_company_id } = req.body;
  if (!name) return res.status(400).json({ error: "Nome é obrigatório" });

  const result = db
    .prepare("INSERT INTO companies (name, parent_company_id) VALUES (?, ?)")
    .run(name, parent_company_id || null);
  const company = db.prepare("SELECT * FROM companies WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json({ company });
});

router.patch("/:id", requireAdmin, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Nada para atualizar" });
  db.prepare("UPDATE companies SET name = ? WHERE id = ?").run(name, req.params.id);
  const company = db.prepare("SELECT * FROM companies WHERE id = ?").get(req.params.id);
  res.json({ company });
});

router.delete("/:id", requireAdmin, (req, res) => {
  const company = db.prepare("SELECT * FROM companies WHERE id = ?").get(req.params.id);
  if (!company) return res.status(404).json({ error: "Empresa não encontrada" });
  if (!company.parent_company_id) {
    return res.status(400).json({ error: "Não é possível excluir a empresa matriz" });
  }
  db.prepare("UPDATE users SET company_id = NULL WHERE company_id = ?").run(req.params.id);
  db.prepare("UPDATE leads SET company_id = NULL WHERE company_id = ?").run(req.params.id);
  db.prepare("DELETE FROM companies WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

export default router;
