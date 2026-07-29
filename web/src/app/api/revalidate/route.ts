/**
 * On-demand revalidation for the public pages.
 *
 * The homepage is ISR (`export const revalidate = 300`), so a CMS edit could
 * take up to five minutes to appear — which reads as "my change did not save".
 * The admin editor calls this route after a successful save to drop the cached
 * copy immediately.
 *
 * Purging a cache on request has to be authorised, otherwise anyone could force
 * a rebuild on every request. There is no session cookie in this app (the JWT
 * lives in localStorage), so the caller forwards its bearer token and this route
 * asks the API who it belongs to. Only a SUPER_ADMIN may revalidate, matching
 * the role that can edit the content in the first place.
 */
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { API_ORIGIN } from '@/lib/api-base';

/** Paths that render CMS content and are safe to purge together. */
const DEFAULT_PATHS = ['/'];

export async function POST(request: Request) {
  const auth = request.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let role: string | undefined;
  try {
    const meResponse = await fetch(`${API_ORIGIN}/api/auth/me`, {
      headers: { authorization: auth },
      cache: 'no-store',
    });
    if (!meResponse.ok) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const payload = (await meResponse.json()) as { user?: { role?: string } };
    role = payload.user?.role;
  } catch {
    // The API being unreachable is not the caller's fault, but it also means the
    // token cannot be verified — so refuse rather than purge on trust.
    return NextResponse.json({ error: 'Could not verify the session' }, { status: 503 });
  }

  if (role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  let paths = DEFAULT_PATHS;
  try {
    const body = (await request.json()) as { paths?: unknown };
    if (Array.isArray(body?.paths)) {
      // Only site-relative paths, so this cannot be pointed at another origin.
      const requested = body.paths.filter(
        (path): path is string => typeof path === 'string' && path.startsWith('/')
      );
      if (requested.length > 0) paths = requested;
    }
  } catch {
    // No body: fall back to the default paths.
  }

  for (const path of paths) {
    revalidatePath(path);
  }

  return NextResponse.json({ revalidated: true, paths });
}
