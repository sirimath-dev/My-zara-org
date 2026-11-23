import 'dotenv/config';

const required = ['MONGODB_URI', 'OWNER_NUMBER', 'ADMIN_API_KEY'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
}

const owner = process.env.OWNER_NUMBER.replace(/\D/g, '');
if (!/^\d{8,15}$/.test(owner)) throw new Error('OWNER_NUMBER must be international digits only, e.g. 947XXXXXXXX');

export default {
  port: Number(process.env.PORT || 8080),
  mongoUri: process.env.MONGODB_URI,
  ownerNumber: owner,
  botName: process.env.BOT_NAME || 'QUEEN ZARA MD',
  prefix: process.env.PREFIX || '.',
  sessionCollection: process.env.SESSION_COLLECTION || 'whatsapp_sessions',
  adminApiKey: process.env.ADMIN_API_KEY,
  allowedOrigin: process.env.ALLOWED_ORIGIN || ''
};
