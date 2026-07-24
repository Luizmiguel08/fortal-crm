import { Router } from "express";
import db from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth, requireAdmin);

const VALID_ACTIONS = ["on_create_lead", "on_update_lead", "on_close_lead"];

router.get("/", (req, res) => {
  const config = db.prepare("SELECT * FROM webhooks_config WHERE id = 1").get();
  res.json({ config });
});

// Equivalente ao POST /api/subscribe do C2S
router.post("/subscribe", (req, res) => {
  const { hook_action, hook_url } = req.body;
  if (!VALID_ACTIONS.includes(hook_action) || !hook_url) {
    return res.status(422).json({ error: "hook_action inválido ou hook_url ausente" });
  }

  const current = db.prepare("SELECT * FROM webhooks_config WHERE id = 1").get();

  // Assim como no C2S: só existe 1 endpoint por vez. Se a URL mudar, zera as outras ações.
  if (current.hook_url && current.hook_url !== hook_url) {
    db.prepare(
      "UPDATE webhooks_config SET hook_url = ?, on_create_lead = 0, on_update_lead = 0, on_close_lead = 0 WHERE id = 1"
    ).run(hook_url);
  } else if (!current.hook_url) {
    db.prepare("UPDATE webhooks_config SET hook_url = ? WHERE id = 1").run(hook_url);
  }

  db.prepare(`UPDATE webhooks_config SET ${hook_action} = 1 WHERE id = 1`).run();

  const config = db.prepare("SELECT * FROM webhooks_config WHERE id = 1").get();
  res.json({ success: true, config });
});

// Equivalente ao POST /api/unsubscribe do C2S
router.post("/unsubscribe", (req, res) => {
  const { hook_action } = req.body;
  if (!VALID_ACTIONS.includes(hook_action)) {
    return res.status(422).json({ error: "hook_action inválido" });
  }
  db.prepare(`UPDATE webhooks_config SET ${hook_action} = 0 WHERE id = 1`).run();
  res.json({ success: true, message: "Unsubscribed successfully" });
});

export default router;
