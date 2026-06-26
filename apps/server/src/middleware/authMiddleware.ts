import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { getRedisClient } from '../config/redis';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
  sessionId?: string;
}

interface JwtPayload {
  userId: string;
  role: string;
  sessionId: string;
  platform?: string;
}

async function isSessionValid(redis: any, decoded: JwtPayload): Promise<boolean> {
  // New format: session:{sessionId} → userId (each login is independent)
  const storedUserId = await redis.get(`session:${decoded.sessionId}`);
  if (storedUserId === decoded.userId) return true;

  // Backward compat: also check old per-platform keys
  const platform = decoded.platform || 'web';
  const storedSessionId = await redis.get(`session:${platform}:${decoded.userId}`);
  if (storedSessionId === decoded.sessionId) return true;

  // Legacy key
  const legacySessionId = await redis.get(`session:${decoded.userId}`);
  if (legacySessionId === decoded.sessionId) return true;

  return false;
}

export async function optionalAuthMiddleware(req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    const redis = getRedisClient();
    if (await isSessionValid(redis, decoded)) {
      req.userId = decoded.userId;
      req.userRole = decoded.role;
      req.sessionId = decoded.sessionId;
    }

    next();
  } catch {
    next();
  }
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'No token provided' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    const redis = getRedisClient();
    if (!(await isSessionValid(redis, decoded))) {
      res.status(401).json({ success: false, error: 'Session expired - logged in elsewhere' });
      return;
    }

    req.userId = decoded.userId;
    req.userRole = decoded.role;
    req.sessionId = decoded.sessionId;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ success: false, error: 'Token expired' });
      return;
    }
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
}
