import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { getJwtSecret } from '../lib/secrets';

/** Pin HS256 — defends against algorithm-confusion attacks if the key type ever changes. */
const ALLOWED_ALGORITHMS: jwt.Algorithm[] = ['HS256'];

/** Name of the HttpOnly cookie that carries the JWT. */
export const AUTH_COOKIE_NAME = 'ppia_token';

/** Read the JWT from the Authorization header or the HttpOnly cookie. */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
  if (typeof cookieToken === 'string' && cookieToken.length > 0) {
    return cookieToken;
  }
  return null;
}

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

  // Optional-auth path: a missing/invalid token is not fatal, the request
  // proceeds as a guest. Errors are swallowed on purpose.
  let userId: string;
  try {
    const decoded = jwt.verify(authHeader.slice(7), getJwtSecret(), {
      algorithms: ALLOWED_ALGORITHMS,
    }) as { userId?: string };
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

/**
 * Attach the signed-in user when a valid token is present, otherwise continue
 * as a guest.
 *
 * For endpoints that anyone may call but that behave differently for members —
 * event registration links to the member's account and pre-fills from their
 * profile, while a guest supplies their own details. A bad or expired token is
 * treated as "not signed in" rather than an error, so a stale token in a
 * browser cannot block a public action.
 */
export const optionalAuthenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
  if (!authHeader?.startsWith('Bearer ') && !cookieToken) {
    next();
    return;
  }

  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : cookieToken;

  // Optional-auth path: a missing/invalid token is not fatal, the request
  // proceeds as a guest. Errors are swallowed on purpose.
  let userId: string;
  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      algorithms: ALLOWED_ALGORITHMS,
    }) as { userId?: string };
    if (decoded.userId) {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, role: true, divisionId: true, membershipStatus: true }
      });
      // Only an approved member acts as themselves; anyone else is a guest.
      if (user && user.membershipStatus === 'APPROVED') {
        req.user = {
          userId: user.id,
          role: user.role,
          ...(user.divisionId ? { divisionId: user.divisionId } : {})
        };
      }
    }
  } catch {
    // Ignore: proceed as a guest.
  }
  next();
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
