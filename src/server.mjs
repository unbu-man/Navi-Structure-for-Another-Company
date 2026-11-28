import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { InputError, field, validateBot, validateLead } from './config.mjs';
import { publicBot, replyTo } from './reply.mjs';
import { configuredRouter } from './model-router.mjs';
import { openStore } from './store.mjs';

const assets = new Map(Object.entries({
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/assets/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/assets/style.css': ['style.css', 'text/css; charset=utf-8'],
  '/api-demo': ['api-demo.html', 'text/html; charset=utf-8'],
  '/assets/api-demo.js': ['api-demo.js', 'text/javascript; charset=utf-8'],
  '/api/openapi.json': ['openapi.json', 'application/json; charset=utf-8'],
}).map(([path, [file, type]]) => [path, { type, body: readFileSync(new URL(`../public/${file}`, import.meta.url)) }]));

const slugPath = '([a-z0-9]+(?:-[a-z0-9]+)*)';
const visitorPath = new RegExp(`^/(chat|embed)/${slugPath}$`);
const botPath = new RegExp(`^/api/bots/${slugPath}(?:/(chat|leads))?$`);
const adminBotPath = new RegExp(`^/api/admin/bots/${slugPath}(?:/(leads)(?:/([a-f0-9-]{36}))?)?$`);
const localHosts = new Set(['127.0.0.1', 'localhost', '::1']);
const sessionLife = 8 * 60 * 60 * 1000;
const digest = (value) => createHash('sha256').update(value).digest();

async function readJson(req) {
  if (req.headers['content-type']?.split(';', 1)[0] !== 'application/json') {
    throw new InputError('Send JSON data.', 415);
  }
  const limit = 256 * 1024;
  if (Number(req.headers['content-length']) > limit) throw new InputError('Request is too large.', 413);
  let received = 0;
  const chunks = [];
  for await (const chunk of req) {
    received += chunk.length;
    if (received > limit) throw new InputError('Request is too large.', 413);
    chunks.push(chunk);
  }
  try {
    const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) return payload;
  } catch {
    // The client receives a validation error for malformed JSON.
  }
  throw new InputError('Expected a JSON object.');
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

function requestIp(req) {
  return req.socket.remoteAddress ?? 'unknown';
}

