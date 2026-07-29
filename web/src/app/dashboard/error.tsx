"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, LayoutDashboard, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";

/**
 * Route-level error boundary for the dashboard.
 *
 * Kept separate from the public one so a failure inside the dashboard keeps the
 * dashboard chrome and its light/dark palette instead of dropping the user onto
 * a dark marketing-styled screen.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      {/* Porthole frame rather than a tinted square, matching the marker the
          dashboard primitives use for a standalone icon. */}
      <span
        aria-hidden="true"
        className="mb-5 flex h-16 w-16 items-center justify-center rounded-full"
        style={{ boxShadow: 'inset 0 0 0 1px #F3C9C6, 0 0 0 5px rgba(176,24,18,0.10)' }}
      >
        <AlertTriangle className="h-7 w-7" style={{ color: '#B01812' }} />
      </span>
      <h2 className="font-display text-xl font-bold ink-strong">
        Something went wrong
      </h2>
      {/*
        `error.message` is not rendered on purpose: it can expose internal
        details. The digest below is the safe identifier to share with us.
      */}
      <p className="mt-2 max-w-md text-sm ink-body">
        This part of the dashboard failed to load. Try again, and if it keeps
        happening let us know with the reference below.
      </p>

      <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row">
        <Button variant="primary" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={reset}>
          Try again
        </Button>
        <Link href="/dashboard">
          <Button variant="secondary" leftIcon={<LayoutDashboard className="h-4 w-4" />}>
            Back to dashboard
          </Button>
        </Link>
      </div>

      {error.digest && (
        <div className="mt-8 w-full max-w-xs">
          <span aria-hidden="true" className="rope-rule mb-3 block opacity-60" />
          <p className="data-type text-[12px] ink-muted">
            Reference ID: <span className="font-bold">{error.digest}</span>
          </p>
        </div>
      )}
    </div>
  );
}
