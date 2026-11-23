import { getPairingCode } from './connection.js';
import { logger } from './logger.js';

const phonePattern = /^[1-9]\d{7,14}$/;
const pending = new Map();

export async function createPairing(phone) {
  const number = String(phone || '').replace(/\D/g, '');
  if (!phonePattern.test(number)) {
    const err = new Error('Enter a valid international phone number with country code (8–15 digits).');
    err.status = 400; throw err;
  }
  if (pending.has(number)) {
    const err = new Error('A pairing request for this number is already in progress.');
    err.status = 409; throw err;
  }
  pending.set(number, Date.now());
  try {
    const code = await getPairingCode(number);
    logger.info({ phone: `${number.slice(0,3)}***` }, 'Pairing code generated');
    return code;
  } finally { pending.delete(number); }
}
