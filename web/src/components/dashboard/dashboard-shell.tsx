'use client';

/**
 * DashboardShell — top navigation + command palette.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ logo · nav tabs · search (⌘K) · create · bell · theme · user │ 56px
 *   ├──────────────────────────────────────────────────────────────┤
 *   │ content (max-w constrained)                                  │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * Nav tabs come from nav-config, already filtered by role, so a page added to
 * the config appears here and in the palette without touching this file.
 * On mobile the tabs collapse into a right-hand sheet.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChevronDown,
  ExternalLink,
  LogOut,
  Menu,
  Plus,
  Search,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui';
import { CommandPalette } from './command-palette';
import { DashboardDataProvider } from './dashboard-data-context';
import { NotificationCenter } from './notification-center';
import { ThemeToggleButton } from './theme-toggle';
import {
  ADMIN_NAV,
  ADMIN_QUICK_CREATE,
  MEMBER_NAV,
  canAccess,
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
          'group relative flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors duration-200',
          active ? 'text-white' : 'text-[#94A3B8] hover:text-white'
        )}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        {item.label}
        {/* Red rule: pinned when active, wipes in on hover — as on the public nav. */}
        <span
          className={cn(
            'absolute bottom-0.5 left-3 h-px bg-[#E8231A] transition-all duration-300',
            active ? 'right-3' : 'w-0 group-hover:right-3 group-hover:w-[calc(100%-1.5rem)]'
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
          'group relative flex items-center gap-1 whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors duration-200',
          anyActive || open ? 'text-white' : 'text-[#94A3B8] hover:text-white'
        )}
      >
        {section.title}
        <ChevronDown
          className={cn('h-3.5 w-3.5 transition-transform duration-200', open && 'rotate-180')}
        />
        <span
          className={cn(
            'absolute bottom-0.5 left-3 h-px bg-[#E8231A] transition-all duration-300',
            anyActive ? 'right-3' : 'w-0 group-hover:right-3 group-hover:w-[calc(100%-1.5rem)]'
          )}
        />
      </button>

      {open && (
        <div className="animate-fade-in absolute left-0 top-full z-50 mt-3 w-64 overflow-hidden rounded-xl border border-white/10 bg-[#0D1B33] shadow-2xl shadow-black/40">
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
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{item.label}</span>
                  {item.description && (
                    <span className="mt-0.5 block truncate text-[11px] text-[#64748B]">
                      {item.description}
                    </span>
                  )}
                </span>
                <item.icon className="h-4 w-4 shrink-0 text-[#64748B]" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ShellBody({ children, view: forcedView, maxWidth = 'default' }: DashboardShellProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname() || '/dashboard';

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const createRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const closeCreate = useCallback(() => setCreateOpen(false), []);
  const closeUserMenu = useCallback(() => setUserMenuOpen(false), []);
  useOutsideClose(createOpen, createRef, closeCreate);
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

  // Lock body scroll behind the mobile sheet
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileMenuOpen]);

  const handleLogout = useCallback(() => {
    logout();
    router.push('/login');
  }, [logout, router]);

  if (!user) return null;

  const quickCreate = ADMIN_QUICK_CREATE.filter((item) => canAccess(item, user.role));

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      {/* Top navigation */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0D1B33]/95 backdrop-blur-md">
        <div className="mx-auto flex h-[68px] max-w-[1600px] items-center gap-4 px-4 sm:px-6">
          <Link href="/dashboard" className="shrink-0" aria-label="PPIA Auckland">
            <Image
              src="/Logo-PPIA-2025-White.png"
              alt="PPIA Auckland"
              width={130}
              height={52}
              className="h-9 w-auto"
              priority
            />
          </Link>

          {/*
            Workspace switcher.
            Sits beside the logo because it scopes the nav tabs that follow it:
            flipping it changes which tree is shown. Only roles that can reach
            the admin area see it.
          */}
          {isAdmin && (
            <div className="hidden shrink-0 items-center gap-0.5 rounded-lg border border-white/10 bg-white/5 p-0.5 sm:flex">
              {(['member', 'admin'] as const).map((target) => {
                const current = view === target;
                return (
                  <Link
                    key={target}
                    href={target === 'admin' ? '/dashboard/admin' : '/dashboard'}
                    aria-current={current ? 'true' : undefined}
                    className={cn(
                      'rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-colors',
                      current
                        ? 'bg-white text-[#0D1B33] shadow-sm'
                        : 'text-[#94A3B8] hover:text-white'
                    )}
                  >
                    {target}
                  </Link>
                );
              })}
            </div>
          )}

          <span aria-hidden="true" className="hidden h-6 w-px shrink-0 bg-white/10 xl:block" />

          {/* Tabs appear from md up; below that they live in the mobile sheet. */}
          <nav
            /*
              No `overflow-x-auto` here. A scroll container is a clipping
              context, so each tab's absolutely-positioned dropdown was being
              cut off at the nav's own height — the panel opened but nothing
              was visible below the bar.
            */
            className="hidden min-w-0 flex-1 flex-nowrap items-center gap-0.5 xl:flex"
            aria-label="Main navigation"
          >
            {navSections.map((section) => (
              <NavTab key={section.title} section={section} pathname={pathname} />
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-[#94A3B8] transition-colors hover:border-white/25 hover:text-white"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden text-xs lg:inline">Search…</span>
              <kbd className="hidden rounded border border-white/15 px-1.5 py-0.5 text-[10px] font-semibold xl:inline">
                ⌘K
              </kbd>
            </button>

            {/*
              Quick-create only exists in the admin view. Every destination is
              an admin route, so offering it on the member dashboard invites a
              click that leaves the context the user is in — and a plain member
              has nothing here at all, since each entry is role-gated.
            */}
            {view === 'admin' && isAdmin && quickCreate.length > 0 && (
              <div className="relative" ref={createRef}>
                <button
                  type="button"
                  onClick={() => setCreateOpen((value) => !value)}
                  aria-expanded={createOpen}
                  className="flex h-9 items-center gap-1.5 rounded-lg bg-[#E8231A] px-3 text-sm font-semibold text-white transition-colors hover:bg-[#C41E16]"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">New</span>
                </button>
                {createOpen && (
                  <div className="animate-fade-in absolute right-0 top-full z-50 mt-3 w-56 overflow-hidden rounded-xl border border-white/10 bg-[#0D1B33] py-1 shadow-2xl shadow-black/40">
                    {quickCreate.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setCreateOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#94A3B8] transition-colors hover:bg-white/5 hover:text-white"
                      >
                        <item.icon className="h-4 w-4 text-[#64748B]" />
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            <NotificationCenter />
            <ThemeToggleButton />

            <Link
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              title="Open public site"
              className="hidden h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-[#94A3B8] transition-colors hover:border-white/25 hover:bg-white/5 hover:text-white sm:flex"
            >
              <ExternalLink className="h-4 w-4" />
            </Link>

            {/* User menu: profile, admin/member switch, sign out */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((value) => !value)}
                aria-expanded={userMenuOpen}
                aria-label="Account menu"
                className="flex h-9 items-center gap-2 rounded-lg pl-1 pr-2 transition-colors hover:bg-white/5"
              >
                <Avatar src={user.avatar} name={user.name || user.username} size="sm" />
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 text-[#94A3B8] transition-transform',
                    userMenuOpen && 'rotate-180'
                  )}
                />
              </button>

              {userMenuOpen && (
                <div className="animate-fade-in absolute right-0 top-full z-50 mt-3 w-60 overflow-hidden rounded-xl border border-white/10 bg-[#0D1B33] shadow-2xl shadow-black/40">
                  <div className="border-b border-white/10 px-4 py-3">
                    <p className="truncate text-sm font-semibold text-white">
                      {user.name || user.username}
                    </p>
                    <p className="truncate text-xs text-[#64748B]">
                      {user.email}
                    </p>
                    <span className="mt-1.5 inline-block rounded-md bg-[#E8231A]/20 px-2 py-0.5 text-[11px] font-bold text-[#E8231A]">
                      {ROLE_LABEL[user.role] ?? user.role}
                    </span>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/dashboard/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#94A3B8] transition-colors hover:bg-white/5 hover:text-white"
                    >
                      <UserIcon className="h-4 w-4 text-[#64748B]" />
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
                      <LogOut className="h-4 w-4 text-[#64748B]" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-[#94A3B8] transition-colors hover:border-white/25 hover:text-white xl:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu sheet */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 cursor-default bg-slate-950/40 backdrop-blur-sm"
          />
          <div className="animate-slide-in-right absolute inset-y-0 right-0 w-72 overflow-y-auto bg-[#0D1B33] shadow-2xl">
            <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
              <span className="text-sm font-semibold text-white">Menu</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
                className="text-[#94A3B8] transition-colors hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {isAdmin && (
              <div className="border-b border-white/10 p-3">
                <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/5 p-0.5">
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
                          current
                            ? 'bg-white text-[#0D1B33] shadow-sm'
                            : 'text-[#94A3B8] hover:text-white'
                        )}
                      >
                        {target}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            <nav className="space-y-4 p-3" aria-label="Main navigation">
              {navSections.map((section) => (
                <div key={section.title}>
                  <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                    {section.title}
                  </p>
                  {section.items.map((item) => {
                    const active = isActive(item.href, pathname, item.matchNested);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                          active
                            ? 'bg-white/5 font-medium text-white'
                            : 'text-[#94A3B8] hover:bg-white/5 hover:text-white'
                        )}
                      >
                        <item.icon
                          className={cn('h-4 w-4 shrink-0', active ? 'text-[#E8231A]' : 'text-[#64748B]')}
                        />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Content */}
      <main
        id="dashboard-content"
        className={cn(
          'mx-auto w-full flex-1 px-4 py-6 sm:px-6 sm:py-8',
          maxWidth === 'wide' ? 'max-w-[1600px]' : 'max-w-7xl'
        )}
      >
        {children}
      </main>

      <footer className="border-t border-slate-200/80 px-4 py-5 sm:px-6 dark:border-slate-800">
        <p className="text-center text-xs text-slate-400">
          &copy; {new Date().getFullYear()} PPIA Auckland. All rights reserved.
        </p>
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
