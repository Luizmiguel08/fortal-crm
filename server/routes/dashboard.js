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

  // Corretores com mais leads pendentes de primeira resposta (ainda não contatados)
  const semResposta = db
    .prepare(
      `SELECT u.id, u.name, COUNT(l.id) as total
       FROM leads l JOIN users u ON u.id = l.assigned_to
       WHERE l.assigned_to IS NOT NULL
         AND l.in_bolsao = 0
         AND l.status NOT IN ('ganho', 'perdido')
         AND (l.last_contact_at IS NULL OR l.last_contact_at < l.assigned_at)
       GROUP BY u.id
       ORDER BY total DESC
       LIMIT 5`
    )
    .all();

  // Corretores com o tempo médio de primeira resposta mais rápido (em minutos)
  const respostaRapida = db
    .prepare(
      `SELECT u.id, u.name,
        COUNT(l.id) as total_respondidos,
        AVG((julianday(l.last_contact_at) - julianday(l.assigned_at)) * 24 * 60) as media_minutos
       FROM leads l JOIN users u ON u.id = l.assigned_to
       WHERE l.assigned_at IS NOT NULL
         AND l.last_contact_at IS NOT NULL
         AND l.last_contact_at >= l.assigned_at
       GROUP BY u.id
       HAVING total_respondidos > 0
       ORDER BY media_minutos ASC
       LIMIT 5`
    )
    .all()
    .map((r) => ({ ...r, media_minutos: Math.round(r.media_minutos) }));

  // Tempo médio geral de resposta, pra card de "informações gerais"
  const tempoMedioGeral = db
    .prepare(
      `SELECT AVG((julianday(last_contact_at) - julianday(assigned_at)) * 24 * 60) as media
       FROM leads
       WHERE assigned_at IS NOT NULL AND last_contact_at IS NOT NULL AND last_contact_at >= assigned_at`
    )
    .get();

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
    semResposta,
    respostaRapida,
    tempoMedioMinutos: tempoMedioGeral.media ? Math.round(tempoMedioGeral.media) : null,
  });
});

export default router;
