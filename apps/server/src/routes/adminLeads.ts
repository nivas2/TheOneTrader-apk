import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';
import { adminGuard } from '../middleware/adminGuard';
import { Lead } from '../models/Lead';
import { Config } from '../models/Config';
import { User } from '../models/User';

const router = Router();

// List leads with search, pagination, date filter, status filter
router.get('/', authMiddleware, adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
    const search = (req.query.search as string || '').trim();
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const status = (req.query.status as string || '').trim();

    const filter: any = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) {
      filter.status = status;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const [leads, total] = await Promise.all([
      Lead.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Lead.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        leads,
        pagination: { total, page, pages: Math.ceil(total / limit), limit },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Stats
router.get('/stats', authMiddleware, adminGuard, async (_req: AuthRequest, res: Response) => {
  try {
    const total = await Lead.countDocuments();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await Lead.countDocuments({ createdAt: { $gte: today } });

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);
    const weekCount = await Lead.countDocuments({ createdAt: { $gte: weekAgo } });

    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    monthAgo.setHours(0, 0, 0, 0);
    const monthCount = await Lead.countDocuments({ createdAt: { $gte: monthAgo } });

    res.json({ success: true, data: { total, today: todayCount, thisWeek: weekCount, thisMonth: monthCount } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get lead statuses from config
router.get('/statuses', authMiddleware, adminGuard, async (_req: AuthRequest, res: Response) => {
  try {
    const config = await Config.findOne().lean();
    const statuses = config?.leadStatuses || ['New', 'Contacted', 'Callback Needed', 'Interested', 'Not Interested', 'Converted'];
    res.json({ success: true, data: statuses });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update lead statuses in config
router.put('/statuses', authMiddleware, adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const { statuses } = req.body;
    if (!Array.isArray(statuses) || statuses.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one status is required' });
    }
    const cleaned = statuses.map((s: string) => String(s).trim()).filter(Boolean);
    await Config.findOneAndUpdate({}, { leadStatuses: cleaned }, { upsert: true });
    res.json({ success: true, data: cleaned });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Export CSV
router.get('/export', authMiddleware, adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const search = (req.query.search as string || '').trim();
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const status = (req.query.status as string || '').trim();

    const filter: any = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }
    if (status) {
      filter.status = status;
    }
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const leads = await Lead.find(filter).sort({ createdAt: -1 }).lean();

    const csvRows = ['Name,Email,Phone,Status,Notes,Submitted On'];
    for (const lead of leads) {
      const name = `"${(lead.name || '').replace(/"/g, '""')}"`;
      const email = `"${(lead.email || '').replace(/"/g, '""')}"`;
      const phone = `"${(lead.phone || '').replace(/"/g, '""')}"`;
      const s = `"${(lead.status || 'New').replace(/"/g, '""')}"`;
      const notes = `"${(lead.notes || '').replace(/"/g, '""')}"`;
      const date = new Date(lead.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      csvRows.push(`${name},${email},${phone},${s},${notes},${date}`);
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=leads-${Date.now()}.csv`);
    res.send(csvRows.join('\n'));
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update lead (status, notes)
router.put('/:id', authMiddleware, adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const { status, notes } = req.body;
    const update: any = {};
    if (status !== undefined) update.status = String(status).trim();
    if (notes !== undefined) update.notes = String(notes).trim();

    const lead = await Lead.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }
    res.json({ success: true, data: lead });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete a lead
router.delete('/:id', authMiddleware, adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    if (req.userRole === 'SUBADMIN') {
      const currentUser = await User.findById(req.userId).select('canDeleteLeads');
      if (!currentUser?.canDeleteLeads) {
        return res.status(403).json({ success: false, error: 'You do not have permission to delete leads' });
      }
    }
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }
    res.json({ success: true, message: 'Lead deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
