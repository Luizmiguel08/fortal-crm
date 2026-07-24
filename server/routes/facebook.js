/**
 * INTEGRAÇÃO COM FACEBOOK/INSTAGRAM LEAD ADS
 * -------------------------------------------
 * Como funciona de verdade (o que você precisa fazer do lado do Meta):
 *
 * 1. Crie um App em https://developers.facebook.com/apps (tipo "Empresa")
 * 2. Adicione o produto "Webhooks" e o produto "Facebook Login for Business"
 * 3. Na página do seu negócio, gere um "Page Access Token" com a permissão
 *    `leads_retrieval` e `pages_show_list` (pode gerar via Graph API Explorer:
 *    https://developers.facebook.com/tools/explorer)
 * 4. Configure o Webhook do seu App apontando para:
 *      https://SEU-BACKEND/api/facebook/webhook
 *    campo de assinatura: "leadgen", Verify Token: o mesmo que você colocar
 *    na variável FB_VERIFY_TOKEN do .env
 * 5. Assine o Webhook "leadgen" na sua Página (isso é feito automaticamente
 *    quando você usa a tela de Integrações do sistema com o token certo, ou
 *    manualmente via Graph API)
 *
 * Esse arquivo já implementa o lado do backend: verificação do webhook,
 * recebimento do evento em tempo real, busca os dados completos do lead na
 * Graph API e cria o lead no sistema (que já dispara a distribuição automática
 * round-robin).
 *
 * IMPORTANTE: isso só funciona com uma URL pública (https). Em localhost o
 * Meta não consegue chamar seu webhook — funciona de verdade só depois do
 * deploy (ver DEPLOY.md).
 */
import { Router } from "express";
import db from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { pickNextAgent, clearRankOverride } from "../lib/distribution.js";
import { fireWebhook } from "../lib/webhooks.js";
import { broadcast } from "../lib/events.js";

const router = Router();

function createLeadFromFacebook({ name, phone, email, formName, pageName }) {
  const nextAgent = pickNextAgent();
  const result = db
    .prepare(
      `INSERT INTO leads (name, phone, email, source, interest, status, temperature, assigned_to, assigned_at)
       VALUES (?, ?, ?, ?, ?, 'novo', 'quente', ?, ${nextAgent ? "CURRENT_TIMESTAMP" : "NULL"})`
    )
    .run(
      name || "Lead do Facebook",
      phone || null,
      email || null,
      `Facebook Ads${pageName ? ` (${pageName})` : ""}`,
      formName || null,
      nextAgent?.id || null
    );

  const leadId = result.lastInsertRowid;
  if (nextAgent) {
    db.prepare(
      "INSERT INTO activities (lead_id, user_id, type, content) VALUES (?, ?, 'atribuicao', ?)"
    ).run(leadId, nextAgent.id, `Lead do Facebook distribuído automaticamente para ${nextAgent.name}`);
  }
  const lead = db.prepare("SELECT * FROM leads WHERE id = ?").get(leadId);
  fireWebhook("on_create_lead", lead);
  broadcast("lead_created", lead);
  if (nextAgent) clearRankOverride(nextAgent.id);
  return leadId;
}

// 1) Verificação do webhook (Meta chama isso uma vez, ao configurar)
router.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.FB_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// 2) Recebimento em tempo real de novos leads de formulário
router.post("/webhook", async (req, res) => {
  res.sendStatus(200); // responde rápido — o Meta espera resposta em poucos segundos

  try {
    const entries = req.body?.entry || [];
    for (const entry of entries) {
      const pageId = entry.id;
      const page = db.prepare("SELECT * FROM fb_pages WHERE page_id = ?").get(pageId);
      if (!page) continue; // página não conectada no sistema

      for (const change of entry.changes || []) {
        if (change.field !== "leadgen") continue;
        const leadgenId = change.value?.leadgen_id;
        if (!leadgenId) continue;

        const resp = await fetch(
          `https://graph.facebook.com/v20.0/${leadgenId}?access_token=${page.access_token}`
        );
        const data = await resp.json();
        if (data.error) {
          console.error("[facebook] erro ao buscar lead:", data.error);
          continue;
        }

        const fields = {};
        for (const f of data.field_data || []) {
          fields[f.name] = f.values?.[0];
        }

        createLeadFromFacebook({
          name: fields.full_name || fields.name,
          phone: fields.phone_number,
          email: fields.email,
          formName: data.form_name,
          pageName: page.page_name,
        });
      }
    }
  } catch (err) {
    console.error("[facebook] erro processando webhook:", err);
  }
});

// --- Gestão de páginas conectadas (equivalente à tela "Integrações" do C2S) ---

router.get("/pages", requireAuth, (req, res) => {
  const pages = db.prepare("SELECT id, page_id, page_name, created_at FROM fb_pages ORDER BY created_at DESC").all();
  res.json({ pages });
});

// Conecta uma página colando o Page ID + Page Access Token
// (equivalente ao botão "Integrar" do C2S — sem OAuth completo por enquanto,
// veja o comentário no topo do arquivo sobre como gerar esse token)
router.post("/pages", requireAuth, requireAdmin, async (req, res) => {
  const { page_id, access_token } = req.body;
  if (!page_id || !access_token) {
    return res.status(400).json({ error: "Page ID e Access Token são obrigatórios" });
  }

  // valida o token buscando o nome da página na Graph API
  try {
    const resp = await fetch(`https://graph.facebook.com/v20.0/${page_id}?fields=name&access_token=${access_token}`);
    const data = await resp.json();
    if (data.error) {
      return res.status(400).json({ error: `Token inválido: ${data.error.message}` });
    }

    db.prepare(
      "INSERT INTO fb_pages (page_id, page_name, access_token) VALUES (?, ?, ?) ON CONFLICT(page_id) DO UPDATE SET page_name = excluded.page_name, access_token = excluded.access_token"
    ).run(page_id, data.name, access_token);

    const page = db.prepare("SELECT id, page_id, page_name, created_at FROM fb_pages WHERE page_id = ?").get(page_id);
    res.status(201).json({ page });
  } catch (err) {
    res.status(500).json({ error: "Não foi possível validar o token com a Graph API" });
  }
});

router.delete("/pages/:id", requireAuth, requireAdmin, (req, res) => {
  db.prepare("DELETE FROM fb_pages WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

export default router;
