import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';
import { mainAdminGuard } from '../middleware/adminGuard';
import { User } from '../models/User';

const router = Router();

const SALT_ROUNDS = 12;

// List all sub-admins
router.get('/', authMiddleware, mainAdminGuard, async (_req: AuthRequest, res: Response) => {
  try {
    const subadmins = await User.find({ role: 'SUBADMIN' })
      .select('name email phone isActive allowedPages allowedSegments createdAt')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: subadmins });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create sub-admin
router.post('/', authMiddleware, mainAdminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, phone, password, allowedPages, allowedSegments } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ success: false, error: 'Name, email, phone, and password are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const subadmin = await User.create({
      name,
      email: email.toLowerCase(),
      phone,
      passwordHash,
      role: 'SUBADMIN',
      isVerified: true,
      allowedPages: allowedPages || [],
      allowedSegments: allowedSegments || [],
    });

    res.status(201).json({
      success: true,
      data: {
        _id: subadmin._id,
        name: subadmin.name,
        email: subadmin.email,
        phone: subadmin.phone,
        isActive: subadmin.isActive,
        allowedPages: subadmin.allowedPages,
        allowedSegments: subadmin.allowedSegments,
        createdAt: subadmin.createdAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update sub-admin
router.put('/:id', authMiddleware, mainAdminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const subadmin = await User.findOne({ _id: req.params.id, role: 'SUBADMIN' });
    if (!subadmin) {
      return res.status(404).json({ success: false, error: 'Sub-admin not found' });
    }

    const { name, email, phone, allowedPages, allowedSegments, password } = req.body;

    if (name) subadmin.name = name;
    if (phone) subadmin.phone = phone;
    if (email && email.toLowerCase() !== subadmin.email) {
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        return res.status(409).json({ success: false, error: 'Email already in use' });
      }
      subadmin.email = email.toLowerCase();
    }
    if (allowedPages !== undefined) subadmin.allowedPages = allowedPages;
    if (allowedSegments !== undefined) subadmin.allowedSegments = allowedSegments;
    if (password) {
      subadmin.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    }

    await subadmin.save();

    res.json({
      success: true,
      data: {
        _id: subadmin._id,
        name: subadmin.name,
        email: subadmin.email,
        phone: subadmin.phone,
        isActive: subadmin.isActive,
        allowedPages: subadmin.allowedPages,
        allowedSegments: subadmin.allowedSegments,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Toggle sub-admin active status
router.patch('/:id/toggle-active', authMiddleware, mainAdminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const subadmin = await User.findOne({ _id: req.params.id, role: 'SUBADMIN' });
    if (!subadmin) {
      return res.status(404).json({ success: false, error: 'Sub-admin not found' });
    }

    subadmin.isActive = !subadmin.isActive;
    await subadmin.save();

    if (!subadmin.isActive) {
      const { getRedisClient } = require('../config/redis');
      const redis = getRedisClient();
      await redis.del(`session:web:${subadmin._id}`);
    }

    res.json({
      success: true,
      data: { _id: subadmin._id, isActive: subadmin.isActive },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete sub-admin
router.delete('/:id', authMiddleware, mainAdminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const subadmin = await User.findOneAndDelete({ _id: req.params.id, role: 'SUBADMIN' });
    if (!subadmin) {
      return res.status(404).json({ success: false, error: 'Sub-admin not found' });
    }

    const { getRedisClient } = require('../config/redis');
    const redis = getRedisClient();
    await redis.del(`session:web:${subadmin._id}`);

    res.json({ success: true, message: 'Sub-admin deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
