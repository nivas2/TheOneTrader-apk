import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authMiddleware, optionalAuthMiddleware, AuthRequest } from '../middleware/authMiddleware';
import { adminGuard, mainAdminGuard } from '../middleware/adminGuard';
import { User } from '../models/User';
import { subscriptionGuard, maskSignalData } from '../middleware/subscriptionGuard';
import { Signal } from '../models/Signal';
import { Config } from '../models/Config';
import { broadcastSignal, broadcastSignalUpdate, sendSignalFCM, sendSignalStatusFCM } from '../services/signalService';
import { relaySignalToDebugger, relaySignalUpdateToDebugger } from '../services/debuggerRelay';

const router = Router();

const createSignalSchema = z.object({
  segment: z.string().min(1),
  subCategory: z.string().min(1),
  targetIntervals: z.array(z.string().min(1)).min(1),
  action: z.enum(['BUY', 'SELL']),
  instrument: z.string().min(1),
  entryPriceRange: z.object({
    min: z.number().positive(),
    max: z.number().positive(),
  }),
  targetPrice: z.number().positive(),
  stopLoss: z.number().positive(),
  safeExit: z.number().positive().optional(),
  note: z.string().optional(),
}).refine((data) => data.entryPriceRange.max >= data.entryPriceRange.min, {
  message: 'Entry Max must be greater than or equal to Entry Min',
  path: ['entryPriceRange', 'max'],
}).refine((data) => {
  if (data.action === 'BUY') {
    return data.targetPrice > data.entryPriceRange.max;
  }
  return data.targetPrice < data.entryPriceRange.min;
}, {
  message: 'For BUY, Target must be above Entry Max. For SELL, Target must be below Entry Min.',
  path: ['targetPrice'],
}).refine((data) => {
  if (data.action === 'BUY') {
    return data.stopLoss < data.entryPriceRange.min;
  }
  return data.stopLoss > data.entryPriceRange.max;
}, {
  message: 'For BUY, Stop Loss must be below Entry Min. For SELL, Stop Loss must be above Entry Max.',
  path: ['stopLoss'],
});

const updateStatusSchema = z.object({
  status: z.enum(['HIT_TARGET', 'HIT_SL', 'SAFE_EXIT', 'CANCELLED']),
});

