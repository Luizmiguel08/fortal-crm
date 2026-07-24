import { Router } from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// Retorna em qual posição o corretor logado está na(s) fila(s) de distribuição
// de que participa — usado pro badge "Xº na fila" no app.
router.get("/my-position", (req, res) => {
  const queues = db
    .prepare(
      `SELECT q.id, q.name FROM distribution_queues q
       JOIN distribution_queue_members m ON m.queue_id = q.id
       WHERE m.user_id = ? AND q.active = 1`
    )
    .all(req.user.id);

  if (!queues.length) return res.json({ position: null, queue: null, total: null });

  const queue = queues[0];
  const members = db
    .prepare(
      `SELECT u.id, u.active, m.priority,
        MAX(COALESCE(u.queue_rank_override,''), COALESCE((SELECT MAX(assigned_at) FROM leads WHERE assigned_to = u.id),'')) as last_assigned
       FROM distribution_queue_members m JOIN users u ON u.id = m.user_id
       WHERE m.queue_id = ? AND u.active = 1
       ORDER BY m.priority ASC, (last_assigned IS NULL) DESC, last_assigned ASC`
    )
    .all(queue.id);

  const idx = members.findIndex((m) => m.id === req.user.id);
  res.json({
    position: idx === -1 ? null : idx + 1,
    total: members.length,
    queue: queue.name,
  });
});

export default router;
