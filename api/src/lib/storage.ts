/**
 * Storage for uploaded files, with two interchangeable drivers.
 *
 *   local     — files are written under `api/uploads` (public) and
 *               `api/storage/private` (personal documents). Intended for local
 *               development: no external account, no network, and uploads
 *               survive a restart.
 *   supabase  — files go to Supabase Storage buckets. Intended for deployment,
 *               where the host filesystem is ephemeral and may be replicated
 *               across instances.
 *
 * The driver is chosen by STORAGE_DRIVER. When unset it is inferred: Supabase
 * if its credentials are present, otherwise local. That means a fresh checkout
 * with no Supabase keys uploads to disk instead of failing with "file storage is
 * not configured".
 *
 * Private objects are deliberately stored OUTSIDE the statically served
 * `uploads` directory. Putting them in a subfolder of it would make every
 * registration document readable at a guessable URL.
 */
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Public bucket for images (event/article/avatar/poster). */
export const PUBLIC_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';

/** Private bucket for personal documents (registration proof). */
export const PRIVATE_BUCKET = process.env.SUPABASE_STORAGE_PRIVATE_BUCKET || 'PPIA_Private';

export type StorageDriver = 'local' | 'supabase';

const supabaseCredentialsPresent = Boolean(url && serviceKey);

function resolveDriver(): StorageDriver {
  const configured = (process.env.STORAGE_DRIVER || '').split('#')[0].trim().toLowerCase();
  if (configured === 'local' || configured === 'supabase') return configured;
  return supabaseCredentialsPresent ? 'supabase' : 'local';
}

export const STORAGE_DRIVER: StorageDriver = resolveDriver();

/**
 * Where the local driver keeps files. Both paths are gitignored.
 *
 * Anchored to the process working directory rather than to `__dirname`: the API
 * runs from source under tsx in development and from `dist/` in production, so
 * a path relative to this file would land in two different places.
 * STORAGE_LOCAL_DIR overrides the base when needed.
 */
const LOCAL_BASE_DIR = path.resolve(
  (process.env.STORAGE_LOCAL_DIR || '').split('#')[0].trim() || process.cwd()
);
const LOCAL_PUBLIC_DIR = path.join(LOCAL_BASE_DIR, 'uploads');
const LOCAL_PRIVATE_DIR = path.join(LOCAL_BASE_DIR, 'storage/private');

/** Surfaced at boot so an operator can see exactly where uploads land. */
export const LOCAL_STORAGE_PATHS = { public: LOCAL_PUBLIC_DIR, private: LOCAL_PRIVATE_DIR };

const API_URL = (process.env.API_URL || 'http://localhost:4000')
  .split('#')[0]
  .trim()
  .replace(/\/+$/, '');

const SIGNING_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this';

let cached: SupabaseClient | null = null;

/**
 * Can the server accept an upload at all?
 *
 * True for the local driver unconditionally, and for Supabase only once its
 * credentials are set.
 */
export function isStorageConfigured(): boolean {
  return STORAGE_DRIVER === 'local' ? true : supabaseCredentialsPresent;
}

function client(): SupabaseClient {
  if (!supabaseCredentialsPresent) {
    throw new Error(
      'Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or set STORAGE_DRIVER=local.'
    );
  }
  if (!cached) {
    cached = createClient(url as string, serviceKey as string, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}

/**
 * Reject anything that could escape the storage directory.
 *
 * Keys are generated server-side today, but this is the one place a bad key
 * would turn into an arbitrary filesystem write or read.
 */
export function isSafeObjectKey(key: string): boolean {
  if (!key || key.length > 300) return false;
  if (key.startsWith('/') || key.includes('\\') || key.includes('\0')) return false;
  if (key.split('/').some((part) => part === '' || part === '.' || part === '..')) return false;
  return /^[A-Za-z0-9._/-]+$/.test(key);
}

async function writeLocal(baseDir: string, objectPath: string, buffer: Buffer): Promise<void> {
  if (!isSafeObjectKey(objectPath)) throw new Error('Invalid object key');
  const target = path.join(baseDir, objectPath);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, buffer, { flag: 'wx' });
}

/**
 * Upload a buffer to public storage and return a URL the browser can load.
 * `objectPath` is the key, e.g. `1720000000-123.png`.
 */
export async function uploadPublicObject(
  objectPath: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  if (STORAGE_DRIVER === 'local') {
    await writeLocal(LOCAL_PUBLIC_DIR, objectPath, buffer);
    // Served by the static handler mounted at /uploads in index.ts.
    return `${API_URL}/uploads/${objectPath}`;
  }

  const sb = client();
  const { error } = await sb.storage
    .from(PUBLIC_BUCKET)
    .upload(objectPath, buffer, { contentType, upsert: false });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return sb.storage.from(PUBLIC_BUCKET).getPublicUrl(objectPath).data.publicUrl;
}

/**
 * Upload a buffer to private storage and return its object key (NOT a URL).
 * Callers hand the key to `createPrivateSignedUrl` when somebody authorised
 * needs to view the file.
 */
export async function uploadPrivateObject(
  objectPath: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  if (STORAGE_DRIVER === 'local') {
    await writeLocal(LOCAL_PRIVATE_DIR, objectPath, buffer);
    return objectPath;
  }

  const sb = client();
  const { error } = await sb.storage
    .from(PRIVATE_BUCKET)
    .upload(objectPath, buffer, { contentType, upsert: false });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return objectPath;
}

/** HMAC over the key and expiry, so a local link cannot be forged or extended. */
function signLocalKey(objectPath: string, expiresAt: number): string {
  return crypto
    .createHmac('sha256', SIGNING_SECRET)
    .update(`${objectPath}:${expiresAt}`)
    .digest('hex');
}

/** Verify a local signed link. Constant-time comparison, expiry enforced. */
export function verifyLocalSignature(
  objectPath: string,
  expiresAt: number,
  signature: string
): boolean {
  if (!Number.isFinite(expiresAt) || expiresAt * 1000 < Date.now()) return false;
  if (!isSafeObjectKey(objectPath)) return false;

  const expected = Buffer.from(signLocalKey(objectPath, expiresAt), 'utf8');
  const provided = Buffer.from(signature || '', 'utf8');
  if (expected.length !== provided.length) return false;
  return crypto.timingSafeEqual(expected, provided);
}

/** Absolute path of a private object, for the local driver's read route. */
export function localPrivatePath(objectPath: string): string {
  return path.join(LOCAL_PRIVATE_DIR, objectPath);
}

/**
 * Create a short-lived link to a private object. Returns null when the object
 * cannot be signed (unconfigured storage, or a key that no longer exists).
 */
export async function createPrivateSignedUrl(
  objectPath: string,
  expiresInSeconds = 120
): Promise<string | null> {
  if (!isSafeObjectKey(objectPath)) return null;

  if (STORAGE_DRIVER === 'local') {
    try {
      await fs.access(localPrivatePath(objectPath));
    } catch {
      return null;
    }
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const signature = signLocalKey(objectPath, expiresAt);
    const query = new URLSearchParams({ exp: String(expiresAt), sig: signature });
    return `${API_URL}/api/private-files/${objectPath}?${query.toString()}`;
  }

  if (!supabaseCredentialsPresent) return null;
  const { data, error } = await client()
    .storage.from(PRIVATE_BUCKET)
    .createSignedUrl(objectPath, expiresInSeconds);
  if (error) return null;
  return data?.signedUrl ?? null;
}
