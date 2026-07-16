import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';
import { adminGuard, mainAdminGuard } from '../middleware/adminGuard';
import { Plan } from '../models/Plan';
import { Config } from '../models/Config';

const router = Router();

// Public: get active plans
router.get('/public', async (_req: Request, res: Response) => {
  try {
    const plans = await Plan.find({ isActive: true }).sort({ segment: 1, price: 1 });
    res.json({ success: true, data: plans });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: get all plans (sub-admins need this for signal creation)
router.get('/', authMiddleware, adminGuard, async (_req: AuthRequest, res: Response) => {
  try {
    const plans = await Plan.find().sort({ segment: 1, planType: 1 });
    res.json({ success: true, data: plans });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: create plan
router.post('/', authMiddleware, mainAdminGuard, async (req: AuthRequest, res: Response) => {
  try {
    // Validate segment against config
    if (req.body.segment) {
      const config = await Config.findOne();
      const validSegments = config?.segments?.map((s) => s.key) || [];
      if (!validSegments.includes(req.body.segment)) {
        res.status(400).json({ success: false, error: `Invalid segment "${req.body.segment}". Valid segments: ${validSegments.join(', ')}` });
        return;
      }
    }

    const plan = await Plan.create(req.body);
    res.status(201).json({ success: true, data: plan });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: update plan
router.put('/:id', authMiddleware, mainAdminGuard, async (req: AuthRequest, res: Response) => {
  try {
    // Validate segment against config if being updated
    if (req.body.segment) {
      const config = await Config.findOne();
      const validSegments = config?.segments?.map((s) => s.key) || [];
      if (!validSegments.includes(req.body.segment)) {
        res.status(400).json({ success: false, error: `Invalid segment "${req.body.segment}". Valid segments: ${validSegments.join(', ')}` });
        return;
      }
    }

    const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!plan) {
      return res.status(404).json({ success: false, error: 'Plan not found' });
    }
    res.json({ success: true, data: plan });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: delete plan
router.delete('/:id', authMiddleware, mainAdminGuard, async (req: AuthRequest, res: Response) => {
  try {
    await Plan.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Plan deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
