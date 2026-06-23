import { Router, Response } from 'express';
import { Parser } from '@json2csv/plainjs';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';
import { adminGuard } from '../middleware/adminGuard';
import { Signal } from '../models/Signal';
import { User } from '../models/User';
import { Subscription } from '../models/Subscription';

const router = Router();

// Admin: signal analytics
router.get('/signals', authMiddleware, adminGuard, async (_req: AuthRequest, res: Response) => {
  try {
    const totalSignals = await Signal.countDocuments();
    const activeSignals = await Signal.countDocuments({ status: 'ACTIVE' });

    const completedSignals = await Signal.find({
      status: { $in: ['HIT_TARGET', 'HIT_SL', 'SAFE_EXIT', 'CANCELLED'] },
    });

    const hitTarget = completedSignals.filter((s) => s.status === 'HIT_TARGET').length;
    const hitSL = completedSignals.filter((s) => s.status === 'HIT_SL').length;
    const safeExit = completedSignals.filter((s) => s.status === 'SAFE_EXIT').length;
    const cancelled = completedSignals.filter((s) => s.status === 'CANCELLED').length;
    const completed = completedSignals.length;

    // Category splits
    const segmentBreakdown = await Signal.aggregate([
      { $group: { _id: '$segment', count: { $sum: 1 } } },
    ]);

    const subCategoryBreakdown = await Signal.aggregate([
      { $group: { _id: '$subCategory', count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: {
        totalSignals,
        activeSignals,
        completed,
        hitTarget,
        hitSL,
        safeExit,
        cancelled,
        winRate: completed > 0 ? ((hitTarget / completed) * 100).toFixed(1) : '0',
        segmentBreakdown,
        subCategoryBreakdown,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: user analytics
router.get('/users', authMiddleware, adminGuard, async (_req: AuthRequest, res: Response) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'USER' });
    const verifiedUsers = await User.countDocuments({ role: 'USER', isVerified: true });
    const activeSubscriptions = await Subscription.countDocuments({ status: 'ACTIVE' });
    const pendingPayments = await Subscription.countDocuments({ status: 'PENDING_APPROVAL' });

    const subscriptionsBySegment = await Subscription.aggregate([
      { $match: { status: 'ACTIVE' } },
      { $group: { _id: '$segment', count: { $sum: 1 } } },
    ]);

    // Monthly user growth (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const userGrowth = await User.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        verifiedUsers,
        activeSubscriptions,
        pendingPayments,
        subscriptionsBySegment,
        userGrowth,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: detailed user list with subscriptions
router.get('/users/list', authMiddleware, adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const {
      filter = 'all',
      search = '',
      startDate,
      endDate,
      page = '1',
      limit = '20',
    } = req.query as Record<string, string>;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    // Build user query
    const userQuery: any = { role: 'USER' };

    if (search) {
      userQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    if (startDate || endDate) {
      userQuery.createdAt = {};
      if (startDate) userQuery.createdAt.$gte = new Date(startDate);
      if (endDate) userQuery.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
    }

    // Filter by subscription status
    if (filter === 'subscribed') {
      const subscribedUserIds = await Subscription.distinct('userId', { status: 'ACTIVE' });
      userQuery._id = { $in: subscribedUserIds };
    } else if (filter === 'unsubscribed') {
      const subscribedUserIds = await Subscription.distinct('userId', { status: 'ACTIVE' });
      userQuery._id = { $nin: subscribedUserIds };
    }

    const totalUsers = await User.countDocuments(userQuery);
    const users = await User.find(userQuery)
      .select('name email phone isVerified isActive role createdAt')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    // Get subscriptions for these users
    const userIds = users.map((u: any) => u._id);
    const subscriptions = await Subscription.find({
      userId: { $in: userIds },
    })
      .sort({ createdAt: -1 })
      .lean();

    // Merge subscription data into user objects
    const usersWithSubs = users.map((user: any) => {
      const userSubs = subscriptions.filter(
        (s: any) => s.userId.toString() === user._id.toString()
      );
      const activeSub = userSubs.find((s: any) => s.status === 'ACTIVE');
      const latestSub = userSubs[0] || null;
      return {
        ...user,
        activeSubscription: activeSub
          ? {
              planType: activeSub.planType,
              segment: activeSub.segment,
              activatedAt: activeSub.activatedAt,
              expiresAt: activeSub.expiresAt,
              status: activeSub.status,
            }
          : null,
        latestSubscription: latestSub
          ? {
              planType: latestSub.planType,
              segment: latestSub.segment,
              status: latestSub.status,
              createdAt: latestSub.createdAt,
            }
          : null,
        totalSubscriptions: userSubs.length,
      };
    });

    res.json({
      success: true,
      data: {
        users: usersWithSubs,
        pagination: {
          total: totalUsers,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(totalUsers / limitNum),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: CSV export
router.get('/export/csv', authMiddleware, adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const filter = req.query.filter as string || 'all';
    let users;

    if (filter === 'subscribed') {
      const subscribedUserIds = await Subscription.distinct('userId', { status: 'ACTIVE' });
      users = await User.find({ _id: { $in: subscribedUserIds }, role: 'USER' })
        .select('name email phone isVerified createdAt')
        .lean();
    } else if (filter === 'unsubscribed') {
      const subscribedUserIds = await Subscription.distinct('userId', { status: 'ACTIVE' });
      users = await User.find({ _id: { $nin: subscribedUserIds }, role: 'USER' })
        .select('name email phone isVerified createdAt')
        .lean();
    } else {
      users = await User.find({ role: 'USER' })
        .select('name email phone isVerified createdAt')
        .lean();
    }

    const parser = new Parser({
      fields: ['name', 'email', 'phone', 'isVerified', 'createdAt'],
    });
    const csv = parser.parse(users);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=users-${filter}-${Date.now()}.csv`);
    res.send(csv);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: toggle user active status
router.put('/users/:id/toggle-active', authMiddleware, adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    if (user.role === 'ADMIN') {
      return res.status(400).json({ success: false, error: 'Cannot deactivate admin users' });
    }

    user.isActive = !user.isActive;
    await user.save();

    // If deactivated, clear their session so they get logged out
    if (!user.isActive) {
      const { getRedisClient } = require('../config/redis');
      const redis = getRedisClient();
      await redis.del(`session:${user._id}`);
    }

    res.json({
      success: true,
      data: { _id: user._id, isActive: user.isActive },
      message: user.isActive ? 'User activated' : 'User deactivated',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
