import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authMiddleware, optionalAuthMiddleware, AuthRequest } from '../middleware/authMiddleware';
import { adminGuard } from '../middleware/adminGuard';
import { subscriptionGuard, maskSignalData } from '../middleware/subscriptionGuard';
import { Signal } from '../models/Signal';
import { Config } from '../models/Config';
import { broadcastSignal, sendSignalFCM, sendSignalStatusFCM } from '../services/signalService';

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
});

const updateStatusSchema = z.object({
  status: z.enum(['HIT_TARGET', 'HIT_SL', 'SAFE_EXIT', 'CANCELLED']),
});

// Admin: create signal
router.post('/', authMiddleware, adminGuard, validate(createSignalSchema), async (req: AuthRequest, res: Response) => {
  try {
    const signal = await Signal.create(req.body);
    broadcastSignal(signal).catch(console.error);
    sendSignalFCM(signal).catch(console.error);

    // Auto-save instrument name to config for future dropdown use
    Config.updateOne(
      {},
      { $addToSet: { instruments: req.body.instrument.toUpperCase() } }
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

    const signals = await Signal.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Signal.countDocuments();
    // Admin sees unmasked data; others masked unless subscriptionGuard set requiresPremium=false
    const shouldMask = req.userRole === 'ADMIN' ? false : (req as any).requiresPremium !== false;

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

// Client: active signals
router.get('/active', authMiddleware, subscriptionGuard, async (req: AuthRequest, res: Response) => {
  try {
    const signals = await Signal.find({ status: 'ACTIVE' }).sort({ createdAt: -1 });
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
    const filter: any = { status: { $ne: 'ACTIVE' } };

    if (startDate) filter.createdAt = { ...filter.createdAt, $gte: new Date(startDate as string) };
    if (endDate) filter.createdAt = { ...filter.createdAt, $lte: new Date(endDate as string) };

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

// Admin: update signal status
router.put('/:id', authMiddleware, adminGuard, validate(updateStatusSchema), async (req: AuthRequest, res: Response) => {
  try {
    const signal = await Signal.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (!signal) {
      res.status(404).json({ success: false, error: 'Signal not found' });
      return;
    }

    // Broadcast status update
    const io = (await import('../config/socket')).getIO();
    const { SOCKET_EVENTS } = await import('@theonetrade/shared-types');
    io.emit(SOCKET_EVENTS.SIGNAL_UPDATE, { signal: signal.toObject() });

    // Send FCM push for signal status update
    sendSignalStatusFCM(signal).catch(console.error);

    res.json({ success: true, data: signal });
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
