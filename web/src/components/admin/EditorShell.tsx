'use client';

/**
 * EditorShell — chrome for the page editor workspace.
 *
 * Layout contract
 * ---------------
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ Top bar (56px, fixed)                                    │
 *   ├────────────┬───────────────────────────────┬─────────────┤
 *   │ Left rail  │ Canvas                        │ Inspector   │
 *   │ 264px      │ flexible, scrolls             │ 360px       │
 *   └────────────┴───────────────────────────────┴─────────────┘
 *
 * Both side panels collapse from the toolbar.
 *
 * Colour rules for the whole editor:
 *   • Primary action  → PPIA red (#E8231A)
 *   • Surfaces        → white / slate-900
 *   • Chrome          → slate scale only
 *   • Status          → emerald (live) / amber (draft, unsaved) / red (danger)
 * Blue is deliberately not used for actions; it read as a second brand colour.
 *
 * UI language is English throughout. Content language is whatever the editor
 * types — the CMS has one set of content fields, not one per language.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Loader2,
  Monitor,
  PanelLeft,
  PanelRight,
  RefreshCw,
  Save,
  Smartphone,
  Tablet,
} from 'lucide-react';

export type EditorViewport = 'desktop' | 'tablet' | 'mobile';

/** Frame widths in CSS pixels. Desktop matches a common laptop viewport. */
const VIEWPORT_WIDTH: Record<EditorViewport, number> = {
  desktop: 1440,
  tablet: 834,
  mobile: 390,
};

const VIEWPORT_META: { key: EditorViewport; icon: ReactNode; label: string }[] = [
  { key: 'desktop', icon: <Monitor size={15} />, label: 'Desktop' },
  { key: 'tablet', icon: <Tablet size={15} />, label: 'Tablet' },
  { key: 'mobile', icon: <Smartphone size={15} />, label: 'Mobile' },
];

export interface EditorShellProps {
  /** Where the "back" arrow goes */
  backHref: string;
  backLabel: string;
  /** Page or surface being edited */
  title: string;
  /** Public path, shown as context under the title */
  subtitle?: string;
  /** Live / draft state of the thing being edited. Omit to hide the chip. */
  publishState?: 'published' | 'draft';
  /** Unsaved-changes indicator */
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => void;
  /** Public URL of the thing being edited */
  previewHref?: string;
  /** Bump to force the preview iframe to reload (e.g. after a save) */
  previewRefreshKey?: number;
  /** Extra controls placed left of the save button (undo/redo, etc.) */
  toolbarExtra?: ReactNode;
  /** Left rail content — section or block list */
  rail: ReactNode;
  /** Right panel content */
  inspector: ReactNode;
  inspectorLabel?: string;
  /**
   * How the canvas renders.
   *  • `frame`    — `children` are the real page markup, rendered at a fixed
   *                 viewport width and scaled to fit. Used for the homepage,
   *                 where sections are edited inline.
   *  • `preview`  — the published page is shown in an iframe. Used for pages
   *                 whose body is rendered by purpose-built React components
   *                 that cannot be edited in place; editing happens in the
   *                 inspector's Content tab.
   *  • `document` — `children` are an editor surface (a list of block forms).
   *                 No scaling: shrinking a form only makes it harder to read.
   */
  canvasMode?: 'frame' | 'preview' | 'document';
  /** The editable page itself (ignored in `preview` mode) */
  children?: ReactNode;
}

