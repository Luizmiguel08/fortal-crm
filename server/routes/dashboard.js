import { Router } from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/stats", (req, res) => {
  const byStatus = db
    .prepare("SELECT status, COUNT(*) as count FROM leads GROUP BY status")
    .all();

  const byTemperature = db
    .prepare("SELECT temperature, COUNT(*) as count FROM leads GROUP BY temperature")
    .all();

  const bySource = db
    .prepare("SELECT source, COUNT(*) as count FROM leads GROUP BY source ORDER BY count DESC")
    .all();

  const totals = db.prepare("SELECT COUNT(*) as total FROM leads").get();
  const ganhos = db.prepare("SELECT COUNT(*) as c FROM leads WHERE status = 'ganho'").get().c;
  const perdidos = db.prepare("SELECT COUNT(*) as c FROM leads WHERE status = 'perdido'").get().c;
  const semAtribuicao = db.prepare("SELECT COUNT(*) as c FROM leads WHERE assigned_to IS NULL").get().c;

  const ranking = db
    .prepare(
      `SELECT u.id, u.name,
        COUNT(l.id) as total_leads,
        SUM(CASE WHEN l.status = 'ganho' THEN 1 ELSE 0 END) as ganhos
       FROM users u
       LEFT JOIN leads l ON l.assigned_to = u.id
       WHERE u.role = 'agent'
       GROUP BY u.id
       ORDER BY ganhos DESC, total_leads DESC`
    )
    .all();

  const taxaConversao = totals.total > 0 ? ((ganhos / totals.total) * 100).toFixed(1) : "0.0";

  res.json({
    total: totals.total,
    ganhos,
    perdidos,
    semAtribuicao,
    taxaConversao,
    byStatus,
    byTemperature,
    bySource,
    ranking,
  });
});

export default router;
