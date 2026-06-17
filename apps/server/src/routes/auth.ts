import { Router, Request, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { validate } from '../middleware/validate';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';
import * as authService from '../services/authService';
import { User } from '../models/User';
import { env } from '../config/env';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  phone: z.string().min(10).max(15),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  platform: z.enum(['web', 'mobile']).optional(),
});

const verifyOtpSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  newPassword: z.string().min(6).max(100),
});

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10).max(15).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6).max(100),
});

router.post('/register', validate(registerSchema), async (req: Request, res: Response) => {
  try {
    const user = await authService.registerUser(req.body);
    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email for OTP.',
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
});

router.post('/verify-otp', validate(verifyOtpSchema), async (req: Request, res: Response) => {
  try {
    await authService.verifyOtp(req.body.email, req.body.code);
    res.json({ success: true, message: 'Email verified successfully' });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
});

router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const platform = req.body.platform || 'web';
    const result = await authService.loginUser(req.body.email, req.body.password, platform);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
});

router.post('/forgot-password', validate(forgotPasswordSchema), async (req: Request, res: Response) => {
  try {
    await authService.sendResetOtp(req.body.email);
    res.json({ success: true, message: 'If the email exists, a reset code has been sent.' });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
});

router.post('/reset-password', validate(resetPasswordSchema), async (req: Request, res: Response) => {
  try {
    await authService.resetPassword(req.body.email, req.body.code, req.body.newPassword);
    res.json({ success: true, message: 'Password reset successful' });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
});

router.put('/profile', authMiddleware, validate(updateProfileSchema), async (req: AuthRequest, res: Response) => {
  try {
    const updated = await authService.updateProfile(req.userId!, req.body);
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
});

router.put('/change-password', authMiddleware, validate(changePasswordSchema), async (req: AuthRequest, res: Response) => {
  try {
    await authService.changePassword(req.userId!, req.body.currentPassword, req.body.newPassword);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
});

const deviceTokenSchema = z.object({
  deviceToken: z.string().min(1),
  platform: z.enum(['web', 'android', 'ios']).default('android'),
});

router.post('/device-token', authMiddleware, validate(deviceTokenSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { deviceToken, platform } = req.body;

    // Remove this token from any other user (handles device switching between accounts)
    await User.updateMany(
      { _id: { $ne: req.userId }, 'deviceTokens.token': deviceToken },
      { $pull: { deviceTokens: { token: deviceToken } } }
    );

    // Remove duplicate token from this user, then add fresh entry
    await User.findByIdAndUpdate(req.userId, {
      $pull: { deviceTokens: { token: deviceToken } },
    });
    await User.findByIdAndUpdate(req.userId, {
      deviceToken,
      $push: {
        deviceTokens: { token: deviceToken, platform, updatedAt: new Date() },
      },
    });

    res.json({ success: true, message: 'Device token saved' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/logout', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // Extract platform from JWT to clean the correct session key
    const token = req.headers.authorization?.split(' ')[1];
    let platform: string | undefined;
    if (token) {
      try {
        const decoded = jwt.verify(token, env.JWT_SECRET) as any;
        platform = decoded.platform;
      } catch {}
    }
    await authService.logoutUser(req.userId!, platform);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ success: false, error: error.message });
  }
});

export default router;
