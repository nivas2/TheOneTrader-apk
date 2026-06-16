import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';
import { adminGuard } from '../middleware/adminGuard';
import { Plan } from '../models/Plan';

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

// Admin: get all plans
router.get('/', authMiddleware, adminGuard, async (_req: AuthRequest, res: Response) => {
  try {
    const plans = await Plan.find().sort({ segment: 1, planType: 1 });
    res.json({ success: true, data: plans });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: create plan
router.post('/', authMiddleware, adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const plan = await Plan.create(req.body);
    res.status(201).json({ success: true, data: plan });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: update plan
router.put('/:id', authMiddleware, adminGuard, async (req: AuthRequest, res: Response) => {
  try {
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
router.delete('/:id', authMiddleware, adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    await Plan.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Plan deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
