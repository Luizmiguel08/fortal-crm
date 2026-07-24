import db from "../db.js";

/**
 * Dispara um webhook (se configurado e a ação estiver ativa) para uma URL externa.
 * Não bloqueia o fluxo principal: falhas são só logadas no console.
 *
 * Ações disponíveis: on_create_lead, on_update_lead, on_close_lead
 * (mesma nomenclatura da API do C2S, pra facilitar quem já integra com ela)
 */
export async function fireWebhook(action, lead) {
  const config = db.prepare("SELECT * FROM webhooks_config WHERE id = 1").get();
  if (!config?.hook_url) return;

  const enabled = {
    on_create_lead: config.on_create_lead,
    on_update_lead: config.on_update_lead,
    on_close_lead: config.on_close_lead,
  }[action];
  if (!enabled) return;

  try {
    await fetch(config.hook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hook_action: action, lead }),
    });
  } catch (err) {
    console.error(`[webhook] falha ao notificar ${action}:`, err.message);
  }
}
