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
      <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-danger-50 dark:bg-danger-900/30">
        <AlertTriangle className="h-8 w-8 text-danger-600 dark:text-danger-300" />
      </span>
      <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-50">
        Something went wrong
      </h2>
      {/*
        `error.message` is not rendered on purpose: it can expose internal
        details. The digest below is the safe identifier to share with us.
      */}
      <p className="mt-1.5 max-w-md text-sm text-slate-500 dark:text-slate-400">
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
        <p className="mt-8 text-xs text-slate-400 dark:text-slate-500">
          Reference ID: <span className="font-mono">{error.digest}</span>
        </p>
      )}
    </div>
  );
}
