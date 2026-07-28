'use client';

/**
 * Menus and site settings.
 *
 * This route used to be a third content editor ("Landing Page CMS") with a
 * Sections tab that edited the same homepage record as Canvas. Homepage content
 * now has a single editor — Canvas — so what remains here is the site
 * configuration: navigation menus, header/footer, social links, and brand
 * colours.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Button, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import {
  AccessDenied,
  PageHeading,
  PageLoading,
  PageStack,
  SectionCard,
} from '@/components/dashboard';
import { ExternalLink, Menu as MenuIcon, Palette, Pencil, Settings } from 'lucide-react';
import MenuEditor from './_components/menu-editor';
import SettingsEditor from './_components/settings-editor';

export default function SiteSettingsPage() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('menus');

  // Site configuration touches every public page, so Super Admin only.
  const canManage = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return <PageLoading label="Loading site settings…" />;
  }

  if (!canManage) {
    return (
      <AccessDenied
        message="Site settings are limited to Super Admins."
        backHref="/dashboard"
      />
    );
  }

  return (
    <PageStack>
      <PageHeading
        eyebrow="Site configuration"
        title="Menus and site settings"
        description="Navigation, header, footer, social links, and brand colours."
        icon={Settings}
        backHref="/dashboard/admin"
        backLabel="Back to admin panel"
        actions={
          <a href="/" target="_blank" rel="noopener noreferrer">
            <Button variant="secondary" size="sm" leftIcon={<ExternalLink className="h-4 w-4" />}>
              View site
            </Button>
          </a>
        }
      />

      <SectionCard
        title="Looking for homepage text and images?"
        description="All page content is edited in the homepage editor, not here."
        icon={Palette}
      >
        <Link href="/dashboard/admin/canvas">
          <Button variant="primary" size="sm" leftIcon={<Pencil className="h-4 w-4" />}>
            Open homepage editor
          </Button>
        </Link>
      </SectionCard>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <TabsTrigger value="menus" className="flex items-center gap-2">
            <MenuIcon className="h-4 w-4" />
            <span>Navigation menu</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span>Header, footer, and colours</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="menus">
          <MenuEditor />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsEditor />
        </TabsContent>
      </Tabs>
    </PageStack>
  );
}
