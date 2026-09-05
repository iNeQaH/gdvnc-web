import { verifyToken } from '../services/auth';

export const requireAuth = async (req: any, res: any, next: any) => {
  const token = req.cookies?.gdvnc_token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const payload = await verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });
  req.user = payload;
  next();
};

export const requireAdmin = async (req: any, res: any, next: any) => {
  const token = req.cookies?.gdvnc_token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const payload = await verifyToken(token);
  if (!payload || (payload.role !== 'ADMIN' && payload.role !== 'SUPER_ADMIN')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  req.user = payload;
  next();
};
