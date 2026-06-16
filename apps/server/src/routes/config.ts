import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { authMiddleware, AuthRequest } from '../middleware/authMiddleware';
import { adminGuard } from '../middleware/adminGuard';
import { Config } from '../models/Config';
import { uploadApk } from '../config/multer';

const router = Router();

// Ensure a config document exists
async function getOrCreateConfig() {
  let config = await Config.findOne();
  if (!config) {
    config = await Config.create({});
  }
  return config;
}

// Public: get site config
router.get('/public', async (_req: Request, res: Response) => {
  try {
    const config = await getOrCreateConfig();
    res.json({
      success: true,
      data: {
        marqueeWarningText: config.marqueeWarningText,
        whatsappActive: config.whatsappActive,
        promotionalBanners: config.promotionalBanners,
        publicHistoryStartDate: config.publicHistoryStartDate,
        publicHistoryEndDate: config.publicHistoryEndDate,
        termsAndConditions: config.termsAndConditions,
        whatsappPhone: config.whatsappPhone,
        signalIntervals: config.signalIntervals,
        segments: config.segments,
        categories: config.categories,
        instruments: config.instruments,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: get full config
router.get('/', authMiddleware, adminGuard, async (_req: AuthRequest, res: Response) => {
  try {
    const config = await getOrCreateConfig();
    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: update config
router.put('/', authMiddleware, adminGuard, async (req: AuthRequest, res: Response) => {
  try {
    const config = await getOrCreateConfig();
    const allowedFields = [
      'marqueeWarningText',
      'publicHistoryStartDate',
      'publicHistoryEndDate',
      'whatsappActive',
      'promotionalBanners',
      'paymentQrImagePath',
      'termsAndConditions',
      'whatsappPhone',
      'signalIntervals',
      'segments',
      'categories',
      'instruments',
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        (config as any)[field] = req.body[field];
      }
    }

    await config.save();
    res.json({ success: true, data: config });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── APK Management ──────────────────────────────────────

// Admin: upload APK
router.post('/app/upload', authMiddleware, adminGuard, uploadApk.single('apk'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No APK file uploaded' });
    }
    const config = await getOrCreateConfig();
    // Delete old APK file if exists
    if (config.apkFileName) {
      const oldPath = path.resolve('./uploads/app', config.apkFileName);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }
    config.apkFileName = req.file.filename;
    config.apkOriginalName = req.file.originalname;
    config.apkUploadedAt = new Date();
    config.apkVersion = (req.body.version || '').trim();
    await config.save();
    res.json({
      success: true,
      data: {
        apkFileName: config.apkFileName,
        apkOriginalName: config.apkOriginalName,
        apkUploadedAt: config.apkUploadedAt,
        apkVersion: config.apkVersion,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Public: get APK info
router.get('/app/info', async (_req: Request, res: Response) => {
  try {
    const config = await getOrCreateConfig();
    res.json({
      success: true,
      data: {
        available: !!config.apkFileName,
        apkOriginalName: config.apkOriginalName || null,
        apkUploadedAt: config.apkUploadedAt || null,
        apkVersion: config.apkVersion || null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Public: download APK
router.get('/app/download', async (_req: Request, res: Response) => {
  try {
    const config = await getOrCreateConfig();
    if (!config.apkFileName) {
      return res.status(404).json({ success: false, error: 'No APK available' });
    }
    const filePath = path.resolve('./uploads/app', config.apkFileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'APK file not found on server' });
    }
    res.download(filePath, config.apkOriginalName || 'TheOneTrade.apk');
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: delete APK
router.delete('/app/delete', authMiddleware, adminGuard, async (_req: AuthRequest, res: Response) => {
  try {
    const config = await getOrCreateConfig();
    if (config.apkFileName) {
      const filePath = path.resolve('./uploads/app', config.apkFileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    config.apkFileName = '';
    config.apkOriginalName = '';
    config.apkUploadedAt = undefined as any;
    config.apkVersion = '';
    await config.save();
    res.json({ success: true, data: { message: 'APK deleted' } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
