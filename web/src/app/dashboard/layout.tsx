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
      <div className="dash-shore min-h-screen flex items-center justify-center">
        <div className="text-center">
          {/* Porthole frame around the spinner, the same marker the rest of the
              dashboard uses for a standalone icon. */}
          <span
            aria-hidden="true"
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
            style={{ boxShadow: 'inset 0 0 0 1px rgba(11,28,46,0.14), 0 0 0 4px rgba(11,28,46,0.05)' }}
          >
            <Loader2 className="w-6 h-6 animate-spin text-[#E8231A]" />
          </span>
          <p className="mt-3 text-sm ink-body">Loading…</p>
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
