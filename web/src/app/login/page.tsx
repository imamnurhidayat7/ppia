'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { AlertCircle, ArrowRight, Eye, EyeOff, Anchor } from 'lucide-react';
import AuthShell, { AUTH_FIELD, AUTH_LABEL } from '@/components/auth/AuthShell';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.replace(user.role === 'SUPER_ADMIN' || user.role === 'BOARD' ? '/dashboard/admin' : '/dashboard');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      // The API client rejects with a parsed ApiError ({ message }); fall back
      // to the raw axios shape and a generic line just in case.
      const apiErr = err as { message?: string; response?: { data?: { error?: string } } };
      setError(
        apiErr.message || apiErr.response?.data?.error || 'Login failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Members"
      headline={
        <>
          Welcome back
          <br />
          aboard
        </>
      }
      blurb="Sign in to reach events, articles, and the community of Indonesian students in Auckland."
    >
      {/* The form is a boarding document: a white sheet with a stamped header,
          so the fields are the highest-contrast thing on the page. */}
      <div className="">
        <header>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="data-type accent-label text-[12px] font-bold uppercase">Sign in</p>
              <h1
                className="mt-2 text-2xl font-black ink-strong"
                style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
              >
                Members&apos; entrance
              </h1>
            </div>
            <span
              aria-hidden="true"
              className="stamp-edge flex h-10 w-10 shrink-0 rotate-[-8deg] items-center justify-center rounded-[2px]"
              style={{ color: 'rgba(15,27,51,0.3)' }}
            >
              <Anchor size={14} strokeWidth={2.5} className="ink-strong" />
            </span>
          </div>
          <span aria-hidden="true" className="rope-rule mt-5 block opacity-70" />
        </header>

        {error && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-3 rounded-[4px] border border-[#F3C9C6] bg-[#FEF2F1] px-4 py-3 text-[14px]"
            style={{ color: '#8F120D' }}
          >
            <AlertCircle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label htmlFor="email" className={AUTH_LABEL}>
              Email or username
            </label>
            <input
              id="email"
              type="text"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={AUTH_FIELD}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <label htmlFor="password" className={`${AUTH_LABEL} mb-0`}>
                Password
              </label>
              <Link
                href="/forgot-password"
                className="data-type accent-label text-[12px] font-bold uppercase hover:underline"
              >
                Forgot?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${AUTH_FIELD} pr-12`}
                placeholder="Your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-[3px] p-1 ink-muted transition-colors hover:ink-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C41E16]"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="group flex w-full items-center justify-center gap-2 rounded-[4px] bg-[#C41E16] px-4 py-3.5 text-[15px] font-semibold text-white shadow-[0_12px_30px_-12px_rgba(196,30,22,0.7)] transition-all hover:-translate-y-0.5 hover:bg-[#A81812] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C41E16] disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none"
          >
            {isLoading ? (
              <>
                <span
                  aria-hidden="true"
                  className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white"
                />
                Signing in…
              </>
            ) : (
              <>
                Sign in
                <ArrowRight size={17} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </form>

        <span aria-hidden="true" className="rope-rule mt-7 block opacity-70" />

        <p className="mt-5 text-center text-[15px] ink-body">
          Not a member yet?{' '}
          <Link href="/register" className="accent-label font-semibold hover:underline">
            Register
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
