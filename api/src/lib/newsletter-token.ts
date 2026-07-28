/**
 * One-click unsubscribe links.
 *
 * A bulk e-mail has to carry a working unsubscribe link — it is what separates a
 * newsletter from spam, and mailbox providers weigh its absence when deciding
 * whether to deliver at all.
 *
 * The token is an HMAC of the address rather than a stored random value, so this
 * needed no schema change and no cleanup job. Consequences of that choice, both
 * acceptable here:
 *
 *   - It does not expire. Unsubscribing is not a privileged action, so a link
 *     that keeps working years later is a feature.
 *   - Rotating JWT_SECRET invalidates every previously mailed link. Recipients
 *     can still unsubscribe from the site, so the outcome is inconvenience
 *     rather than a trap.
 *
 * What it does prevent is the thing that matters: unsubscribing somebody else by
 * guessing their address.
 */
import crypto from 'crypto';

/** Namespaced so a token cannot be replayed against a different feature. */
const PURPOSE = 'newsletter-unsubscribe';

const secret = (): string => {
  const value = (process.env.JWT_SECRET || '').split('#')[0].trim();
  if (!value) {
    // Signing with a predictable key would let anyone forge links, so refuse.
    throw new Error('JWT_SECRET must be set to generate unsubscribe links');
  }
  return value;
};

/** Addresses are compared case-insensitively, so sign the normalised form. */
const canonical = (email: string): string => email.trim().toLowerCase();

export const unsubscribeToken = (email: string): string =>
  crypto
    .createHmac('sha256', secret())
    .update(`${PURPOSE}:${canonical(email)}`)
    .digest('hex')
    .slice(0, 32);

/**
 * Check a token against an address.
 *
 * Uses a constant-time comparison so the response time cannot be used to
 * discover a valid token one character at a time.
 */
export const verifyUnsubscribeToken = (email: string, token: string): boolean => {
  if (!email || !token) return false;

  const expected = Buffer.from(unsubscribeToken(email));
  const provided = Buffer.from(token);

  // timingSafeEqual throws on a length mismatch, which would itself leak.
  if (expected.length !== provided.length) return false;
  return crypto.timingSafeEqual(expected, provided);
};

/** Absolute unsubscribe URL to embed in a message. */
export const unsubscribeUrl = (email: string, frontendUrl: string): string => {
  const params = new URLSearchParams({
    email: canonical(email),
    token: unsubscribeToken(email),
  });
  return `${frontendUrl.replace(/\/+$/, '')}/newsletter/unsubscribe?${params.toString()}`;
};
