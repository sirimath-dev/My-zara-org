import mongoose from 'mongoose';
import { logger } from './logger.js';

export async function connectMongo(uri) {
  mongoose.set('strictQuery', true);
  mongoose.connection.on('connected', () => logger.info('MongoDB connected'));
  mongoose.connection.on('error', err => logger.error({ err: err.message }, 'MongoDB error'));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000, maxPoolSize: 10 });
}
