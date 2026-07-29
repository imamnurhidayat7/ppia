'use client';

import { useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Mail } from 'lucide-react';
import AuthShell, { AUTH_FIELD, AUTH_LABEL } from '@/components/auth/AuthShell';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await api.forgotPassword(email);
      setSuccess(true);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'Failed to send reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Account recovery"
      headline={
        <>
          Lost your
          <br />
          bearings?
        </>
      }
      blurb="We will send a link to your e-mail so you can set a new password."
    >
      <div className="">
        {success ? (
          <div className="text-center">
            <span
              aria-hidden="true"
              className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white"
              style={{ boxShadow: 'inset 0 0 0 1px #A7F3D0, 0 0 0 5px rgba(4,120,87,0.10)' }}
            >
              <CheckCircle2 size={30} className="text-[#047857]" />
            </span>
            <h1
              className="text-2xl font-black ink-strong"
              style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
            >
              Check your e-mail
            </h1>
            <span aria-hidden="true" className="rope-rule mx-auto mt-5 block w-24 opacity-70" />
            <p className="mt-5 text-[15px] leading-relaxed ink-body">
              If an account exists for <strong className="ink-strong">{email}</strong>, we have sent a password
              reset link.
            </p>
            <Link
              href="/login"
              className="accent-label mt-7 inline-flex items-center gap-2 text-[15px] font-semibold hover:underline"
            >
              <ArrowLeft size={16} aria-hidden="true" /> Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <header>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="data-type accent-label text-[12px] font-bold uppercase">Password reset</p>
                  <h1
                    className="mt-2 text-2xl font-black ink-strong"
                    style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}
                  >
                    Forgot password?
                  </h1>
                </div>
                <span
                  aria-hidden="true"
                  className="stamp-edge flex h-10 w-10 shrink-0 rotate-[-8deg] items-center justify-center rounded-[2px]"
                  style={{ color: 'rgba(15,27,51,0.3)' }}
                >
                  <Mail size={14} strokeWidth={2.5} className="ink-strong" />
                </span>
              </div>
              <p className="mt-3 text-[15px] ink-body">Enter your e-mail and we will send a reset link.</p>
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
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={AUTH_FIELD}
                  placeholder="you@example.com"
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
                    Sending…
                  </>
                ) : (
                  'Send reset link'
                )}
              </button>
            </form>

            <span aria-hidden="true" className="rope-rule mt-7 block opacity-70" />

            <p className="mt-5 text-center text-[15px] ink-body">
              Remembered it?{' '}
              <Link href="/login" className="accent-label font-semibold hover:underline">
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </AuthShell>
  );
}
