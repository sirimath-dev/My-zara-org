import {
  initAuthCreds, BufferJSON, proto, makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';
import Session from '../models/Session.js';
import { logger } from './logger.js';

const decode = value => JSON.parse(JSON.stringify(value), BufferJSON.reviver);
const encode = value => JSON.parse(JSON.stringify(value, BufferJSON.replacer));

/**
 * Mongo-backed Baileys auth state. Credentials and Signal keys remain server-side.
 * The phone number is the unique account namespace.
 */
export async function mongoAuthState(phoneNumber) {
  let doc = await Session.findOne({ phoneNumber });
  if (!doc) doc = await Session.create({ phoneNumber, sessionData: { creds: encode(initAuthCreds()), keys: {} } });
  if (!doc.sessionData?.creds) {
    logger.warn({ phoneNumber }, 'Session had no credentials; initializing fresh auth state');
    doc.sessionData = { creds: encode(initAuthCreds()), keys: {} };
    await doc.save();
  }

  const creds = decode(doc.sessionData.creds);
  const keyStore = {
    async get(type, ids) {
      const latest = await Session.findOne({ phoneNumber }).lean();
      const stored = latest?.sessionData?.keys?.[type] || {};
      const result = {};
      for (const id of ids) {
        let value = stored[id] ? decode(stored[id]) : null;
        if (type === 'app-state-sync-key' && value) value = proto.Message.AppStateSyncKeyData.fromObject(value);
        result[id] = value;
      }
      return result;
    },
    async set(data) {
      const updates = {};
      for (const [type, entries] of Object.entries(data)) {
        for (const [id, value] of Object.entries(entries)) {
          updates[`sessionData.keys.${type}.${id}`] = value ? encode(value) : null;
        }
      }
      if (Object.keys(updates).length) {
        await Session.updateOne({ phoneNumber }, { $set: updates });
      }
    }
  };

  return {
    state: { creds, keys: makeCacheableSignalKeyStore(keyStore, logger) },
    saveCreds: async () => {
      await Session.updateOne({ phoneNumber }, { $set: { 'sessionData.creds': encode(creds) } }, { upsert: true });
    }
  };
}
