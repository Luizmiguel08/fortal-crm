import { Router } from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// Regras de alerta (ajustáveis):
// - Lead quente sem nenhum contato há mais de 2 horas desde a criação
// - Lead quente ou morno sem contato há mais de 24 horas desde o último contato
// - Lead novo sem corretor atribuído
router.get("/", (req, res) => {
  const now = Date.now();
  const HOUR = 1000 * 60 * 60;

  const openLeads = db
    .prepare(
      `SELECT l.*, u.name as agent_name FROM leads l
       LEFT JOIN users u ON u.id = l.assigned_to
       WHERE l.status NOT IN ('ganho', 'perdido')`
    )
    .all();

  const notifications = [];

  for (const lead of openLeads) {
    const created = new Date(lead.created_at + "Z").getTime();
    const lastContact = lead.last_contact_at ? new Date(lead.last_contact_at + "Z").getTime() : null;

    if (!lead.assigned_to) {
      notifications.push({
        id: `unassigned-${lead.id}`,
        lead_id: lead.id,
        severity: "alta",
        message: `${lead.name} está sem corretor atribuído`,
      });
      continue;
    }

    if (lead.temperature === "quente" && !lastContact && now - created > 2 * HOUR) {
      notifications.push({
        id: `no-contact-${lead.id}`,
        lead_id: lead.id,
        severity: "alta",
        message: `${lead.name} é um lead quente e ainda não teve nenhum contato (${lead.agent_name || "sem corretor"})`,
      });
    } else if (lastContact && now - lastContact > 24 * HOUR && lead.temperature !== "frio") {
      notifications.push({
        id: `stale-${lead.id}`,
        lead_id: lead.id,
        severity: "media",
        message: `${lead.name} está sem follow-up há mais de 24h (${lead.agent_name})`,
      });
    }
  }

  notifications.sort((a, b) => (a.severity === "alta" ? -1 : 1) - (b.severity === "alta" ? -1 : 1));

  res.json({ notifications, count: notifications.length });
});

export default router;
