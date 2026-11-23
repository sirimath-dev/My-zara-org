import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  key: { type: String, unique: true, default: 'main' },
  botName: { type: String, default: 'QUEEN ZARA MD' },
  prefix: { type: String, default: '.' },
  ownerNumber: { type: String, required: true },
  autoRead: { type: Boolean, default: false },
  autoReact: { type: Boolean, default: false },
  autoTyping: { type: Boolean, default: false },
  welcome: { type: Boolean, default: false },
  goodbye: { type: Boolean, default: false },
  antiLink: { type: Boolean, default: false }
}, { timestamps: true });
export default mongoose.model('Settings', schema);
