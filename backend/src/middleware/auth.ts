import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'rackd-secret-key-change-in-production';

export interface AuthUser {
  id: number;
  email: string;
  role: string;
  is_super_admin: boolean;
  permissions: Record<string, boolean>;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function generateToken(payload: {
  id: number;
  email: string;
  role: string;
  is_super_admin: boolean;
  permissions: Record<string, boolean>;
}): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