export function createNavi({
  dbPath = ':memory:', password = '', secureCookie = false, allowLocalAdmin = true,
  classify = null, modelProvider = classify ? 'openai' : 'faq', publicOrigin = '',
} = {}) {
  const store = openStore(dbPath);
  const sessions = new Map();
  const limits = new Map();
  const passwordHash = password ? digest(password) : null;
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of limits) if (entry.until <= now) limits.delete(key);
    for (const [key, until] of sessions) if (until <= now) sessions.delete(key);
  }, 60_000).unref();

  function limit(req, bucket, max, duration = 60_000) {
    const key = `${bucket}:${requestIp(req)}`;
    const now = Date.now();
    let entry = limits.get(key);
    if (!entry || entry.until <= now) {
      if (limits.size >= 10_000 && !entry) throw new InputError('Please try again shortly.', 429);
      entry = { count: 0, until: now + duration };
      limits.set(key, entry);
    }
    if (++entry.count > max) throw new InputError('Too many requests. Please try again shortly.', 429);
  }

  function session(req) {
    return req.headers.cookie?.split(/;\s*/u).find((item) => item.startsWith('navi_session='))?.slice(13);
  }

  function authenticated(req) {
    if (!passwordHash) return allowLocalAdmin;
    return (sessions.get(session(req)) ?? 0) > Date.now();
  }

  function checkOrigin(req) {
    const origin = req.headers.origin;
    if (!origin) {
      if (req.headers['sec-fetch-site'] === 'cross-site') throw new InputError('Use the Navi page to submit requests.', 403);
      return;
    }
    try {
      const expected = publicOrigin || `${secureCookie ? 'https' : 'http'}://${req.headers.host}`;
      if (new URL(origin).origin === expected) return;
    } catch {
      // The rejection below also covers malformed origins.
    }
    throw new InputError('Use the Navi page to submit requests.', 403);
  }

  function writeCookie(res, key, seconds) {
    res.setHeader('Set-Cookie', `navi_session=${key}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${seconds}${secureCookie ? '; Secure' : ''}`);
  }

  async function route(req, res) {
    const path = new URL(req.url, 'http://navi.internal').pathname;
    const method = req.method;
    const visitor = path.match(visitorPath);
    const embedded = visitor?.[1] === 'embed';
    res.setHeader('Content-Security-Policy', `default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors ${embedded ? '*' : "'none'"}`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    if (!passwordHash && allowLocalAdmin) {
      const host = new URL(`http://${req.headers.host}`).hostname.replace(/^\[|\]$/gu, '');
      if (!localHosts.has(host)) throw new InputError('Use a localhost address to open the local workspace.', 403);
    }

    if (method === 'GET' || method === 'HEAD') {
      const asset = assets.get(visitor ? '/' : path);
      if (asset) {
        const status = visitor && !store.getBot(visitor[2]) ? 404 : 200;
        res.writeHead(status, { 'Content-Type': asset.type, 'Cache-Control': 'no-cache' });
        return res.end(method === 'HEAD' ? undefined : asset.body);
      }
    }

    if (['POST', 'PUT', 'PATCH'].includes(method)) checkOrigin(req);
    if (path === '/api/health' && method === 'GET') return json(res, 200, { status: 'ok' });

    const botRoute = path.match(botPath);
    if (botRoute) {
      const [, slug, action] = botRoute;
      const bot = store.getBot(slug);
      if (!bot) throw new InputError('This bot could not be found.', 404);
      if (!action && method === 'GET') return json(res, 200, { bot: publicBot(bot), aiEnabled: Boolean(classify), modelProvider });
      if (action === 'chat' && method === 'POST') {
        limit(req, 'chat', 40);
        const body = await readJson(req);
        const message = field(body.message, 'Message', 1200, true);
        const previous = {
          intent: typeof body.previous?.intent === 'string' ? body.previous.intent : '',
          topics: Array.isArray(body.previous?.topics) ? body.previous.topics.slice(0, 3) : [],
          knowledgeIds: Array.isArray(body.previous?.knowledgeIds) ? body.previous.knowledgeIds.slice(0, 3) : [],
          platform: ['android', 'ios'].includes(body.previous?.platform) ? body.previous.platform : undefined,
        };
        return json(res, 200, await replyTo(bot, { message, language: body.language, previous }, classify));
      }
      if (action === 'leads' && method === 'POST') {
        if (!bot.meetingEnabled) throw new InputError('This bot uses its official contact or booking page.', 404);
        limit(req, 'lead', 12, 10 * 60_000);
        const saved = store.createLead(slug, validateLead(await readJson(req)));
        if (!saved) throw new InputError('This request has already been saved with different details.', 409);
        return json(res, 201, saved);
      }
    }

    if (path === '/api/admin/session') {
      if (method === 'GET') return json(res, 200, { authenticated: authenticated(req), passwordRequired: Boolean(passwordHash) });
      if (method === 'POST') {
        limit(req, 'login', 12, 10 * 60_000);
        const body = await readJson(req);
        if (body.action === 'logout') {
          sessions.delete(session(req));
          writeCookie(res, '', 0);
          return json(res, 200, { authenticated: false });
        }
        const supplied = field(body.password, 'Password', 1024, true);
        if (!passwordHash || !timingSafeEqual(digest(supplied), passwordHash)) throw new InputError('Incorrect password.', 401);
        if (sessions.size >= 1000) throw new InputError('Too many active sessions.', 429);
        sessions.delete(session(req));
        const token = randomBytes(32).toString('hex');
        sessions.set(token, Date.now() + sessionLife);
        writeCookie(res, token, sessionLife / 1000);
        return json(res, 200, { authenticated: true });
      }
    }

    if (path.startsWith('/api/admin/')) {
      if (!authenticated(req)) throw new InputError('Sign in to open the workspace.', 401);
      if (path === '/api/admin/bots' && method === 'GET') return json(res, 200, { bots: store.listBots(), aiEnabled: Boolean(classify), modelProvider });
      if (path === '/api/admin/bots' && method === 'POST') {
        const body = await readJson(req);
        const bot = validateBot(body, body.slug);
        if (!store.createBot(bot)) throw new InputError('That bot link is already taken.', 409);
        return json(res, 201, { bot });
      }
      const adminRoute = path.match(adminBotPath);
      if (adminRoute) {
        const [, slug, action, id] = adminRoute;
        if (!store.getBot(slug)) throw new InputError('This bot could not be found.', 404);
        if (!action && method === 'PUT') {
          const bot = validateBot(await readJson(req), slug);
          store.updateBot(bot);
          return json(res, 200, { bot });
        }
        if (action === 'leads' && !id && method === 'GET') return json(res, 200, { leads: store.listLeads(slug) });
        if (action === 'leads' && id && method === 'PATCH') {
          const { status } = await readJson(req);
          if (!['new', 'reviewed'].includes(status)) throw new InputError('Choose a valid request status.');
          if (!store.updateLead(slug, id, status)) throw new InputError('Meeting request could not be found.', 404);
          return json(res, 200, { status });
        }
      }
    }

    return json(res, 404, { error: 'Page or route not found.' });
  }

  const server = createServer(async (req, res) => {
    try {
      await route(req, res);
    } catch (error) {
      if (!(error instanceof InputError)) console.error(error.name, 'while handling a Navi request');
      if (!res.headersSent) json(res, error.status ?? 500, { error: error.status ? error.message : 'Something went wrong. Please try again.' });
      else res.end();
    }
  });
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  server.once('close', () => {
    clearInterval(timer);
    store.close();
  });
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const host = process.env.NAVI_HOST || '127.0.0.1';
  const port = Number(process.env.NAVI_PORT || 3000);
  const password = process.env.NAVI_ADMIN_PASSWORD || '';
  if (!localHosts.has(host) && password.length < 12) {
    throw new Error('Set NAVI_ADMIN_PASSWORD to at least 12 characters when binding to a non-local address.');
  }
  if (password && password !== password.trim()) throw new Error('Remove leading and trailing spaces from NAVI_ADMIN_PASSWORD.');
  const server = createNavi({
    dbPath: process.env.NAVI_DB || 'data/navi.sqlite',
    password,
    allowLocalAdmin: localHosts.has(host),
    secureCookie: process.env.NAVI_SECURE_COOKIE === '1',
    publicOrigin: process.env.NAVI_PUBLIC_ORIGIN ? new URL(process.env.NAVI_PUBLIC_ORIGIN).origin : '',
    ...configuredRouter(process.argv.includes('--free') ? { NAVI_ROUTER: 'faq' } : process.env),
  });
  const displayHost = host === '0.0.0.0' ? 'localhost' : host.includes(':') ? `[${host}]` : host;
  server.listen(port, host, () => console.log(`Navi is running at http://${displayHost}:${server.address().port}`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close());
}