// Admin: create signal
router.post('/', authMiddleware, adminGuard, validate(createSignalSchema), async (req: AuthRequest, res: Response) => {
  try {
    // Validate segment against config
    const config = await Config.findOne();
    const validSegments = config?.segments?.map((s) => s.key) || [];
    if (!validSegments.includes(req.body.segment)) {
      res.status(400).json({ success: false, error: `Invalid segment "${req.body.segment}". Valid segments: ${validSegments.join(', ')}` });
      return;
    }

    // Sub-admin segment restriction
    if (req.userRole === 'SUBADMIN') {
      const user = await User.findById(req.userId);
      if (user && !user.allowedSegments.includes(req.body.segment)) {
        res.status(403).json({ success: false, error: 'You are not allowed to create signals for this segment' });
        return;
      }
    }

    const signal = await Signal.create({ ...req.body, createdBy: req.userId });
    broadcastSignal(signal).catch(console.error);
    sendSignalFCM(signal).catch(console.error);

    // Include creator name in debugger relay
    const creator = await User.findById(req.userId).select('name role');
    relaySignalToDebugger({
      ...signal.toObject(),
      createdByName: creator?.name || 'Unknown',
      createdByRole: creator?.role || 'ADMIN',
    });

    // Auto-save instrument name to config for future dropdown use
    Config.updateOne(
      {},
      { $addToSet: { instruments: req.body.instrument.toUpperCase() } },
      { upsert: true }
    ).catch(console.error);

    res.status(201).json({ success: true, data: signal });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Public/Client: list signals (masked for non-subscribers, unmasked for admin)
router.get('/', optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};

    // Sub-admin: only see own signals
    if (req.userRole === 'SUBADMIN') {
      filter.createdBy = req.userId;
    }

    // Date filtering
    if (req.query.startDate) {
      filter.createdAt = { ...filter.createdAt, $gte: new Date(req.query.startDate as string) };
    }
    if (req.query.endDate) {
      const endDate = new Date(req.query.endDate as string);
      endDate.setHours(23, 59, 59, 999);
      filter.createdAt = { ...filter.createdAt, $lte: endDate };
    }

    // Search filtering (instrument, segment, subCategory, action, status)
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search as string, 'i');
      filter.$or = [
        { instrument: searchRegex },
        { segment: searchRegex },
        { subCategory: searchRegex },
        { action: searchRegex },
        { status: searchRegex },
        { 'targetIntervals': searchRegex },
      ];
    }

    // Column-level filters
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.action) {
      filter.action = req.query.action;
    }
    if (req.query.segment) {
      filter.segment = req.query.segment;
    }
    if (req.query.subCategory) {
      filter.subCategory = req.query.subCategory;
    }

    const signals = await Signal.find(filter)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Signal.countDocuments(filter);
    // Admin/SubAdmin sees unmasked data; others masked unless subscriptionGuard set requiresPremium=false
    const shouldMask = (req.userRole === 'ADMIN' || req.userRole === 'SUBADMIN') ? false : (req as any).requiresPremium !== false;

    const data = signals.map((s) => maskSignalData(s.toObject(), shouldMask));

    res.json({
      success: true,
      data,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Public: showcase signals for landing page (admin-curated, completed only, unmasked)
router.get('/showcase', async (_req: Request, res: Response) => {
  try {
    const signals = await Signal.find({
      showcaseOnLanding: true,
      status: { $in: ['HIT_TARGET', 'HIT_SL', 'SAFE_EXIT'] },
    })
      .sort({ createdAt: -1 })
      .limit(12);
    res.json({ success: true, data: signals.map((s) => s.toObject()) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: signals created by sub-admins
router.get('/by-subadmins', authMiddleware, mainAdminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const subadminUsers = await User.find({ role: 'SUBADMIN' }).select('_id');
    const subadminIds = subadminUsers.map((u) => u._id);

    const filter: any = { createdBy: { $in: subadminIds } };

    if (req.query.startDate) {
      filter.createdAt = { ...filter.createdAt, $gte: new Date(req.query.startDate as string) };
    }
    if (req.query.endDate) {
      const endDate = new Date(req.query.endDate as string);
      endDate.setHours(23, 59, 59, 999);
      filter.createdAt = { ...filter.createdAt, $lte: endDate };
    }

    const signals = await Signal.find(filter)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Signal.countDocuments(filter);

    res.json({
      success: true,
      data: signals.map((s) => s.toObject()),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Public: signal history (unmasked, date-range gated by config)
router.get('/history/public', async (req: Request, res: Response) => {
  try {
    const config = await Config.findOne();
    const startDate = config?.publicHistoryStartDate || new Date('2024-01-01');
    const endDate = config?.publicHistoryEndDate || new Date();

    const filter: any = {
      status: { $in: ['HIT_TARGET', 'HIT_SL', 'SAFE_EXIT'] },
      createdAt: { $gte: startDate, $lte: endDate },
    };

    if (req.query.segment) {
      filter.segment = req.query.segment;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const signals = await Signal.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
    const total = await Signal.countDocuments(filter);

    res.json({
      success: true,
      data: signals.map((s) => s.toObject()),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Client: today's signals (active + inactive for current IST date)
router.get('/active', authMiddleware, subscriptionGuard, async (req: AuthRequest, res: Response) => {
  try {
    const isAdmin = req.userRole === 'ADMIN';
    const subscribedSegments: string[] = (req as any).subscribedSegments || [];

    // Calculate start/end of today in IST (UTC+5:30)
    const now = new Date();
    const IST_OFFSET = 5.5 * 60 * 60 * 1000;
    const nowIST = new Date(now.getTime() + IST_OFFSET);
    const startOfDayIST = new Date(nowIST);
    startOfDayIST.setHours(0, 0, 0, 0);
    const endOfDayIST = new Date(nowIST);
    endOfDayIST.setHours(23, 59, 59, 999);
    // Convert back to UTC for DB query
    const startUTC = new Date(startOfDayIST.getTime() - IST_OFFSET);
    const endUTC = new Date(endOfDayIST.getTime() - IST_OFFSET);

    const filter: any = {
      $or: [
        { status: 'ACTIVE' },
        { createdAt: { $gte: startUTC, $lte: endUTC } },
      ],
    };

    if (!isAdmin && subscribedSegments.length > 0) {
      filter.segment = { $in: subscribedSegments };
    }

    const signals = await Signal.find(filter).sort({ createdAt: -1 });
    const shouldMask = !!(req as any).requiresPremium;
    const data = signals.map((s) => maskSignalData(s.toObject(), shouldMask));
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Client: signal history
router.get('/history', authMiddleware, subscriptionGuard, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const isAdmin = req.userRole === 'ADMIN';
    const subscribedSegments: string[] = (req as any).subscribedSegments || [];
    const filter: any = { status: { $ne: 'ACTIVE' } };

    if (!isAdmin && subscribedSegments.length > 0) {
      filter.segment = { $in: subscribedSegments };
    }

    if (startDate) filter.createdAt = { ...filter.createdAt, $gte: new Date(startDate as string) };
    if (endDate) {
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      filter.createdAt = { ...filter.createdAt, $lte: end };
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const signals = await Signal.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
    const total = await Signal.countDocuments(filter);
    const shouldMask = !!(req as any).requiresPremium;
    const data = signals.map((s) => maskSignalData(s.toObject(), shouldMask));

    res.json({
      success: true,
      data,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: toggle showcase on landing page
router.patch('/:id/showcase', authMiddleware, adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const signal = await Signal.findById(req.params.id);
    if (!signal) {
      res.status(404).json({ success: false, error: 'Signal not found' });
      return;
    }
    signal.showcaseOnLanding = !signal.showcaseOnLanding;
    await signal.save();
    res.json({ success: true, data: signal });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: update signal status
router.put('/:id', authMiddleware, adminGuard, validate(updateStatusSchema), async (req: AuthRequest, res: Response) => {
  try {
    const signal = await Signal.findById(req.params.id);
    if (!signal) {
      res.status(404).json({ success: false, error: 'Signal not found' });
      return;
    }

    const updater = await User.findById(req.userId).select('name role');
    signal.status = req.body.status;
    signal.statusHistory = signal.statusHistory || [];
    signal.statusHistory.push({
      status: req.body.status,
      updatedBy: req.userId as any,
      updatedByName: updater?.name || 'Unknown',
      updatedAt: new Date(),
    });
    await signal.save();

    // Broadcast status update with alarm to subscribers, without alarm to admin
    broadcastSignalUpdate(signal).catch(console.error);

    // Send FCM push for signal status update
    sendSignalStatusFCM(signal).catch(console.error);
    relaySignalUpdateToDebugger(signal._id.toString(), signal.status);

    res.json({ success: true, data: signal });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin only: delete signal permanently
router.delete('/:id', authMiddleware, mainAdminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const signal = await Signal.findById(req.params.id);
    if (!signal) {
      res.status(404).json({ success: false, error: 'Signal not found' });
      return;
    }
    await Signal.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Signal deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Public: performance board
router.get('/performance', async (req: Request, res: Response) => {
  try {
    const config = await Config.findOne();
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : config?.publicHistoryStartDate || new Date('2024-01-01');
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : config?.publicHistoryEndDate || new Date();

    const completedSignals = await Signal.find({
      status: { $in: ['HIT_TARGET', 'HIT_SL', 'SAFE_EXIT'] },
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const total = completedSignals.length;
    const hitTarget = completedSignals.filter((s) => s.status === 'HIT_TARGET').length;
    const hitSL = completedSignals.filter((s) => s.status === 'HIT_SL').length;
    const safeExit = completedSignals.filter((s) => s.status === 'SAFE_EXIT').length;

    res.json({
      success: true,
      data: {
        total,
        hitTarget,
        hitSL,
        safeExit,
        winRate: total > 0 ? ((hitTarget / total) * 100).toFixed(1) : '0',
        dateRange: { start: startDate, end: endDate },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
