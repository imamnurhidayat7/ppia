'use client';

/**
 * CanvasSidebar — the left rail of the homepage editor.
 *
 * Purely a navigator: list the sections, add one, remove one, choose which one
 * the inspector edits. Back navigation and saving live in EditorShell's top bar
 * so there is a single place to save and a single place to leave.
 *
 * Deleting a section is irreversible, so it goes through ConfirmModal rather
 * than the browser's native `confirm()` — the same dialog used everywhere else
 * in the dashboard.
 */

import { useState } from 'react';
import { useEditableCanvas } from '@/lib/editable-canvas-context';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import {
  Calendar,
  Image as ImageIcon,
  Layout,
  Loader2,
  Plus,
  Trash2,
  Type,
  Users,
  Video,
} from 'lucide-react';

const SECTION_ICONS: Record<string, React.ReactNode> = {
  hero: <Layout size={14} />,
  about: <Type size={14} />,
  partners: <Users size={14} />,
  testimonials: <Users size={14} />,
  video: <Video size={14} />,
  events: <Calendar size={14} />,
  articles: <ImageIcon size={14} />,
  faq: <Type size={14} />,
  membership: <Users size={14} />,
};

const SECTION_LABELS: Record<string, string> = {
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

/**
 * `label` names the section in this rail. `defaultTitle` is the copy written to
 * the record on creation — they differ where the section's `title` field is not
 * a heading. On the partners strip, for instance, `title` is the small line
 * printed above the logos, so seeding it with "Partners" would put the word
 * "Partners" on the page.
 */
const SECTION_PRESETS: {
  key: string;
  label: string;
  defaultTitle: string;
  icon: React.ReactNode;
}[] = [
  { key: 'hero', label: 'Hero banner', defaultTitle: 'Sailing together, growing together', icon: <Layout size={14} /> },
  { key: 'about', label: 'About', defaultTitle: 'What is PPIA Auckland?', icon: <Type size={14} /> },
  { key: 'partners', label: 'Partners', defaultTitle: 'Working alongside', icon: <Users size={14} /> },
  { key: 'testimonials', label: 'Testimonials', defaultTitle: 'What members say', icon: <Users size={14} /> },
  { key: 'video', label: 'Video', defaultTitle: 'Watch our story', icon: <Video size={14} /> },
  { key: 'events', label: 'Events', defaultTitle: 'Upcoming events', icon: <Calendar size={14} /> },
  { key: 'articles', label: 'Articles', defaultTitle: 'Latest articles', icon: <ImageIcon size={14} /> },
  { key: 'faq', label: 'FAQ', defaultTitle: 'Got questions?', icon: <Type size={14} /> },
  { key: 'membership', label: 'Membership', defaultTitle: 'Become part of the', icon: <Users size={14} /> },
];

/**
 * Rail order mirrors the order the sections appear in `app/page.tsx`, so the
 * list reads top-to-bottom the same way the page does.
 */
const SECTION_ORDER = ['hero', 'partners', 'about', 'video', 'events', 'testimonials', 'articles', 'faq', 'membership'];

export function CanvasSidebar() {
  const { sections, activeKey, setActiveKey, loading, addSection, deleteSection } =
    useEditableCanvas();
  const [adding, setAdding] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const sectionKeys = Object.keys(sections).sort((a, b) => {
    const ai = SECTION_ORDER.indexOf(a);
    const bi = SECTION_ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const existingKeys = new Set(sectionKeys);
  const availablePresets = SECTION_PRESETS.filter((p) => !existingKeys.has(p.key));

  const handleAddPreset = async (key: string, defaultTitle: string) => {
    setAdding(true);
    try {
      await addSection({ key, title: defaultTitle, order: sectionKeys.length });
    } finally {
      setAdding(false);
    }
  };

  const confirmDelete = async () => {
    const key = pendingDelete;
    setPendingDelete(null);
    if (!key) return;
    const section = sections[key];
    if (!section) return;
    await deleteSection(section.id, key);
  };

  const labelFor = (key: string) => SECTION_LABELS[key] ?? sections[key]?.title ?? key;

  return (
    <>
      {/* Rail header */}
      <div className="shrink-0 flex items-center h-11 px-3 border-b border-slate-200 dark:border-slate-800">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Sections
        </p>
      </div>

      {/* Section list */}
      <nav className="flex-1 min-h-0 overflow-y-auto p-2 space-y-0.5" aria-label="Sections">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={16} className="animate-spin text-slate-400" />
          </div>
        ) : sectionKeys.length === 0 ? (
          <p className="px-2 py-6 text-xs text-slate-400 text-center leading-relaxed">
            No sections are managed in the CMS yet. Add one from the list below.
          </p>
        ) : (
          sectionKeys.map((key) => {
            const isActive = activeKey === key;
            return (
              <div
                key={key}
                className={`group flex items-center gap-1 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-[#E8231A]/10'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveKey(key)}
                  aria-current={isActive ? 'true' : undefined}
                  className={`flex-1 flex items-center gap-2 h-9 px-2.5 text-left min-w-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E8231A] ${
                    isActive
                      ? 'text-[#C41E16] dark:text-red-300 font-semibold'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <span className={isActive ? 'text-[#E8231A]' : 'text-slate-400'}>
                    {SECTION_ICONS[key] ?? <Layout size={14} />}
                  </span>
                  <span className="truncate text-xs flex-1">{labelFor(key)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDelete(key)}
                  aria-label={`Delete ${labelFor(key)} section`}
                  title="Delete section"
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 mr-1 rounded-md text-slate-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })
        )}

        {/*
          Sections the homepage can render but which have no CMS record yet.
          These still appear on the live page — the components fall back to
          built-in default content — so leaving them out of this list made the
          page look editable when it was not. Listing them states the situation
          and offers the one action that fixes it.
        */}
        {!loading && availablePresets.length > 0 && (
          <div className="pt-3 mt-2 border-t border-slate-200 dark:border-slate-800">
            <p className="px-2.5 mb-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Not in the CMS yet
            </p>
            <p className="px-2.5 mb-2 text-[11px] leading-relaxed text-slate-400">
              These show built-in placeholder content on the live page. Add one to
              take control of what it says.
            </p>
            {availablePresets.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => handleAddPreset(preset.key, preset.defaultTitle)}
                disabled={adding}
                className="group w-full flex items-center gap-2 h-9 px-2.5 rounded-lg text-left text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E8231A]"
              >
                <span className="text-slate-300 dark:text-slate-600">{preset.icon}</span>
                <span className="flex-1 truncate text-xs">{preset.label}</span>
                {adding ? (
                  <Loader2 size={11} className="animate-spin text-slate-400" />
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#E8231A] opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
                    <Plus size={11} />
                    Add
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* Hint */}
      <div className="shrink-0 px-3 py-2.5 border-t border-slate-200 dark:border-slate-800">
        <p className="text-[11px] leading-relaxed text-slate-400">
          Select a section to edit it on the right. The canvas shows the live
          page, so it updates once you save.
        </p>
      </div>

      <ConfirmModal
        isOpen={pendingDelete !== null}
        title="Delete this section?"
        message={
          pendingDelete
            ? `The "${labelFor(pendingDelete)}" section and everything in it will be removed from the homepage. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete section"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}

export default CanvasSidebar;
