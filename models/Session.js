import mongoose from 'mongoose';
import config from '../config.js';

const schema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, unique: true, index: true },
  sessionData: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true, minimize: false, collection: config.sessionCollection });

export default mongoose.model('Session', schema);