/** Segmented control used by the viewport switcher. */
function Segmented<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
}: {
  items: { key: T; label: string; icon?: ReactNode; title?: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800"
    >
      {items.map((item) => {
        const active = item.key === value;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            aria-pressed={active}
            title={item.title ?? item.label}
            className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E8231A] focus-visible:ring-offset-1 ${
              active
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {item.icon}
            <span className={item.icon ? 'hidden lg:inline' : ''}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function EditorShell({
  backHref,
  backLabel,
  title,
  subtitle,
  publishState,
  isDirty,
  isSaving,
  onSave,
  previewHref,
  previewRefreshKey = 0,
  toolbarExtra,
  rail,
  inspector,
  inspectorLabel = 'Inspector',
  canvasMode = 'frame',
  children,
}: EditorShellProps) {
  const isFrame = canvasMode === 'frame';
  const isPreview = canvasMode === 'preview';
  /** Both frame and preview render at a fixed width, so both get the switcher. */
  const usesViewport = isFrame || isPreview;

  const [railOpen, setRailOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [viewport, setViewport] = useState<EditorViewport>('desktop');
  const [scale, setScale] = useState(1);
  const [justSaved, setJustSaved] = useState(false);
  const [manualRefresh, setManualRefresh] = useState(0);

  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [frameHeight, setFrameHeight] = useState(0);

  const frameWidth = VIEWPORT_WIDTH[viewport];

  /** Fit the frame into the available width; never scale up past 1:1. */
  const recomputeScale = useCallback(() => {
    const area = canvasAreaRef.current;
    if (!area) return;
    // 48px of breathing room on both sides of the frame.
    const available = area.clientWidth - 48;
    setScale(Math.min(1, Math.max(0.3, available / frameWidth)));
  }, [frameWidth]);

  useLayoutEffect(() => {
    recomputeScale();
  }, [recomputeScale, railOpen, inspectorOpen]);

  useEffect(() => {
    const area = canvasAreaRef.current;
    if (!area || typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', recomputeScale);
      return () => window.removeEventListener('resize', recomputeScale);
    }
    const ro = new ResizeObserver(recomputeScale);
    ro.observe(area);
    return () => ro.disconnect();
  }, [recomputeScale]);

  /**
   * A scaled element still reports its unscaled height, so the scroll area
   * would reserve too much space. Track the real height and apply the scale.
   */
  useEffect(() => {
    if (!isFrame) return;
    const frame = frameRef.current;
    if (!frame || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setFrameHeight(frame.offsetHeight));
    ro.observe(frame);
    setFrameHeight(frame.offsetHeight);
    return () => ro.disconnect();
  }, [children, viewport, isFrame]);

  // Cmd/Ctrl+S saves, matching every other editor people already use.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (isDirty && !isSaving) onSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isDirty, isSaving, onSave]);

  // Brief "Saved" confirmation once a save finishes, so the save button going
  // quiet is not the only feedback the editor gets.
  const wasSaving = useRef(false);
  useEffect(() => {
    const finishedSaving = wasSaving.current && !isSaving;
    wasSaving.current = isSaving;
    if (!finishedSaving || isDirty) return;
    setJustSaved(true);
    const t = setTimeout(() => setJustSaved(false), 2200);
    return () => clearTimeout(t);
  }, [isSaving, isDirty]);

  const saveDisabled = isSaving || !isDirty;

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-100 dark:bg-slate-950">
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header className="h-14 shrink-0 flex items-center gap-3 px-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        {/* Context */}
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href={backHref}
            title={backLabel}
            aria-label={backLabel}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft size={17} />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[16rem]">
                {title}
              </h1>
              {publishState && (
                <span
                  className={`hidden sm:inline-flex items-center gap-1.5 h-5 px-2 rounded-full text-[11px] font-medium ${
                    publishState === 'published'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      publishState === 'published' ? 'bg-emerald-500' : 'bg-slate-400'
                    }`}
                  />
                  {publishState === 'published' ? 'Live' : 'Draft'}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-[18rem] font-mono">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Centre: viewport */}
        <div className="flex-1 flex items-center justify-center gap-2 min-w-0">
          {usesViewport && (
            <div className="hidden md:flex items-center gap-2">
              <Segmented
                ariaLabel="Preview width"
                items={VIEWPORT_META.map((v) => ({ key: v.key, label: v.label, icon: v.icon }))}
                value={viewport}
                onChange={setViewport}
              />
              {isFrame && (
                <span className="hidden xl:block text-[11px] text-slate-400 tabular-nums w-10 text-center">
                  {Math.round(scale * 100)}%
                </span>
              )}
              {isPreview && (
                <button
                  type="button"
                  onClick={() => setManualRefresh((n) => n + 1)}
                  title="Reload preview"
                  aria-label="Reload preview"
                  className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <RefreshCw size={14} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Panel toggles live in the toolbar rather than floating on the panel
              edge, where they ended up half off-screen once a panel collapsed
              to zero width. */}
          <div className="hidden md:flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setRailOpen((v) => !v)}
              aria-pressed={railOpen}
              title={railOpen ? 'Hide left panel' : 'Show left panel'}
              aria-label={railOpen ? 'Hide left panel' : 'Show left panel'}
              className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
                railOpen
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <PanelLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => setInspectorOpen((v) => !v)}
              aria-pressed={inspectorOpen}
              title={inspectorOpen ? `Hide ${inspectorLabel}` : `Show ${inspectorLabel}`}
              aria-label={inspectorOpen ? `Hide ${inspectorLabel}` : `Show ${inspectorLabel}`}
              className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
                inspectorOpen
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <PanelRight size={14} />
            </button>
          </div>

          {toolbarExtra}

          {/* Save state, stated in words rather than only a dot */}
          <span
            aria-live="polite"
            className={`hidden md:inline-flex items-center gap-1.5 text-xs font-medium ${
              isDirty
                ? 'text-amber-600 dark:text-amber-400'
                : justSaved
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-400'
            }`}
          >
            {isDirty ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Unsaved changes
              </>
            ) : justSaved ? (
              <>
                <Check size={13} />
                Saved
              </>
            ) : null}
          </span>

          {previewHref && (
            <a
              href={previewHref}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E8231A] focus-visible:ring-offset-1"
            >
              <ExternalLink size={14} />
              Open page
            </a>
          )}

          <button
            type="button"
            onClick={onSave}
            disabled={saveDisabled}
            title={isDirty ? 'Save changes (Ctrl+S)' : 'No changes to save'}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-semibold text-white bg-[#E8231A] hover:bg-[#C41E16] disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-500 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E8231A] focus-visible:ring-offset-2"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isSaving ? 'Saving' : 'Save'}
          </button>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0">
        {/* Left rail */}
        {railOpen && (
          <aside className="w-[264px] shrink-0 flex flex-col min-h-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
            {rail}
          </aside>
        )}

        {/* Canvas */}
        <main
          ref={canvasAreaRef}
          className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden bg-slate-200/70 dark:bg-slate-950"
        >
          {isFrame && (
            <div className="flex justify-center px-6 py-6">
              <div
                style={{
                  width: frameWidth * scale,
                  // `auto` until the observer reports a height, so the frame
                  // isn't collapsed to 0 on first paint.
                  height: frameHeight ? frameHeight * scale : 'auto',
                }}
                className="relative"
              >
                {/* The frame follows the OS colour preference because the
                    public site renders `dark:` variants from it — a hard-coded
                    white frame would clash with dark sections. */}
                <div
                  ref={frameRef}
                  style={{
                    width: frameWidth,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                  }}
                  className="bg-white dark:bg-slate-900 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.06),0_12px_32px_-8px_rgba(15,23,42,0.18)] overflow-hidden ring-1 ring-slate-900/5 dark:ring-white/10"
                >
                  {children}
                </div>
              </div>
            </div>
          )}

          {isPreview && (
            <div className="h-full flex flex-col">
              <div className="shrink-0 flex items-center justify-center gap-2 px-6 pt-4">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Live page preview — your edits appear here after you save.
                </p>
              </div>
              <div className="flex-1 min-h-0 flex justify-center px-6 py-4">
                <div
                  style={{ width: frameWidth, maxWidth: '100%' }}
                  className="h-full rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_12px_32px_-8px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/5 dark:ring-white/10"
                >
                  <iframe
                    key={`${previewRefreshKey}-${manualRefresh}-${viewport}`}
                    src={previewHref}
                    title="Page preview"
                    className="w-full h-full border-0"
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                  />
                </div>
              </div>
            </div>
          )}

          {canvasMode === 'document' && (
            <div className="mx-auto w-full max-w-3xl px-6 py-8">{children}</div>
          )}
        </main>

        {/* Inspector */}
        {inspectorOpen && (
          <aside
            aria-label={inspectorLabel}
            className="w-[360px] shrink-0 flex flex-col min-h-0 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800"
          >
            {inspector}
          </aside>
        )}
      </div>
    </div>
  );
}

export default EditorShell;
