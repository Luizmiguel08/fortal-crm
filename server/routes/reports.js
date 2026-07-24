import { Router } from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// Leads criados por dia nos últimos N dias (default 30) — para gráfico de evolução
router.get("/timeline", (req, res) => {
  const days = Number(req.query.days) || 30;

  const rows = db
    .prepare(
      `SELECT date(created_at) as day,
              COUNT(*) as total,
              SUM(CASE WHEN status = 'ganho' THEN 1 ELSE 0 END) as ganhos
       FROM leads
       WHERE created_at >= date('now', ?)
       GROUP BY day
       ORDER BY day ASC`
    )
    .all(`-${days} days`);

  res.json({ timeline: rows });
});

// Desempenho comparado entre corretores (para relatório e ranking)
router.get("/performance", (req, res) => {
  const rows = db
    .prepare(
      `SELECT u.id, u.name,
        COUNT(l.id) as total_leads,
        SUM(CASE WHEN l.status = 'ganho' THEN 1 ELSE 0 END) as ganhos,
        SUM(CASE WHEN l.status = 'perdido' THEN 1 ELSE 0 END) as perdidos,
        ROUND(AVG(CASE
          WHEN l.last_contact_at IS NOT NULL
          THEN (julianday(l.last_contact_at) - julianday(l.created_at)) * 24
          ELSE NULL END), 1) as tempo_medio_resposta_horas
       FROM users u
       LEFT JOIN leads l ON l.assigned_to = u.id
       WHERE u.role = 'agent'
       GROUP BY u.id
       ORDER BY ganhos DESC`
    )
    .all();

  res.json({ performance: rows });
});

// Exporta todos os leads em CSV
router.get("/export/csv", (req, res) => {
  const leads = db
    .prepare(
      `SELECT l.id, l.name, l.phone, l.email, l.source, l.interest, l.status, l.temperature,
              u.name as agent_name, l.created_at, l.last_contact_at
       FROM leads l LEFT JOIN users u ON u.id = l.assigned_to
       ORDER BY l.created_at DESC`
    )
    .all();

  const header = [
    "ID", "Nome", "Telefone", "Email", "Origem", "Interesse",
    "Status", "Temperatura", "Corretor", "Criado em", "Último contato",
  ];

  const escape = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };

  const lines = [header.join(",")];
  for (const l of leads) {
    lines.push(
      [
        l.id, l.name, l.phone, l.email, l.source, l.interest,
        l.status, l.temperature, l.agent_name, l.created_at, l.last_contact_at,
      ].map(escape).join(",")
    );
  }

  const csv = "\uFEFF" + lines.join("\n"); // BOM para acentuação abrir certo no Excel

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="leads-${Date.now()}.csv"`);
  res.send(csv);
});

export default router;
