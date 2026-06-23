import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';

export function adminGuard(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.userRole !== 'ADMIN' && req.userRole !== 'SUBADMIN') {
    res.status(403).json({ success: false, error: 'Admin access required' });
    return;
  }
  next();
}

export function mainAdminGuard(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.userRole !== 'ADMIN') {
    res.status(403).json({ success: false, error: 'Main admin access required' });
    return;
  }
  next();
}
