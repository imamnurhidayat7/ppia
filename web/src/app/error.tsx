"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

/**
 * Route-level error boundary for every public page.
 *
 * `global-error.tsx` only catches failures in the root layout, so before this
 * existed any thrown error inside a page fell through to Next's unstyled
 * default screen.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <div className="min-h-screen mesh-gradient flex items-center justify-center px-4 py-20">
      <div className="text-center max-w-md">
        <div className="mb-8">
          <div className="w-24 h-24 rounded-full bg-[#E8231A]/10 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-11 h-11 text-[#E8231A]" strokeWidth={1.8} />
          </div>
          <h1
            className="font-black text-white text-3xl mb-2"
            style={{ fontFamily: "var(--font-poppins), Poppins, sans-serif" }}
          >
            Something Went Wrong
          </h1>
          {/*
            The message is deliberately generic. `error.message` can carry
            internal details (stack hints, query fragments), so only the digest
            is surfaced — it is a safe identifier to quote to us.
          */}
          <p className="text-[#94A3B8]">
            This page ran into an unexpected problem. You can try again, or head
            back to the home page.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={reset}
            className="flex items-center gap-2 bg-[#E8231A] hover:bg-[#C41E16] text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-red-900/30 hover:-translate-y-1"
          >
            <RefreshCw size={18} />
            Try again
          </button>
          <Link
            href="/"
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-semibold transition-all border border-white/20"
          >
            <Home size={18} />
            Back to Home
          </Link>
        </div>

        {error.digest && (
          <div className="mt-10 pt-8 border-t border-white/10">
            <p className="text-[#94A3B8] text-xs">
              Reference ID for support:{" "}
              <span className="font-mono text-[#94A3B8]">{error.digest}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
