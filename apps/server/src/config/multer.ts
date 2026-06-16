import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { env } from './env';

const uploadDir = env.UPLOAD_DIR;

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `receipt-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and PDF are allowed.'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// APK upload configuration
const apkUploadDir = './uploads/app';
if (!fs.existsSync(apkUploadDir)) {
  fs.mkdirSync(apkUploadDir, { recursive: true });
}

const apkStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, apkUploadDir);
  },
  filename: (_req, _file, cb) => {
    cb(null, `TheOneTrade-${Date.now()}.apk`);
  },
});

const apkFileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'application/vnd.android.package-archive',
    'application/octet-stream',
  ];
  const isApkExtension = file.originalname.toLowerCase().endsWith('.apk');
  if (allowedMimes.includes(file.mimetype) && isApkExtension) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only APK files are allowed.'));
  }
};

export const uploadApk = multer({
  storage: apkStorage,
  fileFilter: apkFileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});
