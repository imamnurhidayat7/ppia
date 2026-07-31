'use client';

/**
 * DashboardShell — top navigation + command palette.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ logo · workspace · nav tabs · bell · theme · site · user     │ 68px
 *   ├──────────────────────────────────────────────────────────────┤
 *   │ content                                                      │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * Header, content, and footer all sit in the same container width, so the logo
 * lines up with the first card on the page instead of hanging further out.
 *
 * There is no visible search or quick-create button: both duplicated what the
 * pages already offer (every list screen has its own search field and its own
 * create action). The command palette stays reachable with ⌘K / Ctrl+K.
 *
 * Nav tabs come from nav-config, already filtered by role, so a page added to
 * the config appears here and in the palette without touching this file.
 * On mobile the tabs collapse into a right-hand sheet.
 */

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { Anchor, ArrowRightLeft, ChevronDown, ExternalLink, LogOut, Menu, Shield, User as UserIcon, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { cn, getImageUrl } from '@/lib/utils';
import { CommandPalette } from './command-palette';
import { DashboardDataProvider } from './dashboard-data-context';
import { NotificationCenter } from './notification-center';
import { ThemeToggleButton } from './theme-toggle';
import {
  ADMIN_NAV,
  MEMBER_NAV,
  filterSections,
  isAdminRole,
  type NavSection,
} from './nav-config';

interface DashboardShellProps {
  children: React.ReactNode;
  /** Force a navigation tree. Defaults to following the URL. */
  view?: 'member' | 'admin';
  /** Widen the content container for data-heavy pages. */
  maxWidth?: 'default' | 'wide';
}

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  BOARD: 'Board',
  MEMBER: 'Member',
};

function isActive(href: string, pathname: string, matchNested = true): boolean {
  if (pathname === href) return true;
  return matchNested && pathname.startsWith(`${href}/`);
}

/** Closes a popover when the user clicks outside of `ref`. */
function useOutsideClose(open: boolean, ref: React.RefObject<HTMLElement | null>, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) close();
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open, ref, close]);
}

/**
 * One top-level tab. Sections with a single entry render as a plain link;
 * sections with several render a dropdown.
 *
 * Both branches run the same hooks in the same order — an earlier version put
 * the outside-click effect after the single-item early return, which breaks the
 * rules of hooks the moment a section gains or loses an item (role change).
 */
