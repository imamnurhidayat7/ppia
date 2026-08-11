/**
 * Centralised secret resolution.
 *
 * No module reads `process.env.JWT_SECRET` directly. The fallback
 * `|| 'your-super-secret-jwt-key-change-this'` that used to live in three
 * files is gone: if the secret is not configured when first read, the call
 * throws. That is the only safe behaviour — a missing secret in production is
 * a configuration error, not a condition to paper over with a literal string
 * that lets anyone forge admin tokens.
 *
 * Resolution is **lazy** (deferred to first read) so that tests can set
 * `process.env.JWT_SECRET` after importing the module. Call
 * `assertSecretConfigured()` from the boot path to fail fast at startup.
 */

const MIN_LENGTH = 32;

let cached: string | null = null;

/**
 * Resolve and cache the JWT secret. Throws if unset or too short — never
 * returns a fallback. The `#` split mirrors the original newsletter-token
 * module, which lets a single secret carry a per-feature suffix.
 */
export function getJwtSecret(): string {
  if (cached) return cached;
  const value = (process.env.JWT_SECRET ?? '').split('#')[0].trim();
  if (!value) {
    throw new Error(
      'JWT_SECRET is not set. Add it to .env (see api/.env.example) before starting the API.'
    );
  }
  if (value.length < MIN_LENGTH) {
    throw new Error(
      `JWT_SECRET must be at least ${MIN_LENGTH} characters. Generate one with \`openssl rand -hex 32\`.`
    );
  }
  cached = value;
  return cached;
}

/**
 * Eagerly validate at startup. Call this from the boot path so the process
 * exits with a clear message before binding the port if the secret is missing.
 */
export function assertSecretConfigured(): void {
  getJwtSecret();
}

/**
 * The HMAC signing secret for local private-file signed URLs.
 * Shares the JWT secret — it is the only long-lived symmetric secret the
 * service already has.
 */
export function getSigningSecret(): string {
  return getJwtSecret();
}
