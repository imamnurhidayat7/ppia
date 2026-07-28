/**
 * Supabase Storage access for uploaded files.
 *
 * Uploads used to be written to the API's local disk under `api/uploads` and
 * served statically. That does not survive on an ephemeral host (Render,
 * containers) and does not scale past one instance, so image uploads now go to
 * a Supabase Storage bucket and are referenced by their public URL.
 *
 * The service-role key is used because uploads happen server-side, after the
 * API's own auth and validation have run; it must never reach the browser.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Public bucket for images (event/article/avatar/poster). */
export const PUBLIC_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';

/** Private bucket for personal documents (registration proof). */
export const PRIVATE_BUCKET = process.env.SUPABASE_STORAGE_PRIVATE_BUCKET || 'PPIA_Private';

let cached: SupabaseClient | null = null;

export function isStorageConfigured(): boolean {
  return Boolean(url && serviceKey);
}

function client(): SupabaseClient {
  if (!isStorageConfigured()) {
    throw new Error(
      'Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
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
 * Upload a buffer to the public bucket and return its public URL.
 * `objectPath` is the key within the bucket, e.g. `1720000000-123.png`.
 */
export async function uploadPublicObject(
  objectPath: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const sb = client();
  const { error } = await sb.storage
    .from(PUBLIC_BUCKET)
    .upload(objectPath, buffer, { contentType, upsert: false });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return sb.storage.from(PUBLIC_BUCKET).getPublicUrl(objectPath).data.publicUrl;
}
