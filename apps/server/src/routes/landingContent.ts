import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';
import { adminGuard } from '../middleware/adminGuard';
import { LandingPageContent } from '../models/LandingPageContent';

const router = Router();

async function getOrCreateLandingContent() {
  let content = await LandingPageContent.findOne();
  if (!content) {
    content = await LandingPageContent.create({});
  }
  return content;
}

// Public: get landing page content
router.get('/public', async (_req: Request, res: Response) => {
  try {
    const content = await getOrCreateLandingContent();
    res.json({ success: true, data: content });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: get landing page content for editing
router.get('/', authMiddleware, adminGuard, async (_req: AuthRequest, res: Response) => {
  try {
    const content = await getOrCreateLandingContent();
    res.json({ success: true, data: content });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: update landing page content by section
router.put('/', authMiddleware, adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const content = await getOrCreateLandingContent();
    const allowedSections = [
      'hero',
      'mockTradeCard',
      'socialProof',
      'whatWeOffer',
      'performance',
      'howItWorks',
      'signalPreview',
      'testimonials',
      'countdown',
      'finalCTA',
      'fomo',
    ];

    for (const section of allowedSections) {
      if (req.body[section] !== undefined) {
        (content as any)[section] = req.body[section];
      }
    }

    await content.save();
    res.json({ success: true, data: content });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
