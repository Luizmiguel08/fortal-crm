import db from "../db.js";

// Expressão SQL que calcula "a que horas esse usuário foi atendido por último".
// Se houver um ajuste manual (queue_rank_override, feito via "prioridades em lote"
// ou "próximo vendedor"), ele sempre vence — até a pessoa receber um lead de
// verdade, momento em que o ajuste é limpo (ver clearRankOverride) e o histórico
// real volta a valer. Isso implementa o mesmo efeito do endpoint
// /sellers/batch_update_timeshift do C2S.
const RANK_EXPR = `COALESCE(u.queue_rank_override, (SELECT MAX(assigned_at) FROM leads WHERE assigned_to = u.id))`;

// Limpa o ajuste manual de um usuário — chamado sempre que ele recebe um lead de
// verdade, pra que o histórico real volte a valer nas próximas distribuições.
export function clearRankOverride(userId) {
  if (!userId) return;
  db.prepare("UPDATE users SET queue_rank_override = NULL WHERE id = ?").run(userId);
}

// Escolhe o melhor membro disponível dentro de um grupo de IDs de vendedor
// (usado tanto pelas filas quanto pelas regras de rodízio regional).
function pickBestMember(sellerIds) {
  let best = null;
  for (const sellerId of sellerIds) {
    const u = db
      .prepare(
        `SELECT id, name, ${RANK_EXPR} as last_assigned
         FROM users u WHERE id = ? AND active = 1`
      )
      .get(sellerId);
    if (!u) continue;
    if (!best || (u.last_assigned || "") < (best.last_assigned || "")) best = u;
  }
  return best;
}

/**
 * Escolhe o próximo responsável por um lead novo.
 * Ordem de decisão (igual ao conceito de "Regras de Distribuição" + "Filas" do C2S):
 *   1. Regras de distribuição por região (cod_1/cod_2/cod_3), por prioridade
 *   2. Filas de distribuição ativas, por prioridade (respeitando "próximo vendedor" forçado e prioridade por membro)
 *   3. Usuário de segurança (fallback)
 *
 * `region` é opcional: { uf, cidade, bairro }
 */
export function pickNextAgent(region = {}) {
  const { uf = null, cidade = null, bairro = null } = region;

  // 1) Regras de distribuição regional
  const rules = db
    .prepare("SELECT * FROM distribution_rules WHERE active = 1 ORDER BY priority ASC")
    .all();

  for (const rule of rules) {
    const matches =
      (!rule.cod_1 || rule.cod_1 === uf) &&
      (!rule.cod_2 || rule.cod_2 === cidade) &&
      (!rule.cod_3 || rule.cod_3 === bairro);
    if (!matches) continue;

    if (rule.type_rule === "rotation") {
      const group = db
        .prepare(
          `SELECT seller_id FROM distribution_rules
           WHERE active = 1 AND IFNULL(cod_1,'') = IFNULL(?,'') AND IFNULL(cod_2,'') = IFNULL(?,'') AND IFNULL(cod_3,'') = IFNULL(?,'')`
        )
        .all(rule.cod_1, rule.cod_2, rule.cod_3);
      const best = pickBestMember(group.map((g) => g.seller_id));
      if (best) return best;
    } else {
      const seller = db.prepare("SELECT id, name FROM users WHERE id = ? AND active = 1").get(rule.seller_id);
      if (seller) return seller;
    }
  }

  // 2) Filas de distribuição
  const queues = db
    .prepare("SELECT * FROM distribution_queues WHERE active = 1 ORDER BY priority ASC")
    .all();

  for (const queue of queues) {
    if (queue.forced_next_user_id) {
      const forced = db
        .prepare(
          `SELECT u.id, u.name FROM distribution_queue_members m JOIN users u ON u.id = m.user_id
           WHERE m.queue_id = ? AND u.id = ? AND u.active = 1`
        )
        .get(queue.id, queue.forced_next_user_id);
      if (forced) {
        db.prepare("UPDATE distribution_queues SET forced_next_user_id = NULL WHERE id = ?").run(queue.id);
        return forced;
      }
    }

    const member = db
      .prepare(
        `SELECT u.id, u.name, ${RANK_EXPR} as last_assigned
         FROM distribution_queue_members m
         JOIN users u ON u.id = m.user_id
         WHERE m.queue_id = ? AND u.active = 1
         ORDER BY m.priority ASC, last_assigned ASC
         LIMIT 1`
      )
      .get(queue.id);
    if (member) return member;
  }

  // 3) Usuário de segurança
  const settings = db.prepare("SELECT * FROM distribution_settings WHERE id = 1").get();
  if (settings?.fallback_user_id) {
    const fallback = db
      .prepare("SELECT id, name FROM users WHERE id = ? AND active = 1")
      .get(settings.fallback_user_id);
    if (fallback) return fallback;
  }

  return null;
}

// Redistribui um lead específico através de uma fila (ação manual e direta,
// equivalente ao endpoint /distribution_queues/:id/redistribute_lead)
export function redistributeThroughQueue(queueId) {
  const member = db
    .prepare(
      `SELECT u.id, u.name, ${RANK_EXPR} as last_assigned
       FROM distribution_queue_members m
       JOIN users u ON u.id = m.user_id
       WHERE m.queue_id = ? AND u.active = 1
       ORDER BY m.priority ASC, last_assigned ASC
       LIMIT 1`
    )
    .get(queueId);
  return member || null;
}

// Atualiza em lote a ordem de prioridade de vários vendedores: o primeiro da lista
// vira o próximo a receber, o segundo vem em seguida, e assim por diante. Usa um
// carimbo de tempo artificial (queue_rank_override) escalonado em 1 segundo entre
// cada um — esse ajuste sempre vence o histórico real até a pessoa receber um
// lead de verdade (ver clearRankOverride). Equivalente ao
// PUT /sellers/batch_update_timeshift do C2S.
export function batchUpdateTimeshift(sellerIds) {
  const base = new Date("2000-01-01T00:00:00Z").getTime(); // bem antigo: garante que vence qualquer histórico real
  const update = db.prepare("UPDATE users SET queue_rank_override = ? WHERE id = ?");
  sellerIds.forEach((id, index) => {
    const ts = new Date(base + index * 1000).toISOString().slice(0, 19).replace("T", " ");
    update.run(ts, id);
  });
}
