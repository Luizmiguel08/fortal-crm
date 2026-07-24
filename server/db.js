import { DatabaseSync } from "node:sqlite";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";
import { randomBytes } from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, "c2s.sqlite");
const db = new DatabaseSync(dbPath);

db.exec("PRAGMA journal_mode = WAL;");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'agent', -- 'admin' | 'agent'
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  source TEXT DEFAULT 'site', -- portal/origem do lead
  interest TEXT,              -- ex: imóvel/produto de interesse
  status TEXT NOT NULL DEFAULT 'novo', -- novo, atendimento, qualificado, proposta, ganho, perdido
  temperature TEXT NOT NULL DEFAULT 'morno', -- quente, morno, frio
  assigned_to INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_contact_at TEXT,
  FOREIGN KEY (assigned_to) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL,
  user_id INTEGER,
  type TEXT NOT NULL, -- nota, ligacao, whatsapp, status_change, atribuicao
  content TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL,
  direction TEXT NOT NULL, -- 'in' | 'out'
  body TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);

CREATE TABLE IF NOT EXISTS bolsao_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  enabled INTEGER NOT NULL DEFAULT 1,
  limit_minutes INTEGER NOT NULL DEFAULT 5,
  visibility TEXT NOT NULL DEFAULT 'todos', -- 'todos' | 'fila'
  hours TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bolsao_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL,
  lost_by_user_id INTEGER,
  entered_at TEXT DEFAULT CURRENT_TIMESTAMP,
  claimed_by_user_id INTEGER,
  claimed_at TEXT,
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);

CREATE TABLE IF NOT EXISTS fb_pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id TEXT NOT NULL UNIQUE,
  page_name TEXT NOT NULL,
  access_token TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS distribution_queues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'rodizio', -- 'rodizio' (por enquanto o único tipo implementado)
  active INTEGER NOT NULL DEFAULT 1,
  priority INTEGER NOT NULL DEFAULT 0, -- menor número = maior prioridade
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS distribution_queue_members (
  queue_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  PRIMARY KEY (queue_id, user_id)
);

CREATE TABLE IF NOT EXISTS distribution_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  fallback_user_id INTEGER -- "usuário de segurança": recebe quando nenhuma fila tem alguém disponível
);

