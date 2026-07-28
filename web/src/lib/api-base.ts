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
