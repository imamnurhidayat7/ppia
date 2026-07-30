'use client';

/**
 * CanvasInspector — right-hand panel of the page editor.
 *
 * Holds everything that is not edited directly on the canvas:
 *   • Content  — schema-driven form for `page.content`, the object the public
 *                page actually renders. This is what makes public content
 *                editable without touching code.
 *   • SEO      — meta title / description with length counters and a preview.
 *   • Publish  — title, live toggle, address, summary, cover image.
 *   • Advanced — raw JSON escape hatch, SUPER_ADMIN only.
 *
 * These used to live on a separate Page Builder screen while the canvas edited
 * only blocks, so an editor could "save" a page and see nothing change on the
 * live site. Merging them removes that trap.
 */

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { AlertTriangle, Code2, FileText, Globe, Search, Settings2 } from 'lucide-react';
const ContentFormEditor = dynamic(
  () => import('@/components/admin/ContentFormEditor').then(m => m.ContentFormEditor),
  { ssr: false, loading: () => <div className="h-32 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" /> }
);
import { ImageUploader, Input, Textarea, Toggle } from '@/components/ui';
import type { FieldSchema } from '@/lib/content-schemas';

export type InspectorTab = 'content' | 'seo' | 'publish' | 'advanced';

interface CanvasInspectorProps {
  slug: string;
  title: string;
  excerpt: string;
  featuredImage: string;
  metaTitle: string;
  metaDescription: string;
  published: boolean;
  /** Parsed `page.content` object */
  content: Record<string, unknown>;
  /** Schema for this page's template, empty when the page has none */
  schema: FieldSchema[];
  /** Raw JSON text used by the advanced tab */
  jsonText: string;
  jsonError: string | null;
  /** Only SUPER_ADMIN may edit raw JSON */
  canUseAdvanced: boolean;
  /** Controlled so the left rail can jump straight to the Content tab */
  tab: InspectorTab;
  onTabChange: (tab: InspectorTab) => void;
  onFieldChange: (patch: {
    title?: string;
    excerpt?: string;
    featuredImage?: string;
    metaTitle?: string;
    metaDescription?: string;
    published?: boolean;
  }) => void;
  onContentChange: (next: Record<string, unknown>) => void;
  onJsonChange: (text: string) => void;
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex-1 flex flex-col items-center gap-1 py-2 text-[11px] font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E8231A] ${
        active
          ? 'bg-white dark:bg-slate-700 text-[#C41E16] dark:text-red-300 shadow-sm'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function CharCount({ value, max }: { value: string; max: number }) {
  const over = value.length > max;
  return (
    <p
      className={`text-xs mt-1 ${
        over ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'
      }`}
    >
      {value.length}/{max} characters{over ? ' — too long, Google will truncate it' : ''}
    </p>
  );
}

export function CanvasInspector({
  slug,
  title,
  excerpt,
  featuredImage,
  metaTitle,
  metaDescription,
  published,
  content,
  schema,
  jsonText,
  jsonError,
  canUseAdvanced,
  tab,
  onTabChange,
  onFieldChange,
  onContentChange,
  onJsonChange,
}: CanvasInspectorProps) {
  const hasSchema = schema.length > 0;
  const effectiveMetaTitle = useMemo(() => metaTitle || title, [metaTitle, title]);

  return (
    // Width and height are owned by EditorShell so the panel can collapse.
    <div className="flex flex-col h-full min-h-0">
      {/* Tabs */}
      <div className="shrink-0 p-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
          <TabButton
            active={tab === 'content'}
            onClick={() => onTabChange('content')}
            icon={<FileText size={15} />}
            label="Content"
          />
          <TabButton
            active={tab === 'seo'}
            onClick={() => onTabChange('seo')}
            icon={<Search size={15} />}
            label="SEO"
          />
          <TabButton
            active={tab === 'publish'}
            onClick={() => onTabChange('publish')}
            icon={<Settings2 size={15} />}
            label="Publish"
          />
          {canUseAdvanced && (
            <TabButton
              active={tab === 'advanced'}
              onClick={() => onTabChange('advanced')}
              icon={<Code2 size={15} />}
              label="Advanced"
            />
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {/* ── Content ──────────────────────────────────────────── */}
        {tab === 'content' && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                These are the words and images shown on{' '}
                <span className="font-semibold font-mono">/{slug}</span>. Changes
                go live on the public page once you save.
              </p>
            </div>

            {hasSchema ? (
              <ContentFormEditor
                schema={schema}
                value={content}
                onChange={(next) => onContentChange(next)}
              />
            ) : (
              <div className="rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-6 text-center space-y-2">
                <AlertTriangle size={22} className="mx-auto text-amber-500" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  This page has no content form yet
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Its body is built from the blocks on the canvas.
                  {canUseAdvanced
                    ? ' To change the content structure, use the Advanced tab.'
                    : ' Ask a developer if you need new fields here.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── SEO ──────────────────────────────────────────────── */}
        {tab === 'seo' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Search engine title</label>
              <Input
                value={metaTitle}
                onChange={(e) => onFieldChange({ metaTitle: e.target.value })}
                placeholder={title || 'Page title'}
              />
              <CharCount value={effectiveMetaTitle} max={60} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Search engine description</label>
              <Textarea
                value={metaDescription}
                onChange={(e) => onFieldChange({ metaDescription: e.target.value })}
                placeholder="Summarise the page in one or two sentences."
                rows={4}
              />
              <CharCount value={metaDescription} max={160} />
            </div>

            {/* Google-style preview */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-800/60">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
                Search result preview
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 truncate">
                ppiauckland.org/{slug}
              </p>
              {/* Mirrors how Google renders the link, hence the blue title —
                  this is a preview of an external surface, not a UI accent. */}
              <p className="text-sm text-[#1a0dab] dark:text-[#8ab4f8] font-medium truncate">
                {effectiveMetaTitle || 'Page title'}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                {metaDescription || excerpt || 'No description yet.'}
              </p>
            </div>
          </div>
        )}

        {/* ── Publish ──────────────────────────────────────────── */}
        {tab === 'publish' && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1">Page title</label>
              <Input
                value={title}
                onChange={(e) => onFieldChange({ title: e.target.value })}
                placeholder="Page title"
              />
            </div>

            <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  Live on the public site
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {published
                    ? 'Anyone visiting the site can see this page.'
                    : 'Only admins can see this page.'}
                </p>
              </div>
              <Toggle
                checked={published}
                onChange={(e) => onFieldChange({ published: e.target.checked })}
                aria-label="Publish page"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Page address</label>
              <Input value={`/${slug}`} readOnly className="font-mono text-sm" />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Locked here so links already shared elsewhere keep working.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Short summary</label>
              <Textarea
                value={excerpt}
                onChange={(e) => onFieldChange({ excerpt: e.target.value })}
                placeholder="Used in page listings and link previews."
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Cover image</label>
              <ImageUploader
                value={featuredImage}
                onChange={(v) => onFieldChange({ featuredImage: v })}
              />
            </div>

            <a
              href={`/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Globe size={15} />
              Open the public page
            </a>
          </div>
        )}

        {/* ── Advanced (SUPER_ADMIN) ───────────────────────────── */}
        {tab === 'advanced' && canUseAdvanced && (
          <div className="space-y-3">
            <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 flex gap-2">
              <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                Technical mode. A malformed structure can leave the public page
                blank. Use the <strong>Content</strong> tab for everyday edits.
              </p>
            </div>
            <Textarea
              value={jsonText}
              onChange={(e) => onJsonChange(e.target.value)}
              rows={22}
              className={`font-mono text-xs ${jsonError ? 'border-red-500' : ''}`}
              placeholder={'{\n  "header": {\n    "title": "..."\n  }\n}'}
              aria-invalid={!!jsonError}
            />
            {jsonError ? (
              <p className="text-xs text-red-600 dark:text-red-400 font-mono">⚠ {jsonError}</p>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Valid JSON • {jsonText.length} characters
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default CanvasInspector;
