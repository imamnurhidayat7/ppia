/**
 * Single source of truth for the backend base URL.
 *
 * IMPORTANT: `NEXT_PUBLIC_*` variables are inlined into the client bundle at
 * BUILD time, not read at runtime. To point the deployed frontend at a real
 * API, set `NEXT_PUBLIC_API_URL` in the hosting platform's environment
 * variables (on Vercel: Project → Settings → Environment Variables) and then
 * redeploy. Changing it later requires a rebuild.
 *
 * The `localhost:4000` fallback only applies to local development when the
 * variable is unset — it must match the API's dev port (see `api/.env` PORT).
 * A trailing slash is stripped so callers can safely build `${API_ORIGIN}/api`.
 */
export const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") || "http://localhost:4000";

/** Base URL for REST calls (the API mounts everything under `/api`). */
export const API_URL = `${API_ORIGIN}/api`;

/**
 * Extra image hosts the browser may load directly, as a comma-separated list
 * (e.g. a previous storage host kept alive during a migration transition).
 * Wired into the CSP `img-src` and the image optimizer allowlist so adding a
 * host is config, not a code edit.
 */
export const EXTRA_IMAGE_HOSTS: string[] = (process.env.NEXT_PUBLIC_IMAGE_HOSTS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/**
 * Public base URL under which stored file KEYS resolve to browser-loadable
 * URLs. Database rows keep the stable object key (e.g. `1720000000-123.png`);
 * this base turns it into a URL at display time, so moving file storage
 * (Supabase → Hostinger VPS, a CDN, …) is an env change, not a data rewrite.
 *
 * Must mirror the API's `PUBLIC_FILES_BASE_URL`. Defaults to the API's own
 * `/uploads` mount, which is correct for the local driver; deployments whose
 * files live elsewhere (Supabase Storage, a CDN) must set this explicitly and
 * rebuild — like all `NEXT_PUBLIC_*` variables it is inlined at build time.
 */
export const FILES_BASE_URL =
  process.env.NEXT_PUBLIC_FILES_BASE_URL?.replace(/\/+$/, "") || `${API_ORIGIN}/uploads`;
