'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Loader2 } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardRootLayout({ children }: DashboardLayoutProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Admin routes nest their own layout so the full-bleed editors can opt out
  // of the shell; everything else is wrapped here.
  const isAdminRoute = pathname?.startsWith('/dashboard/admin');

  // Redirect to login once the auth state resolves. AuthProvider starts with
  // isLoading = true on both server and client, so the loading branch below is
  // already hydration-stable without a separate `mounted` flag.
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#E8231A] mx-auto" />
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Loading…</p>
        </div>
      </div>
    );
  }

  // Not authenticated: render nothing while redirect happens
  if (!isAuthenticated || !user) {
    return null;
  }

  if (isAdminRoute) {
    return <>{children}</>;
  }

  return <DashboardShell view="member">{children}</DashboardShell>;
}
