import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import config from './config.js';
import { connectMongo } from './lib/mongodb.js';
import { logger } from './lib/logger.js';
import { createPairing } from './lib/pairing.js';
import { getStatus, getStats, closeConnection } from './lib/connection.js';
import Settings from './models/Settings.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: config.allowedOrigin ? config.allowedOrigin.split(',').map(x => x.trim()) : false,
  methods: ['GET','POST'], allowedHeaders: ['Content-Type','x-admin-key']
}));
app.use(express.json({ limit: '20kb' }));
app.use(rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));

app.get('/code', async (req, res, next) => {
  try {
    const code = await createPairing(req.query.number);
    res.json({ status: true, code });
  } catch (err) { next(err); }
});

app.get('/health', (_req, res) => res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() }));
app.get('/api/status', (_req, res) => res.json(getStatus()));
app.get('/api/stats', async (_req, res, next) => {
  try { res.json(await getStats()); } catch (err) { next(err); }
});

app.post('/api/settings', async (req, res, next) => {
  try {
    if (!config.adminApiKey || req.get('x-admin-key') !== config.adminApiKey) {
      return res.status(401).json({ status: false, error: 'Unauthorized' });
    }
    const allowed = ['botName','prefix','autoRead','autoReact','autoTyping','welcome','goodbye','antiLink'];
    const update = {};
    for (const key of allowed) if (key in req.body) update[key] = req.body[key];
    if (update.prefix !== undefined && (typeof update.prefix !== 'string' || update.prefix.length > 3 || !update.prefix)) {
      return res.status(400).json({ status: false, error: 'Prefix must be 1–3 characters' });
    }
    for (const key of ['autoRead','autoReact','autoTyping','welcome','goodbye','antiLink']) {
      if (key in update && typeof update[key] !== 'boolean') return res.status(400).json({ status:false, error:`${key} must be boolean` });
    }
    const settings = await Settings.findOneAndUpdate({ key: 'main' }, { $set: update }, { new: true, upsert: true, setDefaultsOnInsert: true });
    res.json({ status: true, settings: {
      botName: settings.botName, prefix: settings.prefix, autoRead: settings.autoRead,
      autoReact: settings.autoReact, autoTyping: settings.autoTyping,
      welcome: settings.welcome, goodbye: settings.goodbye, antiLink: settings.antiLink
    }});
  } catch (err) { next(err); }
});

app.use((err, _req, res, _next) => {
  logger.error({ err: err.message, status: err.status || 500 }, 'API request failed');
  res.status(err.status || 500).json({ status: false, error: err.status ? err.message : 'Unable to complete request. Check server logs.' });
});

let server;
async function start() {
  await connectMongo(config.mongoUri);
  await Settings.findOneAndUpdate({ key: 'main' }, { $setOnInsert: {
    botName: config.botName, prefix: config.prefix, ownerNumber: config.ownerNumber
  }}, { upsert: true, new: true, setDefaultsOnInsert: true });
  server = app.listen(config.port, '0.0.0.0', () => logger.info({ port: config.port }, 'QUEEN ZARA MD server started'));
}
async function shutdown(signal) {
  logger.info({ signal }, 'Shutting down');
  await closeConnection();
  if (server) server.close();
  const mongoose = await import('mongoose');
  await mongoose.default.disconnect();
  process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', err => logger.error({ err: String(err) }, 'Unhandled rejection'));
start().catch(err => { logger.fatal({ err: err.message }, 'Startup failed'); process.exit(1); });
