import makeWASocket, {
  DisconnectReason, fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import pino from 'pino';
import { mongoAuthState } from './session.js';
import { logger } from './logger.js';
import config from '../config.js';
import Settings from '../models/Settings.js';
import User from '../models/User.js';
import { loadPlugins, dispatchCommand } from './plugins.js';

let socket = null;
let activePhone = null;
let state = 'disconnected';
let reconnectTimer = null;
let connecting = false;
let intentionalClose = false;
let startedAt = null;
let messageTotal = 0;
let reconnectAttempts = 0;

export const getStatus = () => ({ connected: state === 'connected', state, phoneNumber: activePhone, uptime: startedAt ? Math.floor((Date.now()-startedAt)/1000) : 0 });

export async function createConnection(phoneNumber) {
  if (connecting) throw new Error('A WhatsApp connection is already being initialized');
  if (socket && state !== 'disconnected') {
    if (activePhone === phoneNumber) return socket;
    throw new Error('Another WhatsApp account is already active');
  }
  connecting = true;
  intentionalClose = false;
  activePhone = phoneNumber;
  state = 'connecting';
  try {
    const { state: auth, saveCreds } = await mongoAuthState(phoneNumber);
    const { version } = await fetchLatestBaileysVersion();
    socket = makeWASocket({
      version, auth, printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: ['QUEEN ZARA MD', 'Chrome', '1.0.0'],
      markOnlineOnConnect: false,
      syncFullHistory: false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000
    });
    socket.ev.on('creds.update', saveCreds);
    socket.ev.on('connection.update', update => {
      const { connection, lastDisconnect } = update;
      if (connection === 'open') {
        state = 'connected'; startedAt = Date.now(); reconnectAttempts = 0;
        logger.info({ phoneNumber }, 'WhatsApp connected');
      } else if (connection === 'connecting') {
        state = 'connecting';
      } else if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;
        state = 'disconnected';
        logger.warn({ code, phoneNumber }, 'WhatsApp connection closed');
        socket = null;
        if (!intentionalClose && code !== DisconnectReason.loggedOut) scheduleReconnect(phoneNumber);
        if (code === DisconnectReason.loggedOut) logger.error('Session logged out. Request a new pairing code.');
      }
    });
    socket.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;
        messageTotal++;
        const jid = msg.key.remoteJid;
        const sender = msg.key.participant || jid;
        try {
          await User.updateOne(
            { userId: sender },
            { $set: { lastSeen: new Date(), username: msg.pushName || '' }, $setOnInsert: { firstSeen: new Date() }, $inc: { messageCount: 1 } },
            { upsert: true }
          );
          const settings = await Settings.findOne({ key: 'main' }).lean();
          if (settings?.autoRead) await socket.readMessages([msg.key]).catch(() => {});
          if (settings?.autoTyping && !jid.endsWith('@g.us')) {
            await socket.sendPresenceUpdate('composing', jid).catch(() => {});
            setTimeout(() => socket?.sendPresenceUpdate('paused', jid).catch(() => {}), 1200);
          }
          if (settings?.antiLink && jid.endsWith('@g.us') && /https?:\/\/chat\.whatsapp\.com\//i.test(JSON.stringify(msg.message))) {
            const groupMeta = await socket.groupMetadata(jid).catch(() => null);
            const participant = groupMeta?.participants?.find(p => p.id === sender);
            const bot = groupMeta?.participants?.find(p => p.id === socket.user.id);
            if (participant?.admin == null && bot?.admin) await socket.sendMessage(jid, { delete: msg.key }).catch(() => {});
          }
          await dispatchCommand(socket, msg, settings || {});
        } catch (err) { logger.error({ err: err.message }, 'Message handler failed'); }
      }
    });
    await loadPlugins();
    return socket;
  } catch (err) {
    socket = null; state = 'disconnected'; activePhone = null;
    throw err;
  } finally { connecting = false; }
}

function scheduleReconnect(phone) {
  if (reconnectTimer || intentionalClose) return;
  reconnectAttempts++;
  const delay = Math.min(30000, 1500 * (2 ** Math.min(reconnectAttempts, 4)));
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    try { await createConnection(phone); }
    catch (err) { logger.error({ err: err.message }, 'Reconnect attempt failed'); scheduleReconnect(phone); }
  }, delay);
}

export async function getPairingCode(phoneNumber) {
  if (socket || connecting) throw new Error('A WhatsApp session is already active or pairing');
  const sock = await createConnection(phoneNumber);
  // Baileys requires the socket to initialize before requesting a code.
  await new Promise(resolve => setTimeout(resolve, 1800));
  if (state === 'connected') throw new Error('This number is already connected');
  if (!sock.requestPairingCode) throw new Error('Installed Baileys version does not support pairing codes');
  const code = await sock.requestPairingCode(phoneNumber);
  if (!code || typeof code !== 'string') throw new Error('Baileys did not return a pairing code');
  return code;
}

export async function closeConnection() {
  intentionalClose = true;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
  try { socket?.end(undefined); } catch {}
  socket = null; state = 'disconnected'; activePhone = null; startedAt = null;
}

export const getStats = async () => ({
  ...getStatus(), messagesHandled: messageTotal,
  users: await User.countDocuments()
});
