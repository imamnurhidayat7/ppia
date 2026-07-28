'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';
import { Loader2, AlertCircle, CheckCircle2, Mail } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      // Use async IIFE to avoid synchronous setState in effect
      (async () => {
        setError('Verification token is missing');
        setIsLoading(false);
      })();
      return;
    }

    const verify = async () => {
      try {
        await api.verifyEmail(token);
        setSuccess(true);
      } catch (err) {
        const error = err as { response?: { data?: { error?: string } } };
        setError(error.response?.data?.error || 'Failed to verify email');
      } finally {
        setIsLoading(false);
      }
    };

    verify();
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen mesh-gradient flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <Loader2 size={48} className="animate-spin text-[#E8231A] mx-auto mb-4" />
          <p className="text-gray-600">Verifying your email...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen mesh-gradient flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="glass-light rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} className="text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-[#1A2B4A] mb-4">Verification Failed</h1>
            <p className="text-gray-600 mb-6">{error}</p>
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
        <div className="glass-light rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-[#1A2B4A] mb-4">Email Verified!</h1>
          <p className="text-gray-600 mb-6">
            Your email has been successfully verified. You can now access all features of PPIA Auckland.
          </p>
          <Link
            href="/dashboard"
            className="inline-block bg-[#E8231A] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#c91e16] transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen mesh-gradient flex items-center justify-center">
        <Loader2 size={48} className="animate-spin text-[#E8231A]" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
