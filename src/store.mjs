import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { clickhr } from './seed.mjs';

export function openStore(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS bots (slug TEXT PRIMARY KEY, config TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT NOT NULL, bot TEXT NOT NULL REFERENCES bots(slug),
      name TEXT NOT NULL, email TEXT NOT NULL, company TEXT NOT NULL, needs TEXT NOT NULL,
      created_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new',
      PRIMARY KEY (bot, id),
      CHECK (status IN ('new', 'reviewed'))
    );
  `);
  db.prepare('INSERT OR IGNORE INTO bots (slug, config) VALUES (?, ?)').run(clickhr.slug, JSON.stringify(clickhr));
  const listBots = db.prepare('SELECT config FROM bots ORDER BY slug');
  const getBot = db.prepare('SELECT config FROM bots WHERE slug = ?');
  const createBot = db.prepare('INSERT OR IGNORE INTO bots (slug, config) VALUES (?, ?)');
  const updateBot = db.prepare('UPDATE bots SET config = ? WHERE slug = ?');
  const createLead = db.prepare(`
    INSERT INTO leads (id, bot, name, email, company, needs, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT (bot, id) DO NOTHING
  `);
  const getLead = db.prepare('SELECT name, email, company, needs, created_at FROM leads WHERE bot = ? AND id = ?');
  const listLeads = db.prepare('SELECT * FROM leads WHERE bot = ? ORDER BY created_at DESC, id DESC LIMIT 100');
  const updateLead = db.prepare('UPDATE leads SET status = ? WHERE bot = ? AND id = ?');

  return {
    listBots: () => listBots.all().map(({ config }) => JSON.parse(config)),
    getBot: (slug) => {
      const row = getBot.get(slug);
      return row ? JSON.parse(row.config) : null;
    },
    createBot: (bot) => createBot.run(bot.slug, JSON.stringify(bot)).changes > 0,
    updateBot: (bot) => updateBot.run(JSON.stringify(bot), bot.slug).changes > 0,
    createLead: (slug, lead) => {
      const { requestId, name, email, company, needs } = lead;
      createLead.run(requestId, slug, name, email, company, needs, new Date().toISOString());
      const saved = getLead.get(slug, requestId);
      if (saved.name !== name || saved.email !== email || saved.company !== company || saved.needs !== needs) return null;
      return { id: requestId, createdAt: saved.created_at };
    },
    listLeads: (slug) => listLeads.all(slug),
    updateLead: (slug, id, status) => updateLead.run(status, slug, id).changes > 0,
    close: () => db.close(),
  };
}
