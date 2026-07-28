'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';

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
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
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
            Welcome back to<br />the community
          </h2>
          <p className="mt-4 text-white/60 text-sm leading-relaxed">
            Sign in to access events, articles, and connect with fellow Indonesian students in Auckland.
          </p>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-[#F8FAFC]">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/">
              <Image src="/Logo-PPIA-2025-White.png" alt="PPIA Auckland" width={140} height={56} className="h-12 w-auto mx-auto invert" priority />
            </Link>
          </div>

          <div>
            <h1 className="text-2xl font-black text-[#0F1B33]" style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif' }}>Sign in</h1>
            <p className="text-[#64748B] mt-1.5 text-sm">Enter your credentials to continue</p>
          </div>

          {error && (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#0F1B33] mb-1.5">Email or username</label>
              <input
                id="email"
                type="text"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F1B33] outline-none transition-all placeholder:text-[#94A3B8] focus:border-[#E8231A] focus:ring-4 focus:ring-[#E8231A]/10"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="text-sm font-medium text-[#0F1B33]">Password</label>
                <Link href="/forgot-password" className="text-xs font-semibold text-[#E8231A] hover:underline">Forgot?</Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 pr-11 text-sm text-[#0F1B33] outline-none transition-all placeholder:text-[#94A3B8] focus:border-[#E8231A] focus:ring-4 focus:ring-[#E8231A]/10"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#0F1B33]" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="group w-full flex items-center justify-center gap-2 rounded-xl bg-[#E8231A] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(232,35,26,0.5)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-8px_rgba(232,35,26,0.6)] disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
            >
              {isLoading ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <>Sign in <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" /></>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-[#64748B]">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-semibold text-[#E8231A] hover:underline">Register</Link>
          </p>

          <div className="mt-10 text-center">
            <Link href="/" className="text-xs text-[#94A3B8] hover:text-[#64748B] transition-colors">← Back to home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
