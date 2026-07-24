/**
 * INTEGRAÇÃO COM WHATSAPP — ESQUELETO PRONTO PARA PLUGAR A API REAL
 * ------------------------------------------------------------------
 * Este arquivo NÃO envia mensagens reais. Ele mostra exatamente onde
 * e como conectar um provedor real de WhatsApp. Escolha um:
 *
 *  1) Meta WhatsApp Cloud API (oficial, gratuita até certo volume)
 *     https://developers.facebook.com/docs/whatsapp/cloud-api
 *  2) Twilio WhatsApp API (paga, mais simples de configurar)
 *     https://www.twilio.com/docs/whatsapp
 *  3) Z-API / outros provedores BR (não oficiais, mais baratos)
 *
 * Depois de criar a conta e obter as credenciais, preencha o .env:
 *   WHATSAPP_TOKEN=...
 *   WHATSAPP_PHONE_ID=...
 *   WHATSAPP_VERIFY_TOKEN=... (você escolhe, usado na verificação do webhook)
 */
import { Router } from "express";
import db from "../db.js";

const router = Router();

// 1) Verificação do webhook (exigida pela Meta na configuração inicial)
router.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// 2) Recebimento de mensagens do WhatsApp (quando o lead responde)
router.post("/webhook", (req, res) => {
  // Formato real do payload da Meta Cloud API — ajuste o parsing conforme
  // o provedor escolhido. Aqui tratamos o caso genérico para o clone:
  const { phone, body } = req.body;

  if (phone && body) {
    const lead = db.prepare("SELECT * FROM leads WHERE phone = ?").get(phone);
    if (lead) {
      db.prepare(
        "INSERT INTO messages (lead_id, direction, body, channel) VALUES (?, 'in', ?, 'whatsapp')"
      ).run(lead.id, body);
      db.prepare("UPDATE leads SET last_contact_at = CURRENT_TIMESTAMP, temperature = 'quente' WHERE id = ?").run(lead.id);
    }
  }

  res.sendStatus(200);
});

// 3) Função utilitária para enviar mensagem via provedor real.
// Chame sendWhatsAppMessage(phone, text) a partir de routes/leads.js
// no lugar do stub atual, assim que tiver as credenciais.
export async function sendWhatsAppMessage(phone, text) {
  if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_ID) {
    console.warn("[whatsapp] Credenciais não configuradas — mensagem não enviada de verdade:", { phone, text });
    return { simulated: true };
  }

  const resp = await fetch(
    `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: { body: text },
      }),
    }
  );
  return resp.json();
}

export default router;
