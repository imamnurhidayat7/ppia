'use client';

import { usePathname } from 'next/navigation';
import { DashboardChrome } from '@/components/dashboard/dashboard-chrome';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // The page editor is a full-bleed workspace, not a document inside the
  // dashboard container. DashboardChrome constrains its children to
  // `max-w-7xl px-6 py-10`, which squeezed the three-column editor into a
  // narrow column and left large empty gutters. Editors opt out and render
  // their own chrome instead (see EditorShell).
  const isEditorRoute = pathname?.startsWith('/dashboard/admin/canvas');

  if (isEditorRoute) return <>{children}</>;

  return <DashboardChrome>{children}</DashboardChrome>;
}
