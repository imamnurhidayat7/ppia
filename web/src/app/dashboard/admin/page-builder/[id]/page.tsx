'use client';

/**
 * Page Builder — retired.
 *
 * This CMS used to have two editors for the same job: a form-based Page Builder
 * for "standard" pages and Canvas for "custom" pages. Both edited overlapping
 * data with different capabilities, and only Page Builder could reach
 * `page.content` — so pages edited in Canvas looked unchanged on the public
 * site.
 *
 * Canvas is now the single editor. Everything this screen offered (structured
 * content form, SEO, publish button, advanced JSON) already lives in the Canvas
 * inspector. This route only translates a page id into a slug and forwards, so
 * old links and bookmarks keep working.
 */

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { Button } from '@/components/ui';
import {
  AccessDenied,
  EmptyBlock,
  PageHeading,
  PageLoading,
  PageStack,
  SectionCard,
} from '@/components/dashboard';
import { FileText, Wrench } from 'lucide-react';

export default function RetiredPageBuilder() {
  const params = useParams<{ id: string | string[] }>();
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();

  const rawId = params?.id;
  const pageId = typeof rawId === 'string' ? rawId : rawId?.[0];

  const [error, setError] = useState<string | null>(null);

  // CMS pages are site content, so both Super Admin and Board can open them.
  const canManage = user?.role === 'SUPER_ADMIN' || user?.role === 'BOARD';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const resolvePage = useCallback(async () => {
    if (!pageId) return;

    // "new" was the old page creation route; page creation now lives in the
    // pages list, which creates the record and hands it off to Canvas.
    if (pageId === 'new') {
      router.replace('/dashboard/admin/pages?create=1');
      return;
    }

    try {
      const data = (await api.getPageAdmin(pageId)) as { page?: { slug?: string } };
      if (data?.page?.slug) {
        router.replace(`/dashboard/admin/canvas/${data.page.slug}`);
      } else {
        setError('Page not found.');
      }
    } catch {
      setError('This page cannot be opened. Try again from the pages list.');
    }
  }, [pageId, router]);

  /* eslint-disable react-hooks/set-state-in-effect --
     resolvePage() only writes state after a network await; the linter cannot
     see past that call. */
  useEffect(() => {
    if (user && canManage) {
      resolvePage();
    }
  }, [user, canManage, resolvePage]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (isLoading) {
    return <PageLoading label="Opening the page editor…" />;
  }

  if (!canManage) {
    return (
      <AccessDenied
        message="The page editor is limited to Super Admins and Board members."
        backHref="/dashboard"
      />
    );
  }

  // Without an id there is nothing to forward — show the message directly.
  const message = !pageId ? 'Page not found.' : error;

  if (message) {
    return (
      <PageStack>
        <PageHeading
          eyebrow="Page editor"
          title="This page cannot be opened"
          description="Page Builder has been replaced by the single page editor."
          icon={Wrench}
          backHref="/dashboard/admin/pages"
          backLabel="Back to pages"
        />
        <SectionCard flush>
          <EmptyBlock
            icon={FileText}
            title={message}
            description="Open the page you want from the pages list, then continue in the editor."
            action={
              <Link href="/dashboard/admin/pages">
                <Button variant="primary">Go to pages</Button>
              </Link>
            }
          />
        </SectionCard>
      </PageStack>
    );
  }

  return <PageLoading label="Redirecting to the page editor…" />;
}
