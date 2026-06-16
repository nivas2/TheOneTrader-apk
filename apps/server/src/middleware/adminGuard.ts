import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';

export function adminGuard(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.userRole !== 'ADMIN') {
    res.status(403).json({ success: false, error: 'Admin access required' });
    return;
  }
  next();
}
