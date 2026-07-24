/**
 * ENTRADA GENÉRICA DE LEADS — pra portais imobiliários (ZAP, VivaReal, OLX,
 * Chaves na Mão, etc.) e pra Zapier/Make, que costumam suportar "enviar um
 * webhook" como ação de automação.
 *
 * Como usar:
 * 1. A tela de Integrações mostra a URL do webhook + uma chave de API única
 *    deste sistema.
 * 2. No portal (ou no Zapier), configure um "Webhook" apontando pra essa URL,
 *    method POST, JSON body com pelo menos: { "name": "...", "phone": "..." }
 *    Campos aceitos: name, phone, email, source, interest.
 * 3. A chave de API vai na query string: ?key=SUA_CHAVE (mais simples de
 *    configurar na maioria dos portais/Zapier do que usar header customizado).
 */
import { Router } from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { pickNextAgent, clearRankOverride } from "../lib/distribution.js";
import { fireWebhook } from "../lib/webhooks.js";

const router = Router();

function getKey() {
  return db.prepare("SELECT api_key FROM lead_intake_settings WHERE id = 1").get()?.api_key;
}

// Painel: mostrar a chave atual (autenticado)
router.get("/key", requireAuth, (req, res) => {
  res.json({ api_key: getKey() });
});

// Painel: gerar uma chave nova (invalida a antiga — use se vazar)
router.post("/key/rotate", requireAuth, (req, res) => {
  const key = [...Array(24)].map(() => Math.floor(Math.random() * 16).toString(16)).join("") +
    Date.now().toString(16);
  db.prepare("UPDATE lead_intake_settings SET api_key = ? WHERE id = 1").run(key);
  res.json({ api_key: key });
});

// Endpoint público — validado pela chave na query string, não por login
router.post("/inbound", (req, res) => {
  const key = req.query.key || req.headers["x-api-key"];
  if (!key || key !== getKey()) {
    return res.status(401).json({ error: "Chave de API inválida ou ausente" });
  }

  const { name, phone, email, source, interest } = req.body || {};
  if (!name && !phone && !email) {
    return res.status(400).json({ error: "Envie ao menos name, phone ou email" });
  }

  const nextAgent = pickNextAgent();
  const result = db
    .prepare(
      `INSERT INTO leads (name, phone, email, source, interest, status, temperature, assigned_to, assigned_at)
       VALUES (?, ?, ?, ?, ?, 'novo', 'morno', ?, ${nextAgent ? "CURRENT_TIMESTAMP" : "NULL"})`
    )
    .run(
      name || "Lead sem nome",
      phone || null,
      email || null,
      source || "Portal/Webhook",
      interest || null,
      nextAgent?.id || null
    );

  const leadId = result.lastInsertRowid;
  if (nextAgent) {
    db.prepare(
      "INSERT INTO activities (lead_id, user_id, type, content) VALUES (?, ?, 'atribuicao', ?)"
    ).run(leadId, nextAgent.id, `Lead recebido via webhook e distribuído automaticamente para ${nextAgent.name}`);
    clearRankOverride(nextAgent.id);
  }

  const lead = db.prepare("SELECT * FROM leads WHERE id = ?").get(leadId);
  fireWebhook("on_create_lead", lead);

  res.status(201).json({ ok: true, lead_id: leadId });
});

export default router;
