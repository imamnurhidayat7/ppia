/**
 * Request rate limiting.
 *
 * Implemented in-process with a Map rather than pulling in `express-rate-limit`:
 * the behaviour needed here is a counter and an expiry, and a single-instance
 * Node process is what this API runs as today.
 *
 * The trade-off is deliberate and worth stating: counters live in memory, so
 * they reset on restart and are *per process*. Running several instances behind
 * a load balancer divides the effective limit by the number of instances. If the
 * API is ever scaled horizontally this must move to a shared store (Redis).
 *
 * Client identity comes from `req.ip`, which is only trustworthy when Express
 * knows about the proxy in front of it — see `TRUST_PROXY` in index.ts. Without
 * that, a forwarded header would let a caller pick its own bucket.
 */
import { Request, Response, NextFunction, RequestHandler } from 'express';

interface Counter {
  count: number;
  /** Epoch milliseconds at which this counter resets. */
  resetAt: number;
}

export interface RateLimitOptions {
  /** Length of the window in milliseconds. */
  windowMs: number;
  /** Requests allowed per key per window. */
  max: number;
  /** Message returned with the 429. */
  message?: string;
  /**
   * Bucket key. Defaults to the client address. Anything derived from the
   * request body must be normalised, and must always include the address, or a
   * caller could deliberately exhaust another account's bucket.
   */
  keyGenerator?: (req: Request) => string;
  /**
   * When true a 2xx/3xx response refunds the attempt, so only failures count.
   * Used for login: someone signing in correctly should never be throttled.
   */
  skipSuccessfulRequests?: boolean;
}

/** Read an env var, tolerating dotenv's inline comments. */
const readEnv = (key: string): string => (process.env[key] || '').split('#')[0].trim();

const isDisabled = (): boolean => {
  const value = readEnv('RATE_LIMIT_DISABLED').toLowerCase();
  return value === 'true' || value === '1' || value === 'yes';
};

/** Address of the caller, falling back to the raw socket. */
const clientAddress = (req: Request): string => req.ip || req.socket.remoteAddress || 'unknown';

/**
 * Every limiter gets its own store so limits never bleed across endpoints.
 * Expired entries are swept periodically; without it the map would grow with
 * every distinct address seen.
 */
const createStore = (windowMs: number) => {
  const store = new Map<string, Counter>();

  const sweep = () => {
    const now = Date.now();
    for (const [key, counter] of store) {
      if (counter.resetAt <= now) store.delete(key);
    }
  };

  // Sweep once per window, at least every minute. `unref` keeps the timer from
  // holding the process open (matters for tests and graceful shutdown).
  const timer = setInterval(sweep, Math.max(windowMs, 60_000));
  timer.unref?.();

  return store;
};

export const createRateLimiter = (options: RateLimitOptions): RequestHandler => {
  const {
    windowMs,
    max,
    message = 'Too many requests. Please try again later.',
    keyGenerator = clientAddress,
    skipSuccessfulRequests = false,
  } = options;

  const store = createStore(windowMs);

  return (req: Request, res: Response, next: NextFunction): void => {
    if (isDisabled()) {
      next();
      return;
    }

    const key = keyGenerator(req);
    const now = Date.now();
    const existing = store.get(key);

    let counter: Counter;
    if (!existing || existing.resetAt <= now) {
      counter = { count: 0, resetAt: now + windowMs };
      store.set(key, counter);
    } else {
      counter = existing;
    }

    const retryAfterSeconds = Math.max(1, Math.ceil((counter.resetAt - now) / 1000));

    if (counter.count >= max) {
      res.setHeader('RateLimit-Limit', String(max));
      res.setHeader('RateLimit-Remaining', '0');
      res.setHeader('RateLimit-Reset', String(retryAfterSeconds));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.status(429).json({ error: message, retryAfter: retryAfterSeconds });
      return;
    }

    counter.count += 1;

    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - counter.count)));
    res.setHeader('RateLimit-Reset', String(retryAfterSeconds));

    if (skipSuccessfulRequests) {
      res.on('finish', () => {
        if (res.statusCode < 400) {
          const current = store.get(key);
          if (current) current.count = Math.max(0, current.count - 1);
        }
      });
    }

    next();
  };
};

/**
 * Bucket on address plus the submitted identifier.
 *
 * Address alone lets one attacker's traffic throttle every user behind the same
 * NAT; identifier alone lets an attacker lock a chosen victim out. Combining the
 * two limits guessing against a single account from a single origin, which is
 * the shape of a credential-stuffing attempt.
 */
const addressAndBodyField = (field: string) => (req: Request): string => {
  const raw = (req.body as Record<string, unknown> | undefined)?.[field];
  const identifier = typeof raw === 'string' ? raw.trim().toLowerCase().slice(0, 200) : '';
  return `${clientAddress(req)}|${identifier}`;
};

const MINUTE = 60 * 1000;

/**
 * Sign-in attempts. Successful sign-ins are refunded, so a member typing a
 * password wrong a few times is unaffected while brute force is capped.
 */
export const loginLimiter = createRateLimiter({
  windowMs: 15 * MINUTE,
  max: 10,
  skipSuccessfulRequests: true,
  keyGenerator: addressAndBodyField('email'),
  message: 'Too many sign-in attempts. Please wait a few minutes and try again.',
});

/** Registration: cheap for us, but each one writes a row and sends an e-mail. */
export const registerLimiter = createRateLimiter({
  windowMs: 60 * MINUTE,
  max: 5,
  message: 'Too many registration attempts from this network. Please try again later.',
});

/**
 * Password reset requests. Each one sends mail to a third party, so an unbounded
 * endpoint is both an enumeration oracle and a way to use us to spam someone.
 */
export const passwordResetRequestLimiter = createRateLimiter({
  windowMs: 60 * MINUTE,
  max: 5,
  message: 'Too many password reset requests. Please try again later.',
});

/** Consuming a reset token — capped to stop token guessing. */
export const passwordResetLimiter = createRateLimiter({
  windowMs: 15 * MINUTE,
  max: 10,
  skipSuccessfulRequests: true,
  message: 'Too many attempts. Please request a new reset link.',
});

/** Verification e-mails, same reasoning as password reset requests. */
export const verificationLimiter = createRateLimiter({
  windowMs: 60 * MINUTE,
  max: 5,
  message: 'Too many verification e-mails requested. Please try again later.',
});

/**
 * Newsletter subscribe and other unauthenticated writes that create rows.
 */
export const publicWriteLimiter = createRateLimiter({
  windowMs: 15 * MINUTE,
  max: 20,
  message: 'Too many requests. Please slow down and try again shortly.',
});

export default createRateLimiter;
