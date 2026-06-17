import { Router, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';
import { adminGuard } from '../middleware/adminGuard';
import { User } from '../models/User';
import { Subscription } from '../models/Subscription';
import { Notification } from '../models/Notification';
import { sendPushToTokens, sendPushToAdmins, logNotification } from '../services/pushService';
import { NOTIFICATION_TEMPLATES, renderTemplate } from '../services/notificationTemplates';
import { NOTIFICATION_TYPES } from '@theonetrade/shared-types';

const router = Router();

// GET /templates — return available templates
router.get('/templates', authMiddleware, adminGuard, async (_req: AuthRequest, res: Response) => {
  res.json({ success: true, data: NOTIFICATION_TEMPLATES });
});

const sendSchema = z.object({
  templateId: z.string().optional(),
  title: z.string().min(1),
  body: z.string().min(1),
  recipientType: z.enum(['all', 'segment', 'individual']),
  segment: z.string().optional(),
  userId: z.string().optional(),
  variables: z.record(z.string()).optional(),
  data: z.record(z.string()).optional(),
});

// POST /send — admin sends manual push notification
router.post('/send', authMiddleware, adminGuard, validate(sendSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { title, body, recipientType, segment, userId, variables, data } = req.body;

    // Check if template has per-user variables like {name}
    const hasPerUserVars = /\{name\}/i.test(title + body);

    let recipientCount = 0;

    if (hasPerUserVars) {
      // Per-user personalized sending
      let users: any[] = [];

      if (recipientType === 'all') {
        users = await User.find({
          role: 'USER',
          'deviceTokens.0': { $exists: true },
        }).select('name email phone deviceTokens');
      } else if (recipientType === 'segment' && segment) {
        const activeSubscriptions = await Subscription.find({
          status: 'ACTIVE',
          segment,
          expiresAt: { $gt: new Date() },
        });
        const userIds = activeSubscriptions.map((s) => s.userId);
        users = await User.find({
          _id: { $in: userIds },
          'deviceTokens.0': { $exists: true },
        }).select('name email phone deviceTokens');
      } else if (recipientType === 'individual' && userId) {
        const user = await User.findById(userId).select('name email phone deviceTokens');
        if (user && user.deviceTokens.length > 0) {
          users = [user];
        }
      }

      recipientCount = users.length;

      // Send personalized message per user
      const pushData = {
        type: NOTIFICATION_TYPES.CUSTOM_MESSAGE,
        channelId: 'general',
        ...data,
      };

      for (const user of users) {
        const userVars: Record<string, string> = {
          ...variables,
          name: user.name || 'Trader',
          email: user.email || '',
          phone: user.phone || '',
          segment: segment || '',
        };
        const renderedTitle = renderTemplate(title, userVars);
        const renderedBody = renderTemplate(body, userVars);
        const tokens = user.deviceTokens.map((d: any) => d.token);
        if (tokens.length > 0) {
          await sendPushToTokens(tokens, renderedTitle, renderedBody, pushData);
        }
      }

      // Log with a sample rendering
      const sampleVars: Record<string, string> = { ...variables, name: 'User', segment: segment || '' };
      await logNotification({
        type: NOTIFICATION_TYPES.CUSTOM_MESSAGE,
        title: renderTemplate(title, sampleVars),
        body: renderTemplate(body, sampleVars),
        data,
        recipientType,
        recipientFilter: segment || userId,
        sentBy: req.userId,
        recipientCount,
      });
    } else {
      // Static message — batch send (no per-user vars)
      const renderedTitle = variables ? renderTemplate(title, variables) : title;
      const renderedBody = variables ? renderTemplate(body, variables) : body;

      let tokens: string[] = [];

      if (recipientType === 'all') {
        const users = await User.find({
          role: 'USER',
          'deviceTokens.0': { $exists: true },
        }).select('deviceTokens');
        tokens = users.flatMap((u) => u.deviceTokens.map((d) => d.token));
        recipientCount = users.length;
      } else if (recipientType === 'segment' && segment) {
        const activeSubscriptions = await Subscription.find({
          status: 'ACTIVE',
          segment,
          expiresAt: { $gt: new Date() },
        });
        const userIds = activeSubscriptions.map((s) => s.userId);
        const users = await User.find({
          _id: { $in: userIds },
          'deviceTokens.0': { $exists: true },
        }).select('deviceTokens');
        tokens = users.flatMap((u) => u.deviceTokens.map((d) => d.token));
        recipientCount = users.length;
      } else if (recipientType === 'individual' && userId) {
        const user = await User.findById(userId).select('deviceTokens');
        if (user && user.deviceTokens.length > 0) {
          tokens = user.deviceTokens.map((d) => d.token);
          recipientCount = 1;
        }
      }

      if (tokens.length > 0) {
        await sendPushToTokens(tokens, renderedTitle, renderedBody, {
          type: NOTIFICATION_TYPES.CUSTOM_MESSAGE,
          channelId: 'general',
          ...data,
        });
      }

      // Log to notification history
      await logNotification({
        type: NOTIFICATION_TYPES.CUSTOM_MESSAGE,
        title: renderedTitle,
        body: renderedBody,
        data,
        recipientType,
        recipientFilter: segment || userId,
        sentBy: req.userId,
        recipientCount,
      });
    }

    res.json({
      success: true,
      message: `Notification sent to ${recipientCount} user(s)`,
      data: { recipientCount },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /history — paginated notification log
router.get('/history', authMiddleware, adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      Notification.find()
        .populate('sentBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments(),
    ]);

    res.json({
      success: true,
      data: notifications,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /users/search — search users for individual targeting
router.get('/users/search', authMiddleware, adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const q = req.query.q as string;
    if (!q || q.length < 2) {
      res.json({ success: true, data: [] });
      return;
    }

    const users = await User.find({
      role: 'USER',
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
      ],
    })
      .select('name email phone')
      .limit(10);

    res.json({ success: true, data: users });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