CREATE TABLE IF NOT EXISTS distribution_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cod_1 TEXT, -- ex: estado/UF
  cod_2 TEXT, -- ex: cidade
  cod_3 TEXT, -- ex: bairro ou tipo de negociação
  priority INTEGER NOT NULL DEFAULT 0,
  type_rule TEXT NOT NULL DEFAULT 'distribution', -- 'distribution' (vendedor fixo) | 'rotation' (rodízio entre as regras do mesmo grupo)
  seller_id INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS webhooks_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  hook_url TEXT,
  on_create_lead INTEGER NOT NULL DEFAULT 0,
  on_update_lead INTEGER NOT NULL DEFAULT 0,
  on_close_lead INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS lead_intake_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  api_key TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stand_checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stand_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  check_in_at TEXT DEFAULT CURRENT_TIMESTAMP,
  check_out_at TEXT,
  FOREIGN KEY (stand_id) REFERENCES stands(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  enabled INTEGER NOT NULL DEFAULT 1,
  autofill INTEGER NOT NULL DEFAULT 0,
  instructions TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lead_tags (
  lead_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  created_by_user_id INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (lead_id, tag_id)
);

CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  parent_company_id INTEGER, -- NULL = matriz; senão, é filial de outra empresa
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lost_reasons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

// --- Migração leve: adiciona colunas novas em bancos já existentes ---
function ensureColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}
ensureColumn("leads", "assigned_at", "TEXT");
ensureColumn("leads", "in_bolsao", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("users", "sees_bolsao", "INTEGER NOT NULL DEFAULT 1");
ensureColumn("leads", "uf", "TEXT");
ensureColumn("leads", "cidade", "TEXT");
ensureColumn("leads", "bairro", "TEXT");
ensureColumn("leads", "stand_id", "INTEGER");
ensureColumn("distribution_queues", "forced_next_user_id", "INTEGER");
ensureColumn("distribution_queue_members", "priority", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("users", "queue_rank_override", "TEXT");
ensureColumn("users", "external_id", "TEXT");
ensureColumn("users", "can_access_users", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("users", "show_in_metrics", "INTEGER NOT NULL DEFAULT 1");
ensureColumn("users", "company_id", "INTEGER");
ensureColumn("leads", "company_id", "INTEGER");
ensureColumn("leads", "read_at", "TEXT");
ensureColumn("leads", "deal_value", "REAL");
ensureColumn("leads", "deal_date", "TEXT");
ensureColumn("leads", "deal_type", "TEXT");
ensureColumn("leads", "lost_reason", "TEXT");
ensureColumn("leads", "phone2", "TEXT");
ensureColumn("leads", "is_favorite", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("leads", "next_activity_at", "TEXT");
ensureColumn("leads", "next_activity_type", "TEXT"); // 'visita' | 'ligacao' | 'reuniao' etc.
ensureColumn("leads", "next_activity_note", "TEXT");

const webhooksExist = db.prepare("SELECT COUNT(*) as c FROM webhooks_config").get().c;
if (!webhooksExist) {
  db.prepare("INSERT INTO webhooks_config (id, hook_url, on_create_lead, on_update_lead, on_close_lead) VALUES (1, NULL, 0, 0, 0)").run();
}

const intakeKeyExists = db.prepare("SELECT COUNT(*) as c FROM lead_intake_settings").get().c;
if (!intakeKeyExists) {
  const key = randomBytes(24).toString("hex");
  db.prepare("INSERT INTO lead_intake_settings (id, api_key) VALUES (1, ?)").run(key);
}

// horário padrão: segunda a domingo, 09:00-21:59, todos ativos
const defaultHours = JSON.stringify({
  seg: { on: true, start: "09:00", end: "21:59" },
  ter: { on: true, start: "09:00", end: "21:59" },
  qua: { on: true, start: "09:00", end: "21:59" },
  qui: { on: true, start: "09:00", end: "21:59" },
  sex: { on: true, start: "09:00", end: "21:59" },
  sab: { on: true, start: "09:00", end: "21:59" },
  dom: { on: true, start: "09:00", end: "21:59" },
});
const settingsExist = db.prepare("SELECT COUNT(*) as c FROM bolsao_settings").get().c;
if (!settingsExist) {
  db.prepare("INSERT INTO bolsao_settings (id, enabled, limit_minutes, visibility, hours) VALUES (1, 1, 5, 'todos', ?)").run(defaultHours);
}

// empresa matriz padrão (só na primeira vez)
const companyCount = db.prepare("SELECT COUNT(*) as c FROM companies").get().c;
if (!companyCount) {
  db.prepare("INSERT INTO companies (name, parent_company_id) VALUES ('Fortal Inteligência Imobiliária', NULL)").run();
}

// motivos de perda padrão
const lostReasonsCount = db.prepare("SELECT COUNT(*) as c FROM lost_reasons").get().c;
if (!lostReasonsCount) {
  const insertReason = db.prepare("INSERT INTO lost_reasons (name) VALUES (?)");
  for (const r of ["Sem interesse", "Fechou com concorrente", "Fora do orçamento", "Sem retorno do cliente", "Duplicado"]) {
    insertReason.run(r);
  }
}

// tags padrão
const tagsCount = db.prepare("SELECT COUNT(*) as c FROM tags").get().c;
if (!tagsCount) {
  const insertTag = db.prepare("INSERT INTO tags (name, enabled, autofill) VALUES (?, 1, 0)");
  for (const t of ["Quente", "Investidor", "Primeira compra", "VIP"]) insertTag.run(t);
}

// seed inicial (somente se banco vazio)
const userCount = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
if (userCount === 0) {
  const insertUser = db.prepare(
    "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)"
  );
  const hash = (pw) => bcrypt.hashSync(pw, 8);

  insertUser.run("Admin Geral", "admin@c2sclone.com", hash("admin123"), "admin");
  insertUser.run("Ana Souza", "ana@c2sclone.com", hash("agente123"), "agent");
  insertUser.run("Bruno Lima", "bruno@c2sclone.com", hash("agente123"), "agent");
  insertUser.run("Carla Dias", "carla@c2sclone.com", hash("agente123"), "agent");

  const insertLead = db.prepare(`
    INSERT INTO leads (name, phone, email, source, interest, status, temperature, assigned_to, last_contact_at, assigned_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const sample = [
    ["Mariana Alves", "11987654321", "mariana@email.com", "Portal Imob", "Apto 2 quartos - Zona Sul", "novo", "quente", 2, null, "2026-07-20 09:00:00"],
    ["João Pedro Castro", "11976543210", "joao@email.com", "Facebook Ads", "Casa 3 quartos - Alphaville", "atendimento", "morno", 3, new Date().toISOString(), "2026-07-20 10:00:00"],
    ["Fernanda Ribeiro", "11965432109", "fernanda@email.com", "Site próprio", "Sala comercial - Centro", "qualificado", "quente", 2, new Date().toISOString(), "2026-07-21 09:00:00"],
    ["Ricardo Nunes", "11954321098", "ricardo@email.com", "Portal Imob", "Cobertura duplex", "proposta", "quente", 4, new Date().toISOString(), "2026-07-21 11:00:00"],
    ["Patrícia Gomes", "11943210987", "patricia@email.com", "Google Ads", "Apto 1 quarto - estúdio", "ganho", "morno", 3, new Date().toISOString(), "2026-07-22 09:00:00"],
    ["Eduardo Martins", "11932109876", "eduardo@email.com", "Indicação", "Terreno 500m²", "perdido", "frio", 4, new Date().toISOString(), "2026-07-22 14:00:00"],
    ["Luiza Fernandes", "11921098765", "luiza@email.com", "Portal Imob", "Apto 3 quartos - varanda", "novo", "quente", null, null, null],
  ];
  for (const s of sample) insertLead.run(...s);
}

// fila de distribuição padrão (só na primeira vez, se não houver nenhuma fila ainda)
const queueCount = db.prepare("SELECT COUNT(*) as c FROM distribution_queues").get().c;
if (!queueCount) {
  const q = db.prepare("INSERT INTO distribution_queues (name, type, active, priority) VALUES (?, 'rodizio', 1, 0)").run("Rodízio geral");
  const agents = db.prepare("SELECT id FROM users WHERE role = 'agent'").all();
  const insertMember = db.prepare("INSERT INTO distribution_queue_members (queue_id, user_id) VALUES (?, ?)");
  for (const a of agents) insertMember.run(q.lastInsertRowid, a.id);

  const admin = db.prepare("SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1").get();
  db.prepare("INSERT OR IGNORE INTO distribution_settings (id, fallback_user_id) VALUES (1, ?)").run(admin?.id || null);
}

// atribui a empresa matriz a quem ainda não tem empresa definida (novos usuários/leads e bancos migrados)
const defaultCompanyId = db.prepare("SELECT id FROM companies WHERE parent_company_id IS NULL ORDER BY id ASC LIMIT 1").get()?.id;
if (defaultCompanyId) {
  db.prepare("UPDATE users SET company_id = ? WHERE company_id IS NULL").run(defaultCompanyId);
  db.prepare("UPDATE leads SET company_id = ? WHERE company_id IS NULL").run(defaultCompanyId);
}

export default db;
