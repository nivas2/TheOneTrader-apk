import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { User, IUserDocument } from '../models/User';
import { Otp } from '../models/Otp';
import { env } from '../config/env';
import { getRedisClient } from '../config/redis';
import { sendOtpEmail } from './emailService';
import { sendPushToAdmins } from './pushService';
import { NOTIFICATION_TYPES } from '@theonetrade/shared-types';
import { AppError } from '../middleware/errorHandler';

const SALT_ROUNDS = 12;
const OTP_EXPIRY_MINUTES = 10;
const SESSION_TTL = 365 * 24 * 60 * 60; // 365 days in seconds

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
  phone: string;
}): Promise<IUserDocument> {
  const existing = await User.findOne({ email: data.email.toLowerCase() });
  if (existing) {
    throw new AppError('Email already registered', 409);
  }

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
  const user = await User.create({
    name: data.name,
    email: data.email.toLowerCase(),
    passwordHash,
    phone: data.phone,
  });

  const otpCode = generateOtp();
  await Otp.create({
    email: user.email,
    code: otpCode,
    expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
  });

  sendOtpEmail(user.email, otpCode).catch((err) => {
    console.error('Failed to send OTP email:', err);
  });

  // Notify admins of new user registration
  sendPushToAdmins(
    'New User Registered',
    `${data.name} (${data.email}) signed up`,
    { type: NOTIFICATION_TYPES.ADMIN_NEW_USER }
  ).catch(console.error);

  return user;
}

export async function verifyOtp(email: string, code: string): Promise<void> {
  const otp = await Otp.findOne({
    email: email.toLowerCase(),
    code,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (!otp) {
    throw new AppError('Invalid or expired OTP', 400);
  }

  await User.updateOne({ email: email.toLowerCase() }, { isVerified: true });
  await Otp.deleteMany({ email: email.toLowerCase() });
}

export async function loginUser(email: string, password: string, platform: string = 'web'): Promise<{ token: string; user: any }> {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  if (!user.isVerified) {
    throw new AppError('Please verify your email first', 403);
  }

  if (user.isActive === false) {
    throw new AppError('Your account has been deactivated. Please contact support.', 403);
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new AppError('Invalid email or password', 401);
  }

  const sessionId = uuidv4();
  const token = jwt.sign(
    { userId: user._id.toString(), role: user.role, sessionId, platform },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as any }
  );

  // Store session by sessionId — each login gets its own independent session
  // Multiple devices/platforms can be logged in simultaneously
  const redis = getRedisClient();
  await redis.set(`session:${sessionId}`, user._id.toString(), 'EX', SESSION_TTL);

  return {
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      allowedPages: user.allowedPages || [],
      allowedSegments: user.allowedSegments || [],
    },
  };
}

export async function sendResetOtp(email: string): Promise<void> {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    // Don't reveal whether email exists
    return;
  }

  const otpCode = generateOtp();
  await Otp.create({
    email: email.toLowerCase(),
    code: otpCode,
    expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
  });

  sendOtpEmail(email, otpCode).catch((err) => {
    console.error('Failed to send reset OTP email:', err);
  });
}

export async function resetPassword(email: string, code: string, newPassword: string): Promise<void> {
  const otp = await Otp.findOne({
    email: email.toLowerCase(),
    code,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (!otp) {
    throw new AppError('Invalid or expired OTP', 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await User.updateOne({ email: email.toLowerCase() }, { passwordHash });
  await Otp.deleteMany({ email: email.toLowerCase() });
}

export async function updateProfile(
  userId: string,
  data: { name?: string; email?: string; phone?: string }
): Promise<{ name: string; email: string; phone: string }> {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (data.email && data.email.toLowerCase() !== user.email) {
    const existing = await User.findOne({ email: data.email.toLowerCase() });
    if (existing) {
      throw new AppError('Email already in use', 409);
    }
    user.email = data.email.toLowerCase();
  }

  if (data.name) user.name = data.name;
  if (data.phone) user.phone = data.phone;
  await user.save();

  return { name: user.name, email: user.email, phone: user.phone };
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    throw new AppError('Current password is incorrect', 400);
  }

  user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await user.save();
}

export async function logoutUser(userId: string, _platform?: string, sessionId?: string): Promise<void> {
  const redis = getRedisClient();
  // Delete only this specific session — other sessions stay valid
  if (sessionId) {
    await redis.del(`session:${sessionId}`);
  }
}
