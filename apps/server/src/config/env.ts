import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

export const env = {
  PORT: parseInt(getEnvVar('PORT', '5000'), 10),
  NODE_ENV: getEnvVar('NODE_ENV', 'development'),
  JWT_SECRET: getEnvVar('JWT_SECRET', 'dev-secret-change-me'),
  JWT_EXPIRES_IN: getEnvVar('JWT_EXPIRES_IN', '365d'),

  MONGODB_URI: getEnvVar('MONGODB_URI', 'mongodb://localhost:27017/theonetrade'),

  REDIS_URL: getEnvVar('REDIS_URL', 'redis://localhost:6379'),

  RESEND_API_KEY: getEnvVar('RESEND_API_KEY', ''),
  EMAIL_FROM: getEnvVar('EMAIL_FROM', 'The One Trade <hari@theonetrade.in>'),
  ADMIN_EMAIL: getEnvVar('ADMIN_EMAIL', 'theonetrade43@gmail.com'),

  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || '',
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY || '',

  UPLOAD_DIR: getEnvVar('UPLOAD_DIR', './uploads/receipts'),

  CORS_ORIGIN: getEnvVar('CORS_ORIGIN', 'http://localhost:3000'),
};
