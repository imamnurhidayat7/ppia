'use client';

import { DashboardShell } from './dashboard-shell';

interface DashboardChromeProps {
  children: React.ReactNode;
}

/**
 * Kept as a thin alias so existing routes keep working. The real chrome now
 * lives in DashboardShell (sidebar + topbar + breadcrumbs), which both the
 * member and admin sides share instead of maintaining two near-identical
 * headers.
 */
export function DashboardChrome({ children }: DashboardChromeProps) {
  return <DashboardShell>{children}</DashboardShell>;
}
