import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { Lead } from '../models/Lead';
import { sendLeadNotification } from '../services/emailService';
import { sendPushToAdmins } from '../services/pushService';
import { NOTIFICATION_TYPES } from '@theonetrade/shared-types';

const router = Router();

const leadSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(10).max(15),
});

router.post('/', validate(leadSchema), async (req: Request, res: Response) => {
  try {
    const lead = await Lead.create(req.body);
    sendLeadNotification(req.body).catch((err) => {
      console.error('Failed to send lead notification:', err);
    });

    // Push notification to all admins
    sendPushToAdmins(
      'New Lead',
      `${req.body.name} (${req.body.phone}) submitted lead form`,
      { type: NOTIFICATION_TYPES.ADMIN_NEW_LEAD }
    ).catch(console.error);

    res.status(201).json({ success: true, data: lead });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
