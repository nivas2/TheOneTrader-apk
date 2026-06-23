import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';
import { mainAdminGuard } from '../middleware/adminGuard';
import { Review } from '../models/Review';
import { User } from '../models/User';
import { Subscription } from '../models/Subscription';

const router = Router();

const createReviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().min(5).max(500),
});

const moderateSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  displayOnLandingPage: z.boolean().optional(),
});

// Client: submit review
router.post('/', authMiddleware, validate(createReviewSchema), async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const subscription = await Subscription.findOne({
      userId: req.userId,
      status: { $in: ['ACTIVE', 'EXPIRED'] },
    }).sort({ createdAt: -1 });

    const review = await Review.create({
      userId: req.userId,
      userName: user.name,
      planType: subscription?.planType || 'N/A',
      rating: req.body.rating,
      comment: req.body.comment,
    });

    res.status(201).json({ success: true, data: review });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Client: get my reviews
router.get('/mine', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const reviews = await Review.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json({ success: true, data: reviews });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Public: get approved reviews for landing page
router.get('/public', async (_req: Request, res: Response) => {
  try {
    const reviews = await Review.find({
      status: 'APPROVED',
      displayOnLandingPage: true,
    }).sort({ createdAt: -1 });
    res.json({ success: true, data: reviews });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: get all reviews
router.get('/all', authMiddleware, mainAdminGuard, async (_req: AuthRequest, res: Response) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 });
    res.json({ success: true, data: reviews });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: moderate review
router.put('/:id/moderate', authMiddleware, mainAdminGuard, validate(moderateSchema), async (req: AuthRequest, res: Response) => {
  try {
    const update: any = { status: req.body.status };
    if (typeof req.body.displayOnLandingPage === 'boolean') {
      update.displayOnLandingPage = req.body.displayOnLandingPage;
    }

    const review = await Review.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!review) {
      res.status(404).json({ success: false, error: 'Review not found' });
      return;
    }
    res.json({ success: true, data: review });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
