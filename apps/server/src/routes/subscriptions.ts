import { Router, Response } from 'express';
import { z } from 'zod';
import path from 'path';
import { validate } from '../middleware/validate';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';
import { adminGuard } from '../middleware/adminGuard';
import { upload } from '../config/multer';
import { Subscription } from '../models/Subscription';
import { User } from '../models/User';
import { Config } from '../models/Config';
import { getIO } from '../config/socket';
import { SOCKET_EVENTS } from '@theonetrade/shared-types';
import { Plan } from '../models/Plan';
import { sendPaymentConfirmation, sendPaymentAdminAlert, sendSubscriptionActivated } from '../services/emailService';
import { sendPushToUser, sendPushToAdmins } from '../services/pushService';
import { NOTIFICATION_TYPES } from '@theonetrade/shared-types';

const router = Router();

// Public: get payment QR code
router.get('/payment-qr', async (_req, res: Response) => {
  try {
    const config = await Config.findOne();
    if (!config || !config.paymentQrImagePath) {
      res.status(404).json({ success: false, error: 'Payment QR not configured' });
      return;
    }
    res.sendFile(path.resolve(config.paymentQrImagePath));
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Client: upload payment receipt
router.post(
  '/upload-receipt',
  authMiddleware,
  upload.single('receipt'),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: 'Receipt screenshot is required' });
        return;
      }

      const { planType, segment, amount, utrId } = req.body;
      if (!planType || !segment) {
        res.status(400).json({ success: false, error: 'planType and segment are required' });
        return;
      }

      if (!utrId || !utrId.trim()) {
        res.status(400).json({ success: false, error: 'UTR / Reference ID is required' });
        return;
      }

      const user = await User.findById(req.userId);
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      // Look up the plan price server-side instead of trusting client
      const plan = await Plan.findOne({ planType, segment, isActive: true });
      const resolvedAmount = plan ? plan.price : (amount ? Number(amount) : 0);

      const subscription = await Subscription.create({
        userId: req.userId,
        planType,
        segment,
        amount: resolvedAmount,
        utrId: utrId.trim(),
        receiptScreenshotPath: req.file.filename,
        status: 'PENDING_APPROVAL',
      });

      // Send confirmation to user
      sendPaymentConfirmation(user.email, planType, segment).catch(console.error);

      // Alert admin with attachment
      sendPaymentAdminAlert(user.name, user.email, planType, segment, req.file.path).catch(console.error);

      // Emit WebSocket event to admin room
      const io = getIO();
      io.to('admin').emit(SOCKET_EVENTS.PAYMENT_PENDING, {
        subscriptionId: subscription._id,
        userId: user._id,
        userName: user.name,
        planType,
        segment,
      });

      // Push notification to all admins
      sendPushToAdmins(
        'New Payment Receipt',
        `${user.name} uploaded payment for ${segment} (${planType})`,
        { type: NOTIFICATION_TYPES.ADMIN_NEW_PAYMENT, segment, planType }
      ).catch(console.error);

      res.status(201).json({ success: true, data: subscription });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Admin: list pending subscriptions
router.get('/pending', authMiddleware, adminGuard, async (_req: AuthRequest, res: Response) => {
  try {
    const subscriptions = await Subscription.find({ status: 'PENDING_APPROVAL' })
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: subscriptions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: list all subscriptions with optional status filter
router.get('/all', authMiddleware, adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;
    const filter: any = {};
    if (status && status !== 'ALL') {
      filter.status = status;
    }
    const subscriptions = await Subscription.find(filter)
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: subscriptions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: approve subscription
router.put('/:id/approve', authMiddleware, adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) {
      res.status(404).json({ success: false, error: 'Subscription not found' });
      return;
    }

    // Calculate activation: next midnight IST (UTC+5:30)
    const now = new Date();
    const IST_OFFSET = 5.5 * 60 * 60 * 1000;
    const nowIST = new Date(now.getTime() + IST_OFFSET);
    nowIST.setDate(nowIST.getDate() + 1);
    nowIST.setHours(0, 0, 0, 0);
    const activateAt = new Date(nowIST.getTime() - IST_OFFSET);

    // Try to get duration from Plan model, fall back to defaults
    const fallbackDays: Record<string, number> = {
      DAILY: 1,
      WEEKLY: 7,
      MONTHLY: 30,
      QUARTERLY: 90,
      HALF_YEARLY: 180,
      YEARLY: 365,
    };
    let duration = fallbackDays[subscription.planType] || 30;
    const plan = await Plan.findOne({
      planType: subscription.planType,
      segment: subscription.segment,
      isActive: true,
    });
    if (plan) {
      duration = plan.durationDays;
    }

    const expiresAt = new Date(activateAt);
    expiresAt.setDate(expiresAt.getDate() + duration);

    subscription.status = 'PENDING_ACTIVATION';
    subscription.activatedAt = activateAt;
    subscription.expiresAt = expiresAt;
    await subscription.save();

    // Format activation date for user message
    const activationDateStr = activateAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    // Notify user
    const user = await User.findById(subscription.userId);
    if (user) {
      sendSubscriptionActivated(user.email, subscription.planType, subscription.segment, expiresAt).catch(console.error);
      sendPushToUser(
        user._id.toString(),
        'Payment Approved!',
        `Your ${subscription.segment} ${subscription.planType} plan has been approved! It will activate on ${activationDateStr} at 12:00 AM.`,
        {
          type: NOTIFICATION_TYPES.SUBSCRIPTION_APPROVED,
          segment: subscription.segment,
          planType: subscription.planType,
          channelId: 'general',
        }
      ).catch(console.error);
    }

    res.json({ success: true, data: subscription });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: reject subscription
router.put('/:id/reject', authMiddleware, adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      res.status(400).json({ success: false, error: 'Rejection reason is required' });
      return;
    }

    const subscription = await Subscription.findByIdAndUpdate(
      req.params.id,
      { status: 'REJECTED', rejectionReason: reason.trim() },
      { new: true }
    );
    if (!subscription) {
      res.status(404).json({ success: false, error: 'Subscription not found' });
      return;
    }

    sendPushToUser(
      subscription.userId.toString(),
      'Subscription Rejected',
      `Your subscription request was not approved. Reason: ${reason.trim()}`,
      {
        type: NOTIFICATION_TYPES.SUBSCRIPTION_REJECTED,
        channelId: 'general',
      }
    ).catch(console.error);

    res.json({ success: true, data: subscription });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Client: get my subscriptions
router.get('/mine', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();

    // Real-time status transitions scoped to this user
    await Subscription.updateMany(
      { userId: req.userId, status: 'PENDING_ACTIVATION', activatedAt: { $lte: now } },
      { $set: { status: 'ACTIVE' } }
    );
    await Subscription.updateMany(
      { userId: req.userId, status: 'ACTIVE', expiresAt: { $lte: now } },
      { $set: { status: 'EXPIRED' } }
    );

    const subscriptions = await Subscription.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json({ success: true, data: subscriptions });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
