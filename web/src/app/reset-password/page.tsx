'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import AuthShell, { AUTH_FIELD, AUTH_LABEL } from '@/components/auth/AuthShell';
import AuthNotice from '@/components/auth/AuthNotice';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Derived from the query string; no state or effect needed.
  const invalidToken = !token;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      await api.resetPassword(token!, password);
      setSuccess(true);
    } catch (err) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (invalidToken) {
    return (
      <AuthNotice
        eyebrow="Password reset"
        title="This link is not valid"
        icon={AlertCircle}
        tone="error"
        actions={[
          { label: 'Request a new link', href: '/forgot-password' },
          { label: 'Back to sign in', href: '/login', variant: 'secondary' },
        ]}
      >
        <p className="text-center">This password reset link is invalid or has expired.</p>
      </AuthNotice>
    );
  }

  if (success) {
    return (
      <AuthNotice
        eyebrow="Password reset"
        title="Password updated"
        icon={CheckCircle2}
        tone="success"
        actions={[{ label: 'Go to sign in', href: '/login' }]}
      >
        <p className="text-center">You can now sign in with your new password.</p>
      </AuthNotice>
    );
  }

  return (
    <div className="">
      <header>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="data-type accent-label text-[12px] font-bold uppercase">Password reset</p>
            <h1
              className="mt-2 text-2xl font-black ink-strong"
              style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
            >
              Choose a new password
            </h1>
          </div>
          <span
            aria-hidden="true"
            className="stamp-edge flex h-10 w-10 shrink-0 rotate-[-8deg] items-center justify-center rounded-[2px]"
            style={{ color: 'rgba(15,27,51,0.3)' }}
          >
            <Lock size={14} strokeWidth={2.5} className="ink-strong" />
          </span>
        </div>
        <p className="mt-3 text-[15px] ink-body">Use at least 6 characters.</p>
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
          <label htmlFor="password" className={AUTH_LABEL}>
            New password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${AUTH_FIELD} pr-12`}
              placeholder="Enter new password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-[3px] p-1 ink-muted transition-colors hover:ink-strong"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className={AUTH_LABEL}>
            Confirm password
          </label>
          <input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={AUTH_FIELD}
            placeholder="Confirm new password"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-[4px] bg-[#C41E16] px-4 py-3.5 text-[15px] font-semibold text-white shadow-[0_12px_30px_-12px_rgba(196,30,22,0.7)] transition-all hover:-translate-y-0.5 hover:bg-[#A81812] disabled:translate-y-0 disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" aria-hidden="true" />
              Resetting…
            </>
          ) : (
            'Reset password'
          )}
        </button>
      </form>

      <span aria-hidden="true" className="rope-rule mt-7 block opacity-70" />

      <p className="mt-5 text-center text-[15px] ink-body">
        <Link href="/login" className="accent-label font-semibold hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell
      eyebrow="Account recovery"
      headline={
        <>
          Set a new
          <br />
          password
        </>
      }
      blurb="Pick something you have not used elsewhere. You will be signed in with it from now on."
    >
      <Suspense
        fallback={
          <AuthNotice eyebrow="Please wait" title="Loading" icon={Loader2} tone="info">
            <p className="text-center">Preparing the reset form.</p>
          </AuthNotice>
        }
      >
        <ResetPasswordContent />
      </Suspense>
    </AuthShell>
  );
}
