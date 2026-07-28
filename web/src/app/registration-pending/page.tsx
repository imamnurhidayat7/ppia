'use client';

import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle2, Clock, ArrowLeft, MessageCircle } from 'lucide-react';

export default function RegistrationPendingPage() {
  return (
    <div className="min-h-screen mesh-gradient flex items-center justify-center px-4 py-12">
      <div className="max-w-xl w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/">
            <Image
              src="/Logo-PPIA-2025-White.png"
              alt="PPIA Auckland"
              width={180}
              height={72}
              className="h-16 w-auto mx-auto"
              priority
            />
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 sm:p-10 text-center">
          {/* Success icon */}
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-9 h-9 text-green-600" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-navy-dark mb-3">
            Registration Submitted!
          </h1>
          <p className="text-gray-600 mb-6 leading-relaxed">
            Thank you for registering with PPIA Auckland. Your application has been received and is
            now <span className="font-semibold text-[#E8231A]">awaiting admin approval</span>.
          </p>

          {/* Pending notice */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-left mb-6">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <p className="font-medium mb-0.5">What happens next?</p>
              <p className="text-amber-800/90">
                Our admin team will review your application. Once approved, you&apos;ll be able to log
                in and join the PPIA WhatsApp community group.
              </p>
            </div>
          </div>

          {/* WhatsApp teaser */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 text-left mb-8">
            <MessageCircle className="w-5 h-5 text-[#25D366] shrink-0" />
            <p className="text-sm text-gray-700">
              After approval, you&apos;ll get access to the PPIA WhatsApp community group.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 bg-[#E8231A] text-white px-6 py-3 rounded-xl hover:bg-[#C41E16] transition-colors font-medium"
            >
              Back to Login
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-200 transition-colors font-medium"
            >
              <ArrowLeft size={18} />
              Back to Home
            </Link>
          </div>
        </div>

        <p className="text-center text-white/70 text-sm mt-6">
          Questions? Reach out via Instagram{' '}
          <a
            href="https://instagram.com/ppiauckland"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-white"
          >
            @ppiauckland
          </a>
        </p>
      </div>
    </div>
  );
}
