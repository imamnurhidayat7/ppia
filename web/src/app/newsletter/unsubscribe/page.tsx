'use client';

/**
 * Landing page for the unsubscribe link in a newsletter e-mail.
 *
 * The link arrives with the address and a signed token. This page calls the API
 * to act on it and reports the outcome — the recipient should never have to sign
 * in or find a settings screen to stop receiving mail.
 *
 * The request is made from here rather than having the e-mail point straight at
 * the API so the person lands on a real page instead of a JSON response.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, MailX, XCircle } from 'lucide-react';
import { API_ORIGIN as API_URL } from '@/lib/api-base';

type State =
  | { status: 'working' }
  | { status: 'done'; email: string }
  | { status: 'error'; message: string };

export default function NewsletterUnsubscribePage() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const token = searchParams.get('token');

  const [state, setState] = useState<State>({ status: 'working' });

  useEffect(() => {
    if (!email || !token) {
      setState({ status: 'error', message: 'This unsubscribe link is incomplete.' });
      return;
    }

    let cancelled = false;
    const params = new URLSearchParams({ email, token });

    fetch(`${API_URL}/api/newsletter/unsubscribe?${params.toString()}`)
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as {
          message?: string;
          email?: string;
          error?: string;
        };

        if (cancelled) return;

        if (response.ok) {
          setState({ status: 'done', email: payload.email || email });
        } else {
          setState({
            status: 'error',
            message: payload.error || 'We could not process this unsubscribe link.',
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({
            status: 'error',
            message: 'We could not reach the server. Please try again in a moment.',
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [email, token]);

  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-gradient-to-b from-gray-50 to-white px-6 py-16">
      <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-8 text-center shadow-lg">
        {state.status === 'working' && (
          <>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
            <h1 className="font-display text-xl font-bold text-navy">Processing…</h1>
            <p className="mt-2 text-sm text-gray-500">
              One moment while we update your preferences.
            </p>
          </>
        )}

        {state.status === 'done' && (
          <>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <h1 className="font-display text-xl font-bold text-navy">You are unsubscribed</h1>
            <p className="mt-2 text-sm text-gray-500">
              We will no longer send newsletter e-mails to{' '}
              <span className="font-semibold text-navy">{state.email}</span>.
            </p>
            <p className="mt-4 text-xs text-gray-400">
              This does not affect e-mails about your membership or events you register for.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center justify-center rounded-2xl bg-ppia-red px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ppia-red-dark"
            >
              Back to the website
            </Link>
          </>
        )}

        {state.status === 'error' && (
          <>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
              <XCircle className="h-6 w-6 text-ppia-red" />
            </div>
            <h1 className="font-display text-xl font-bold text-navy">
              We could not unsubscribe you
            </h1>
            <p className="mt-2 text-sm text-gray-500">{state.message}</p>
            <p className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
              <MailX className="h-3.5 w-3.5" />
              Reply to any of our e-mails and we will remove you manually.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex items-center justify-center rounded-2xl border-2 border-gray-200 px-5 py-2.5 text-sm font-semibold text-navy transition-colors hover:border-gray-300"
            >
              Back to the website
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
