'use client';

/**
 * Workspace transition overlay — module-level event bus + portal-rendered
 * overlay.
 *
 * Why a module-level bus instead of React context?
 * ----------------------------------------------------------
 * The previous implementation kept the overlay inside `DashboardShell`. That
 * works on the member side, but the dashboard root layout swaps `DashboardShell`
 * for `DashboardChrome` on `/dashboard/admin/*` — so the moment `router.push`
 * completes, the shell unmounts, the portal vanishes, and the user sees the
 * page change instantly with no transition at all. That defeats the whole
 * point of the loading screen.
 *
 * To make the overlay survive the route change, it has to live ABOVE the
 * switch — at the `app/dashboard/layout.tsx` level. That layout is shared by
 * both sides, so a single instance of the overlay there covers both directions.
 * A tiny module-level event bus lets any descendant (the switcher button in
 * the member shell, a future tab on the admin chrome, etc.) request the
 * transition without prop-drilling or a context provider.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Anchor, Shield } from 'lucide-react';

export type WorkspaceMode = 'member' | 'admin';

/** Minimum time the overlay is guaranteed to stay on screen. */
export const MIN_DISPLAY_MS = 4000;

type Listener = (target: WorkspaceMode) => void;
const listeners = new Set<Listener>();

/**
 * Ask the workspace transition overlay to show itself for the given target.
 * Call this BEFORE `router.push` so the portal mounts in the same frame as
 * the navigation kicks off.
 */
export function requestWorkspaceTransition(target: WorkspaceMode): void {
  for (const listener of listeners) listener(target);
}

/** Subscribe to overlay-trigger events. Returns an unsubscribe fn. */
function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * AnchorOverlay — full-screen transition centred on a big anchor glyph.
 *
 * The previous compass-rose dial has been replaced with the anchor that gives
 * the loading screen its identity. The anchor rotates gently while the
 * transition is up — visually the same nautical metaphor ("weighing anchor")
 * but reading instantly as a "loading" state rather than as a decorative dial.
 */
function AnchorOverlay({ target, onComplete }: { target: WorkspaceMode; onComplete: () => void }) {
  // Keep a stable handle to the timer so any re-render of the overlay (which
  // happens during the route change) cannot reset, clear, or restart the
  // countdown. The timer is set once on mount and is the SOLE source of
  // truth for when the overlay should disappear.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(onComplete, MIN_DISPLAY_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // We intentionally exclude `onComplete` from deps — the timer must start
    // once on mount and run uninterrupted for the full display time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const targetLabel = target === 'admin' ? 'Admin' : 'Member';
  const TargetIcon = target === 'admin' ? Shield : Anchor;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center bg-[#071321]/92 backdrop-blur-md"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <motion.div
        initial={{ scale: 0.9, y: 12, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, y: 6, opacity: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex w-[440px] max-w-[92vw] flex-col items-center overflow-hidden rounded-[6px] border border-white/10 bg-[#0B1C2E] px-6 py-10 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.8)]"
      >
        {/* Eyebrow strip */}
        <div className="mb-6 flex w-full items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/50">
            Weighing anchor
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[#E8231A]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E8231A] opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#E8231A]" />
            </span>
            Underway
          </span>
        </div>

        {/* Porthole frame around the anchor, matching the avatar's double ring */}
        <div
          className="relative flex h-44 w-44 items-center justify-center rounded-full"
          style={{
            boxShadow:
              'inset 0 0 0 1px rgba(255,255,255,0.12), 0 0 0 8px rgba(232,35,26,0.10), 0 0 0 18px rgba(11,28,46,0.35)',
          }}
        >
          {/* Soft red glow behind the anchor, the same red used by the primary CTA */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(232,35,26,0.18), transparent 70%)' }}
          />
          <motion.div
            animate={{ rotate: [0, -8, 8, -4, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            className="relative"
          >
            <Anchor className="h-20 w-20 text-[#E8231A]" strokeWidth={1.5} aria-hidden="true" />
          </motion.div>
        </div>

        {/* Status line */}
        <div className="mt-7 flex flex-col items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">
            Changing course
          </span>
          <span className="flex items-center gap-2 text-lg font-semibold text-white">
            <TargetIcon className="h-5 w-5 text-[#E8231A]" aria-hidden="true" />
            <span>to {targetLabel} mode</span>
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-7 h-[2px] w-full overflow-hidden rounded-full bg-white/[0.06]">
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: MIN_DISPLAY_MS / 1000, ease: 'linear' }}
            className="h-full bg-[#E8231A]"
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * WorkspaceTransitionRoot — mount once at the dashboard layout level.
 *
 * Subscribes to overlay-trigger events and renders the portal. The portal
 * targets `document.body`, so the overlay sits above every stacking context
 * in the dashboard chrome without needing to play z-index games.
 */
export function WorkspaceTransitionRoot() {
  const [target, setTarget] = useState<WorkspaceMode | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    return subscribe((next) => setTarget(next));
  }, []);

  // `onComplete` MUST be referentially stable across renders — the route
  // change after `router.push` causes the dashboard layout to re-render, and
  // an inline arrow here would create a new function each time. That would
  // reset the 4-second timer inside AnchorOverlay (which depends on this fn)
  // every time the layout re-renders, making the overlay feel like it was
  // tied to the page load instead of running for its full duration.
  const handleComplete = useCallback(() => setTarget(null), []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {target && (
        <AnchorOverlay
          key="workspace-anchor-overlay"
          target={target}
          onComplete={handleComplete}
        />
      )}
    </AnimatePresence>,
    document.body
  );
}
