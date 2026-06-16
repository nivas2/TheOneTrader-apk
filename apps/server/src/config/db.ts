import mongoose from 'mongoose';
import { env } from './env';

export async function connectDB(): Promise<void> {
  const MAX_RETRIES = 5;
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      await mongoose.connect(env.MONGODB_URI);
      console.warn('MongoDB connected successfully');
      return;
    } catch (error) {
      retries++;
      console.error(`MongoDB connection attempt ${retries} failed:`, error);
      if (retries === MAX_RETRIES) {
        throw new Error('Failed to connect to MongoDB after maximum retries');
      }
      await new Promise((resolve) => setTimeout(resolve, 3000 * retries));
    }
  }
}

mongoose.connection.on('disconnected', () => {
  console.error('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB error:', err);
});
