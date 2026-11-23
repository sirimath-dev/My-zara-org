import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import config from '../config.js';
import { logger } from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginDir = path.resolve(__dirname, '../plugins');
const plugins = new Map();

export async function loadPlugins() {
  await fs.mkdir(pluginDir, { recursive: true });
  for (const file of await fs.readdir(pluginDir)) {
    if (!file.endsWith('.js')) continue;
    const mod = await import(pathToFileURL(path.join(pluginDir, file)).href + `?v=${Date.now()}`);
    if (typeof mod.default === 'function') plugins.set(file.replace('.js',''), mod.default);
  }
  logger.info({ count: plugins.size }, 'Plugins loaded');
}

export async function dispatchCommand(sock, msg, settings = {}) {
  const jid = msg.key.remoteJid;
  const body = msg.message.conversation || msg.message.extendedTextMessage?.text ||
    msg.message.imageMessage?.caption || msg.message.videoMessage?.caption || '';
  const prefix = settings.prefix || config.prefix;
  if (!body.startsWith(prefix)) return;
  const [name, ...args] = body.slice(prefix.length).trim().split(/\s+/);
  if (!name) return;
  const sender = msg.key.participant || jid;
  const senderNumber = sender.split('@')[0].split(':')[0];
  const isOwner = senderNumber === config.ownerNumber;
  const context = { sock, msg, jid, sender, args, isOwner, settings, config };
  const handler = plugins.get(name.toLowerCase());
  if (!handler) return;
  if (handler.ownerOnly && !isOwner) return sock.sendMessage(jid, { text: '⛔ Owner only command.' }, { quoted: msg });
  await handler(context);
}
