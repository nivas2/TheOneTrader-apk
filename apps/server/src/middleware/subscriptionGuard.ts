import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';
import { Subscription } from '../models/Subscription';

export async function subscriptionGuard(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.userRole === 'ADMIN') {
      next();
      return;
    }

    if (!req.userId) {
      // Public access - mark as requiring premium
      (req as any).requiresPremium = true;
      next();
      return;
    }

    const now = new Date();
    const activeSubscriptions = await Subscription.find({
      userId: req.userId,
      status: { $in: ['ACTIVE', 'PENDING_ACTIVATION'] },
      activatedAt: { $lte: now },
      expiresAt: { $gt: now },
    });

    if (activeSubscriptions.length === 0) {
      (req as any).requiresPremium = true;
    } else {
      (req as any).requiresPremium = false;
      (req as any).activeSubscriptions = activeSubscriptions;
    }

    next();
  } catch (error) {
    next(error);
  }
}

export function maskSignalData(signal: any, requiresPremium: boolean): any {
  if (!requiresPremium) return signal;

  const masked = { ...signal };
  if (masked._doc) {
    const doc = { ...masked._doc };
    doc.instrument = '****';
    doc.entryPriceRange = { min: '****', max: '****' };
    doc.targetPrice = '****';
    doc.stopLoss = '****';
    doc.safeExit = '****';
    doc.requiresPremium = true;
    return doc;
  }

  masked.instrument = '****';
  masked.entryPriceRange = { min: '****', max: '****' };
  masked.targetPrice = '****';
  masked.stopLoss = '****';
  masked.safeExit = '****';
  masked.requiresPremium = true;
  return masked;
}
