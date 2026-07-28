'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';
import { ArrowLeft, Loader2, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';

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
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left — branding panel */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden mesh-gradient items-center justify-center p-12">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="relative z-10 max-w-md text-center">
          <Image src="/Logo-PPIA-2025-White.png" alt="PPIA Auckland" width={200} height={80} className="h-16 w-auto mx-auto mb-10" priority />
          <h2 className="text-3xl font-black text-white leading-tight" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>
            Reset your password
          </h2>
          <p className="mt-4 text-white/60 text-sm leading-relaxed">
            We&apos;ll send a link to your email so you can choose a new one.
          </p>
        </div>
      </div>

      {/* Right */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-[#F8FAFC]">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <Link href="/"><Image src="/Logo-PPIA-2025-White.png" alt="PPIA Auckland" width={140} height={56} className="h-12 w-auto mx-auto invert" priority /></Link>
          </div>

          {success ? (
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 size={32} className="text-emerald-600" />
              </div>
              <h1 className="text-2xl font-black text-[#0F1B33]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>Check your email</h1>
              <p className="mt-3 text-sm text-[#64748B] leading-relaxed">
                If an account exists for <strong className="text-[#0F1B33]">{email}</strong>, we&apos;ve sent a password reset link.
              </p>
              <Link href="/login" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#E8231A] hover:underline">
                <ArrowLeft size={16} /> Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[#E8231A]/10">
                <Mail size={22} className="text-[#E8231A]" />
              </div>
              <h1 className="text-2xl font-black text-[#0F1B33]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>Forgot password?</h1>
              <p className="text-[#64748B] mt-1.5 text-sm">Enter your email and we&apos;ll send a reset link.</p>

              {error && (
                <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-[#0F1B33] mb-1.5">Email address</label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F1B33] outline-none transition-all placeholder:text-[#94A3B8] focus:border-[#E8231A] focus:ring-4 focus:ring-[#E8231A]/10"
                    placeholder="you@example.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#E8231A] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(232,35,26,0.5)] transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0"
                >
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Send reset link'}
                </button>
              </form>

              <div className="mt-8 text-center">
                <Link href="/login" className="inline-flex items-center gap-2 text-sm text-[#64748B] hover:text-[#0F1B33] transition-colors">
                  <ArrowLeft size={16} /> Back to sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
