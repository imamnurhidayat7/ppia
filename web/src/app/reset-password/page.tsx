'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';
import { ArrowLeft, Loader2, Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Derive invalidToken from token - no need for state or effect
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
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (invalidToken) {
    return (
      <div className="min-h-screen mesh-gradient flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="glass-light rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} className="text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-[#1A2B4A] mb-4">Invalid Link</h1>
            <p className="text-gray-600 mb-6">
              This password reset link is invalid or has expired.
            </p>
            <Link
              href="/forgot-password"
              className="inline-block bg-[#E8231A] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#c91e16] transition-colors"
            >
              Request New Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen mesh-gradient flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="glass-light rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={32} className="text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-[#1A2B4A] mb-4">Password Reset!</h1>
            <p className="text-gray-600 mb-6">
              Your password has been successfully reset. You can now login with your new password.
            </p>
            <Link
              href="/login"
              className="inline-block bg-[#E8231A] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#c91e16] transition-colors"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen mesh-gradient flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <Image
              src="/Logo-PPIA-2025-White.png"
              alt="PPIA Auckland"
              width={160}
              height={64}
              className="h-14 w-auto"
              priority
            />
          </Link>
        </div>

        {/* Reset Password Card */}
        <div className="glass-light rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-[#E8231A]/10 flex items-center justify-center mx-auto mb-4">
              <Lock size={28} className="text-[#E8231A]" />
            </div>
            <h1 className="text-2xl font-bold text-navy-dark">Reset Password</h1>
            <p className="text-gray-500 mt-2">Enter your new password</p>
          </div>

          {error && (
            <div className="bg-red-100 border-2 border-red-400 text-red-800 px-5 py-4 rounded-xl mb-6 flex items-start gap-3">
              <AlertCircle className="flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-semibold">Error</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-navy-dark mb-2">
                New Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3.5 rounded-xl border-2 border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-white focus:border-[#E8231A] focus:bg-white focus:ring-2 focus:ring-[#E8231A]/20 transition-all outline-none"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-navy-dark mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3.5 rounded-xl border-2 border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-white focus:border-[#E8231A] focus:bg-white focus:ring-2 focus:ring-[#E8231A]/20 transition-all outline-none"
                  placeholder="Confirm new password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#E8231A] text-white font-bold py-4 rounded-xl hover:bg-[#c91e16] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Resetting...
                </>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <Link href="/login" className="text-gray-600 hover:text-[#E8231A] inline-flex items-center gap-2 font-medium transition-colors">
              <ArrowLeft size={18} />
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen mesh-gradient flex items-center justify-center">
        <Loader2 size={40} className="animate-spin text-[#E8231A]" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
