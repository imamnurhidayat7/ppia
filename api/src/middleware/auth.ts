import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
    divisionId?: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  let userId: string;
  try {
    const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET) as { userId?: string };
    if (!decoded.userId) throw new Error('Missing user ID');
    userId = decoded.userId;
  } catch {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  try {
    // Authorization data is deliberately refreshed on every request. JWTs live
    // for seven days, but role, division and approval changes must take effect
    // immediately rather than preserving stale privileges from the token.
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, divisionId: true, membershipStatus: true }
    });

    if (!user) {
      res.status(401).json({ error: 'User no longer exists' });
      return;
    }

    if (user.membershipStatus !== 'APPROVED') {
      res.status(403).json({
        error: 'Membership is not approved',
        status: user.membershipStatus
      });
      return;
    }

    req.user = {
      userId: user.id,
      role: user.role,
      ...(user.divisionId ? { divisionId: user.divisionId } : {})
    };
    next();
  } catch (error) {
    console.error('Authentication lookup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};
