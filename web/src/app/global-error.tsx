"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Home, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen mesh-gradient flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Error Icon */}
        <div className="mb-8">
          <div className="w-24 h-24 rounded-full bg-[#E8231A]/10 flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-12 h-12 text-[#E8231A]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1
            className="font-black text-white text-3xl mb-2"
            style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
          >
            Something Went Wrong
          </h1>
          <p className="text-[#94A3B8]">
            We encountered an unexpected error. Please try again.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={reset}
            className="flex items-center gap-2 bg-[#E8231A] hover:bg-[#C41E16] text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-red-900/30 hover:-translate-y-1"
          >
            <RefreshCw size={18} />
            Try Again
          </button>
          <Link
            href="/"
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-semibold transition-all border border-white/20"
          >
            <Home size={18} />
            Back to Home
          </Link>
        </div>

        {/* Error Details (only in development) */}
        {process.env.NODE_ENV === "development" && (
          <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/10 text-left">
            <p className="text-[#64748B] text-xs font-mono">
              {error.message || "Unknown error"}
            </p>
            {error.digest && (
              <p className="text-[#64748B] text-xs font-mono mt-2">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