function NavTab({
  section,
  pathname,
  onNavigate,
}: {
  section: NavSection;
  pathname: string;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useOutsideClose(open, ref, close);

  const items = section.items;

  if (items.length === 1) {
    const item = items[0];
    const active = isActive(item.href, pathname, item.matchNested);
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'group relative whitespace-nowrap text-sm font-medium transition-colors duration-200',
          active ? 'text-white' : 'text-[#94A3B8] hover:text-white'
        )}
      >
        {item.label}
        {/* The public nav's rule: a red hairline a hair below the label that
            wipes in from the left on hover, and stays put on the current page. */}
        <span
          className={cn(
            'absolute -bottom-1 left-0 h-px bg-[#E8231A] transition-all duration-300',
            active ? 'w-full' : 'w-0 group-hover:w-full'
          )}
        />
      </Link>
    );
  }

  const anyActive = items.some((item) => isActive(item.href, pathname, item.matchNested));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={cn(
          'group relative flex items-center gap-1 whitespace-nowrap text-sm font-medium transition-colors duration-200',
          anyActive || open ? 'text-white' : 'text-[#94A3B8] hover:text-white'
        )}
      >
        {section.title}
        <ChevronDown
          className={cn('h-3.5 w-3.5 transition-transform duration-200', open && 'rotate-180')}
        />
        <span
          className={cn(
            'absolute -bottom-1 left-0 h-px bg-[#E8231A] transition-all duration-300',
            anyActive ? 'w-full' : 'w-0 group-hover:w-full'
          )}
        />
      </button>

      {open && (
        <div className="animate-fade-in absolute left-0 top-full z-50 mt-3 w-60 overflow-hidden rounded-xl border border-white/10 bg-[#071321] shadow-2xl shadow-black/40">
          {items.map((item) => {
            const active = isActive(item.href, pathname, item.matchNested);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  setOpen(false);
                  onNavigate?.();
                }}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 border-b border-white/5 px-4 py-3 text-sm transition-colors last:border-0',
                  active ? 'bg-white/5 text-white' : 'text-[#94A3B8] hover:bg-white/5 hover:text-white'
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'h-1 w-1 shrink-0 rounded-full',
                    active ? 'bg-[#E8231A]' : 'bg-[#E8231A]/60'
                  )}
                />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * WorkspaceSwitcher — single-button mode toggle with a 3.5-second overlay.
 *
 * The control reads as a status pill: it shows the CURRENT mode (icon + label),
 * a tooltip tells the user what clicking will do, and the button itself has a
 * subtle arrow icon hinting that it changes the value. Avoiding a sliding-thumb
 * control here means no risk of double labels or layout fights with framer-motion
 * `layout` in dev mode — and a single button is the clearest possible affordance.
 *
 * On click we kick off the route change through `useTransition` AND mount a
 * full-screen overlay rendered through a React Portal so it sits at the top of
 * the document tree regardless of stacking contexts in the dashboard chrome.
 * The overlay runs a 3.5-second timer internally and renders a compass bearing
 * that sweeps 0° → 270°. Crucially, the timer lives inside the overlay
 * component itself — it is GUARANTEED to run for the full duration regardless
 * of how fast Next.js completes the route change.
 */
const MIN_DISPLAY_MS = 3500;

function WorkspaceSwitcher({ view }: { view: 'member' | 'admin' }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pendingTarget, setPendingTarget] = useState<'member' | 'admin' | null>(null);

  const isAdminMode = view === 'admin';
  const nextMode = isAdminMode ? 'member' : 'admin';
  const nextHref = nextMode === 'admin' ? '/dashboard/admin' : '/dashboard';

  const handleToggle = () => {
    if (pendingTarget) return;
    setPendingTarget(nextMode);
    startTransition(() => {
      router.push(nextHref);
    });
  };

  const CurrentIcon = isAdminMode ? Shield : Anchor;
  const tooltipText = `Switch to ${nextMode === 'admin' ? 'Admin' : 'Member'} mode`;

  return (
    <>
      <button
        type="button"
        title={tooltipText}
        aria-label={tooltipText}
        aria-pressed={pendingTarget !== null}
        onClick={handleToggle}
        disabled={pendingTarget !== null}
        className={cn(
          'group relative inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-medium transition-all duration-200',
          'border-white/15 bg-white/[0.06] text-white/90 hover:border-[#E8231A]/40 hover:bg-white/[0.1] hover:text-white',
          pendingTarget !== null && 'cursor-not-allowed opacity-60'
        )}
      >
        {/* Eyebrow label clarifying what this control does. Constant on the
            left so it never changes between modes — only the badge on the
            right changes. */}
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/45 group-hover:text-white/70">
          Mode
        </span>

        {/* Vertical divider for separation */}
        <span aria-hidden="true" className="h-3.5 w-px bg-white/15" />

        {/* Current mode badge — shows what's active right now. */}
        <CurrentIcon className="h-3.5 w-3.5 text-[#E8231A]" aria-hidden="true" />
        <span className="font-semibold capitalize text-white">{isAdminMode ? 'Admin' : 'Member'}</span>

        {/* Arrow hint — implies the button does something when clicked. */}
        <ArrowRightLeft aria-hidden="true" className="h-3 w-3 text-white/40 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-white" />
      </button>

      {/* Overlay is rendered through a portal so it stacks above everything,
          including any stacking contexts the dashboard chrome might create. */}
      <AnimatePresence>
        {pendingTarget && (
          <WorkspaceOverlayPortal
            key="workspace-overlay"
            target={pendingTarget}
            onComplete={() => setPendingTarget(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * WorkspaceOverlayPortal — wraps WorkspaceOverlay in a React Portal so the
 * overlay escapes any stacking contexts created by the dashboard chrome.
 *
 * A portal renders its children into `document.body` directly, so `position:
 * fixed` is always relative to the viewport. Without this, a parent with
 * `transform`, `filter`, `will-change`, `backdrop-filter`, or similar CSS can
 * silently turn a `fixed` element into a positioned descendant of itself —
 * which is exactly the kind of bug that makes an overlay appear off-centre.
 */
function WorkspaceOverlayPortal({
  target,
  onComplete,
}: {
  target: 'member' | 'admin';
  onComplete: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <WorkspaceOverlay target={target} onComplete={onComplete} />,
    document.body
  );
}

/**
 * WorkspaceOverlay — full-screen transition screen with a 3-second bearing.
 *
 * The timer is set once, in `useEffect`, and never restarted. The only way
 * the overlay disappears is when this timer fires (which calls `onComplete`
 * to unmount us), or when the parent unmounts us outright. This is the
 * simplest possible timing logic and impossible to break with re-renders.
 */
function WorkspaceOverlay({
  target,
  onComplete,
}: {
  target: 'member' | 'admin';
  onComplete: () => void;
}) {
  // Set the timer exactly once on mount. The cleanup fires when the overlay
  // unmounts (which happens *because* onComplete cleared parent state), so a
  // late-firing timer is harmless — it just calls a function that has already
  // done its job.
  useEffect(() => {
    const timer = setTimeout(onComplete, MIN_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const targetLabel = target === 'admin' ? 'Admin' : 'Member';
  const TargetIcon = target === 'admin' ? Shield : Anchor;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      // The wrapper fills the whole viewport and centers its child with
      // flexbox. min-h-screen and flex items-center justify-center guarantee
      // the card sits at the exact centre even if the parent has unusual
      // dimensions. The very high z-index ensures it stacks above the sticky
      // header (z-40) and any other overlay.
      className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center bg-[#071321]/90 backdrop-blur-md"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <motion.div
        initial={{ scale: 0.92, y: 16, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, y: 8, opacity: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative flex w-[440px] max-w-[92vw] flex-col overflow-hidden rounded-[6px] border border-white/10 bg-[#0B1C2E] shadow-[0_30px_90px_-20px_rgba(0,0,0,0.8)]"
      >
        {/* Top eyebrow strip — context before the dial. */}
        <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-5 py-2.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/50">
            Bridge · Bearing
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[#E8231A]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E8231A] opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#E8231A]" />
            </span>
            Live
          </span>
        </div>

        <div className="flex flex-col items-center px-6 py-9">
          {/* Compass rose — 220×220 SVG. */}
          <div className="relative">
            <svg viewBox="0 0 220 220" width="220" height="220" className="block">
              {/* Two concentric rings */}
              <circle cx="110" cy="110" r="100" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
              <circle cx="110" cy="110" r="84" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />

              {/* Tick marks every 15°. Long ticks every 90°. */}
              {Array.from({ length: 24 }).map((_, i) => {
                const angle = (i * 15 * Math.PI) / 180;
                const isCardinal = i % 6 === 0;
                const inner = isCardinal ? 76 : 82;
                const outer = 92;
                const x1 = 110 + Math.sin(angle) * inner;
                const y1 = 110 - Math.cos(angle) * inner;
                const x2 = 110 + Math.sin(angle) * outer;
                const y2 = 110 - Math.cos(angle) * outer;
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isCardinal ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.12)'}
                    strokeWidth={isCardinal ? 1.5 : 1}
                  />
                );
              })}

              {/* Cardinal letters */}
              <text x="110" y="36" textAnchor="middle" fill="rgba(255,255,255,0.65)" fontFamily="ui-monospace,monospace" fontSize="12" fontWeight="700" letterSpacing="0.1em">N</text>
              <text x="186" y="115" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontFamily="ui-monospace,monospace" fontSize="11" letterSpacing="0.1em">E</text>
              <text x="110" y="194" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontFamily="ui-monospace,monospace" fontSize="11" letterSpacing="0.1em">S</text>
              <text x="34" y="115" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontFamily="ui-monospace,monospace" fontSize="11" letterSpacing="0.1em">W</text>

              {/* Needle — sweeps 0° → 270° over MIN_DISPLAY_MS. */}
              <motion.g
                initial={{ rotate: 0 }}
                animate={{ rotate: 270 }}
                transition={{ duration: MIN_DISPLAY_MS / 1000, ease: [0.4, 0, 0.2, 1] }}
                style={{ transformOrigin: '110px 110px' }}
              >
                <path d="M 110 32 L 119 110 L 101 110 Z" fill="#E8231A" />
                <path d="M 110 188 L 119 110 L 101 110 Z" fill="rgba(255,255,255,0.15)" />
              </motion.g>

              {/* Center pivot */}
              <circle cx="110" cy="110" r="6" fill="#0B1C2E" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
              <circle cx="110" cy="110" r="2" fill="#E8231A" />
            </svg>

            {/* Bearing counter at the pivot */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center pb-2">
              <BearingCounter />
            </div>
          </div>

          {/* Status line under the dial. */}
          <div className="mt-7 flex flex-col items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">
              Changing course
            </span>
            <span className="flex items-center gap-2 text-lg font-semibold text-white">
              <TargetIcon className="h-5 w-5 text-[#E8231A]" aria-hidden="true" />
              <span>to {targetLabel} mode</span>
            </span>
          </div>
        </div>

        {/* Progress bar — fills 0% → 100% over MIN_DISPLAY_MS. */}
        <div className="h-[2px] w-full bg-white/[0.06]">
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
 * BearingCounter — animates from 0° to 270° over MIN_DISPLAY_MS.
 *
 * Implemented as a thin component so the framer-motion `useMotionValue` and
 * `useTransform` hooks live in their own render scope (they cannot run inside
 * the parent's JSX expression because that would violate the rules of hooks
 * when `pendingTarget` is null).
 */
function BearingCounter() {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) => `${Math.round(v)}°`);
  useEffect(() => {
    const controls = animate(motionValue, 270, {
      duration: MIN_DISPLAY_MS / 1000,
      ease: [0.4, 0, 0.2, 1],
    });
    return controls.stop;
  }, [motionValue]);
  return (
    <span className="rounded bg-[#0B1C2E]/80 px-2 py-0.5 font-mono text-[13px] font-semibold tabular-nums text-white">
      <motion.span>{rounded}</motion.span>
    </span>
  );
}

function ShellBody({ children, view: forcedView, maxWidth = 'default' }: DashboardShellProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || '/dashboard';

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  /** Which mobile group is expanded — the public nav behaves the same way. */
  const [mobileGroup, setMobileGroup] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const closeUserMenu = useCallback(() => setUserMenuOpen(false), []);
  useOutsideClose(userMenuOpen, userMenuRef, closeUserMenu);

  const view = forcedView ?? (pathname.startsWith('/dashboard/admin') ? 'admin' : 'member');
  const isAdmin = isAdminRole(user?.role);
  const navSections = useMemo(
    () => filterSections(view === 'admin' ? ADMIN_NAV : MEMBER_NAV, user?.role),
    [view, user?.role]
  );

  // ⌘K / Ctrl+K toggles the palette
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  /**
   * The bar sits translucent over the page until you scroll, then goes solid
   * with a rule and a shadow — the same two states as the public masthead.
   */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    router.push('/login');
  }, [logout, router]);

  if (!user) return null;

  // One container for the header, the content, and the footer.
  const container = maxWidth === 'wide' ? 'max-w-[1600px]' : 'max-w-7xl';

  return (
    <div className="dash-shore flex min-h-screen flex-col">
      {/*
        Top navigation, built to read as the public masthead rather than as a
        separate admin chrome: the same `#071321` surface and its two scroll
        states, the same 40px logo, `px-6 py-4` rhythm, link colour, and red
        hairline underline. What differs is only what the dashboard actually
        needs — a workspace switcher, notifications, the theme toggle.
      */}
      <header
        className={cn(
          'sticky top-0 z-40 transition-all duration-300',
          scrolled
            ? 'border-b border-white/10 bg-[#071321] shadow-lg shadow-black/20'
            : 'bg-[#071321]/95 backdrop-blur-md'
        )}
      >
        {/* Three groups, spaced apart: the public bar's composition, with the
            nav sitting in the middle of the bar rather than crowding the logo. */}
        <div
          className={cn('mx-auto flex w-full items-center justify-between gap-6 px-6 py-4', container)}
        >
          <div className="flex shrink-0 items-center gap-6">
            <Link href="/dashboard" aria-label="PPIA Auckland">
              <Image
                src="/Logo-PPIA-2025-White.png"
                alt="PPIA Auckland"
                width={120}
                height={48}
                className="h-8 w-auto"
                priority
              />
            </Link>

            {isAdmin && <WorkspaceSwitcher view={view} />}
          </div>

          {/* Tabs appear from xl up; below that they live in the mobile panel. */}
          <nav
            /*
              No `overflow-x-auto` here. A scroll container is a clipping
              context, so each tab's absolutely-positioned dropdown was being
              cut off at the nav's own height — the panel opened but nothing
              was visible below the bar.
            */
            className="hidden min-w-0 flex-nowrap items-center gap-8 xl:flex"
            aria-label="Main navigation"
          >
            {navSections.map((section) => (
              <NavTab key={section.title} section={section} pathname={pathname} />
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <NotificationCenter />
            <ThemeToggleButton />

            {/* Bare icon, no bordered tile: the public bar puts no boxes around
                its controls. */}
            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              title="Open public site"
              className="hidden h-9 w-9 items-center justify-center text-[#94A3B8] transition-colors hover:text-white sm:flex"
            >
              <ExternalLink className="h-4 w-4" />
            </Link>

            {/* User menu: single-line trigger (avatar + name + chevron) with the
                role label moved into the dropdown body where it sits with the
                email. No border or chip background — the avatar disc and the
                chevron are the affordance, the header dark surface carries the
                contrast. */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((value) => !value)}
                aria-expanded={userMenuOpen}
                aria-label="Account menu"
                className="group flex items-center gap-2 rounded-full py-1 pl-1 pr-1.5 transition-colors hover:bg-white/[0.06]"
              >
                {/* Brand-red disc. */}
                <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#E8231A]">
                  {user.avatar ? (
                    <Image
                      src={getImageUrl(user.avatar) ?? user.avatar}
                      alt={user.name || user.username}
                      width={32}
                      height={32}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    <UserIcon className="h-4 w-4 text-white" />
                  )}
                </span>
                <span className="hidden max-w-[120px] truncate text-sm font-medium text-white/85 group-hover:text-white lg:inline">
                  {user.name || user.username}
                </span>
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 text-white/40 transition-transform group-hover:text-white/70',
                    userMenuOpen && 'rotate-180 text-white'
                  )}
                />
              </button>

              {userMenuOpen && (
                <div className="animate-fade-in absolute right-0 top-full z-50 mt-3 w-56 overflow-hidden rounded-xl border border-white/10 bg-[#071321] shadow-2xl shadow-black/40">
                  <div className="border-b border-white/10 px-4 py-3">
                    <p className="truncate text-sm font-semibold text-white">
                      {user.name || user.username}
                    </p>
                    <p className="truncate text-xs text-[#94A3B8]">
                      {user.email}
                    </p>
                    <span className="mt-1.5 inline-block rounded-md bg-[#E8231A]/20 px-2 py-0.5 text-[12px] font-bold text-[#FF8A80]">
                      {ROLE_LABEL[user.role] ?? user.role}
                    </span>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/dashboard/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#94A3B8] transition-colors hover:bg-white/5 hover:text-white"
                    >
                      <UserIcon className="h-4 w-4 text-[#94A3B8]" />
                      My profile
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-[#94A3B8] transition-colors hover:bg-[#E8231A]/10 hover:text-[#E8231A]"
                    >
                      <LogOut className="h-4 w-4 text-[#94A3B8]" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((value) => !value)}
              className="p-2 text-white xl:hidden"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-[22px] w-[22px]" /> : <Menu className="h-[22px] w-[22px]" />}
            </button>
          </div>
        </div>
      </header>

      {/*
        Mobile menu: a panel that drops out of the bar, with one group open at a
        time — the public nav's pattern. It replaced a right-hand sheet with a
        scrim, which was a second, unrelated navigation model for members who
        move between the two sides of the site on a phone. Groups collapse
        because the admin tree runs to forty entries.
      */}
      {mobileMenuOpen && (
        <div className="sticky top-[72px] z-40 border-t border-white/5 bg-[#071321]/98 backdrop-blur-md xl:hidden">
          <div className="max-h-[calc(100vh-72px)] overflow-y-auto px-6 py-4">
            {isAdmin && (
              <div className="mb-3 flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/5 p-0.5">
                {(['member', 'admin'] as const).map((target) => {
                  const current = view === target;
                  return (
                    <Link
                      key={target}
                      href={target === 'admin' ? '/dashboard/admin' : '/dashboard'}
                      onClick={() => setMobileMenuOpen(false)}
                      aria-current={current ? 'true' : undefined}
                      className={cn(
                        'flex-1 rounded-md px-3 py-2 text-center text-xs font-semibold capitalize transition-colors',
                        current ? 'bg-white text-[#0D1B33] shadow-sm' : 'text-[#94A3B8] hover:text-white'
                      )}
                    >
                      {target}
                    </Link>
                  );
                })}
              </div>
            )}

            <nav className="flex flex-col gap-1" aria-label="Main navigation">
              {navSections.map((section) => {
                const single = section.items.length === 1 ? section.items[0] : undefined;

                if (single) {
                  return (
                    <Link
                      key={section.title}
                      href={single.href}
                      onClick={() => setMobileMenuOpen(false)}
                      aria-current={
                        isActive(single.href, pathname, single.matchNested) ? 'page' : undefined
                      }
                      className="py-2.5 text-sm font-medium text-[#94A3B8] transition-colors hover:text-white"
                    >
                      {single.label}
                    </Link>
                  );
                }

                const expanded = mobileGroup === section.title;
                return (
                  <div key={section.title}>
                    <button
                      type="button"
                      onClick={() => setMobileGroup(expanded ? null : section.title)}
                      aria-expanded={expanded}
                      className="flex w-full items-center justify-between py-2.5 text-sm font-medium text-[#94A3B8] transition-colors hover:text-white"
                    >
                      {section.title}
                      <ChevronDown
                        className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')}
                      />
                    </button>
                    {expanded && (
                      <div className="mb-1 flex flex-col gap-1 pl-4">
                        {section.items.map((item) => {
                          const active = isActive(item.href, pathname, item.matchNested);
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setMobileMenuOpen(false)}
                              aria-current={active ? 'page' : undefined}
                              className={cn(
                                'flex items-center gap-2 py-2 text-sm transition-colors',
                                active ? 'text-white' : 'text-[#94A3B8] hover:text-white'
                              )}
                            >
                              <span
                                aria-hidden="true"
                                className={cn(
                                  'h-1 w-1 shrink-0 rounded-full',
                                  active ? 'bg-[#E8231A]' : 'bg-[#E8231A]/60'
                                )}
                              />
                              {item.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            <div className="mt-2 flex flex-col gap-1 border-t border-white/10 pt-3">
              <Link
                href="/dashboard/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 text-sm font-medium text-[#94A3B8] transition-colors hover:text-white"
              >
                My profile
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="py-2 text-left text-sm font-medium text-[#94A3B8] transition-colors hover:text-white"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <main
        id="dashboard-content"
        className={cn('mx-auto w-full flex-1 px-4 py-6 sm:px-6 sm:py-8', container)}
      >
        {children}
      </main>

      {/* Footer: a rope hairline and a coordinate line, matching the public
          site's instrument row rather than a bare copyright note. */}
      <footer className="px-4 pb-6 pt-2 sm:px-6">
        <div className={cn('mx-auto w-full', container)}>
          <span aria-hidden="true" className="rope-rule block opacity-60" />
          <div className="mt-4 flex flex-col items-center justify-between gap-2 sm:flex-row">
            <p className="data-type text-[12px] uppercase ink-muted">
              PPIA Auckland · {new Date().getFullYear()}
            </p>
            <p className="data-type text-[12px] uppercase ink-muted">Auckland · 36.85° S</p>
          </div>
        </div>
      </footer>

      {/* Mounted only while open so its internal state resets on every launch */}
      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} role={user.role} />}
    </div>
  );
}

/**
 * The single chrome used by every dashboard route. Member and admin sides share
 * it; the tree of nav tabs is what differs.
 */
export function DashboardShell(props: DashboardShellProps) {
  return (
    <DashboardDataProvider>
      <ShellBody {...props} />
    </DashboardDataProvider>
  );
}
