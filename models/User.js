import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },
  username: String,
  firstSeen: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now },
  messageCount: { type: Number, default: 0 }
});
export default mongoose.model('User', schema);
