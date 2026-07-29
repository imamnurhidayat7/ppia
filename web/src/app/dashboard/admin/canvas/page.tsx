'use client';

/**
 * Canvas — the single editor for the homepage.
 *
 * The canvas shows the real homepage inside an iframe and all editing happens
 * in the inspector on the right.
 *
 * Why not edit directly on the canvas? This screen used to render a simplified
 * copy of each section (`EditableHero`, `EditableAbout`, and a generic fallback
 * for the rest). That copy drifted from the components that actually ship: the
 * hero statistic bound its number to `title` and its label to `subtitle`, while
 * the public hero reads the number from `content` and the label from `title`.
 * An editor could change a statistic here, see it change, save, then find the
 * real page unchanged — the two surfaces wrote and read different fields.
 *
 * By rendering the published page there is only one renderer, so "what the CMS
 * shows" and "what a visitor sees" cannot differ. The contract for the fields
 * the inspector writes is documented in `lib/section-schemas.ts`.
 *
 * Content is saved once, not per language. The editor writes the base fields and
 * the public site shows them to all visitors.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useEditableCanvas } from '@/lib/editable-canvas-context';
import { CanvasSidebar } from '@/components/admin/CanvasSidebar';
import { EditorShell } from '@/components/admin/EditorShell';
import { AccessDenied, EmptyBlock, PageLoading } from '@/components/dashboard';
import SectionContentForm from '../landing-page/_components/SectionContentForm';
import { MousePointer2 } from 'lucide-react';

/** Friendly names shown in the rail and inspector title. */
const SECTION_TITLE: Record<string, string> = {
  hero: 'Hero',
  about: 'About',
  partners: 'Partners',
  testimonials: 'Testimonials',
  video: 'Video',
  events: 'Events',
  articles: 'Articles',
  faq: 'FAQ',
  membership: 'Membership',
};

export default function CanvasEditorPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const { loadSections, sections, activeKey } = useEditableCanvas();

  const [formDirty, setFormDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  // Page content is Super Admin only: every write route on /landing-sections is
  // gated to SUPER_ADMIN, so admitting BOARD here produced an editor whose
  // saves all failed with 403.
  const canManage = user?.role === 'SUPER_ADMIN';

  /**
   * The inspector form has its own save logic; its function is handed up here so
   * the toolbar button and Ctrl+S commit the same changes.
   */
  const saveRef = useRef<(() => Promise<void>) | null>(null);
  const registerSave = useCallback((fn: (() => Promise<void>) | null) => {
    saveRef.current = fn;
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Sections load on mount; their state is managed inside the context, not here.
  useEffect(() => {
    if (user && canManage) {
      loadSections();
    }
  }, [user, canManage, loadSections]);

  // Warn before leaving the page with unsaved changes.
  useEffect(() => {
    if (!formDirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [formDirty]);

  const handleSave = useCallback(async () => {
    if (!saveRef.current) return;
    setSaving(true);
    try {
      await saveRef.current();
      // The homepage is ISR-cached, so drop the cached copy before reloading the
      // preview — otherwise both the iframe and the live site keep serving the
      // old content for up to the revalidate window.
      try {
        const token = api.getToken();
        if (token) {
          await fetch('/api/revalidate', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ paths: ['/'] }),
          });
        }
      } catch {
        // The content is saved either way; a failed purge only means the public
        // page updates on its own schedule instead of instantly.
      }
      // Reload the section records, then refresh the iframe so the preview
      // reflects what was just written.
      await loadSections();
      setPreviewKey((value) => value + 1);
    } finally {
      setSaving(false);
    }
  }, [loadSections]);

  if (isLoading) {
    return <PageLoading label="Preparing the homepage editor…" />;
  }

  if (!canManage) {
    return (
      <AccessDenied
        message="The homepage editor is limited to Super Admins."
        backHref="/dashboard"
      />
    );
  }

  const activeSection = activeKey ? sections[activeKey] : undefined;
  const activeLabel = activeSection
    ? SECTION_TITLE[activeSection.key] ?? activeSection.title ?? activeSection.key
    : 'No section selected';

  return (
    <EditorShell
      backHref="/dashboard/admin/pages"
      backLabel="Back to pages"
      title="Home"
      subtitle="/"
      isDirty={formDirty}
      isSaving={saving}
      onSave={handleSave}
      previewHref="/"
      previewRefreshKey={previewKey}
      canvasMode="preview"
      rail={<CanvasSidebar />}
      inspectorLabel="Section detail"
      inspector={
        <>
          <div className="flex h-11 shrink-0 items-center border-b border-[#DCE7F1] px-3 dark:border-slate-800">
            <div className="min-w-0">
              <p className="data-type text-[12px] font-bold uppercase leading-none ink-muted">
                Section detail
              </p>
              <p className="mt-0.5 truncate text-[12px] font-semibold ink-strong">
                {activeLabel}
              </p>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {activeSection ? (
              <SectionContentForm
                key={activeSection.id}
                section={activeSection}
                hideSaveButton
                onDirtyChange={setFormDirty}
                registerSave={registerSave}
                onSaved={() => loadSections()}
              />
            ) : (
              <EmptyBlock
                icon={MousePointer2}
                title="Select a section"
                description="Select a section in the left panel to edit its content: text, item lists, their order, and whether the section is shown."
                className="rounded-[4px] border-2 border-dashed border-[#DCE7F1] py-10 dark:border-slate-700"
              />
            )}
          </div>
        </>
      }
    />
  );
}
