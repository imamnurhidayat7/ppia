'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { Avatar, Badge } from '@/components/ui';
import { KpiCard, KpiGrid } from '@/components/dashboard';
import { cn, formatDate, getImageUrl } from '@/lib/utils';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  MapPin,
  MessageCircle,
  Ticket,
  User,
  Vote,
} from 'lucide-react';

interface EventSummary {
  id: string;
  title: string;
  slug: string;
  startDate: string;
  location?: string;
  imageUrl?: string;
}

interface ArticleSummary {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  imageUrl?: string;
  category?: string;
  views?: number;
  createdAt: string;
}

interface ResearchSummary {
  id: string;
  title: string;
  slug: string;
  researchType?: string;
  viewCount?: number;
}

interface RegistrationSummary {
  id: string;
  status: string;
  registeredAt: string;
  checkedInAt?: string | null;
  /** Derived server-side; shown at the door instead of searching the guest list. */
  checkInCode?: string;
  Event?: EventSummary;
}

interface ActiveElection {
  id: string;
  title: string;
  status: string;
  votingStart: string;
  votingEnd: string;
}

/** Fields that make a member profile useful to the rest of the community. */
const PROFILE_FIELDS: { key: string; label: string }[] = [
  { key: 'avatar', label: 'Profile photo' },
  { key: 'bio', label: 'Short bio' },
  { key: 'phone', label: 'Phone number' },
  { key: 'university', label: 'University' },
  { key: 'major', label: 'Programme' },
  { key: 'studentId', label: 'Student ID' },
  { key: 'linkedIn', label: 'LinkedIn' },
];

const QUICK_LINKS = [
  {
    label: 'Articles',
    href: '/dashboard/articles',
    icon: FileText,
    description: 'Community news and writing',
    tint: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  {
    label: 'Events',
    href: '/dashboard/events',
    icon: Calendar,
    description: 'Community calendar and registrations',
    tint: 'bg-[#FFF0EF] text-[#E8231A] dark:bg-[#E8231A]/20 dark:text-[#FF8A84]',
  },
  {
    label: 'Research',
    href: '/dashboard/research',
    icon: BookOpen,
    description: 'Publications and academic work',
    tint: 'bg-violet-50 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300',
  },
  {
    label: 'PEMIRA',
    href: '/dashboard/pemira',
    icon: Vote,
    description: 'Student election',
    tint: 'bg-sky-50 text-sky-600 dark:bg-sky-900/40 dark:text-sky-300',
  },
  {
    label: 'My profile',
    href: '/dashboard/profile',
    icon: User,
    description: 'Personal details and member card',
    tint: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  },
];

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900',
        className
      )}
    >
      {children}
    </div>
  );
}

function SectionHeading({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-50">{title}</h2>
      {action}
    </div>
  );
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth();

  const [whatsappGroupLink, setWhatsappGroupLink] = useState('');
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [eventTotal, setEventTotal] = useState(0);
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [articleTotal, setArticleTotal] = useState(0);
  const [research, setResearch] = useState<ResearchSummary[]>([]);
  const [researchTotal, setResearchTotal] = useState(0);
  const [registrations, setRegistrations] = useState<RegistrationSummary[]>([]);
  const [election, setElection] = useState<ActiveElection | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchedAt, setFetchedAt] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      const [settingsRes, eventsRes, articlesRes, researchRes, registrationsRes, electionRes] =
        await Promise.allSettled([
          // Member-scoped: the WhatsApp invite is no longer served publicly.
          api.getMemberSettings(),
          api.getEvents({ limit: 6 }),
          api.getArticles({ limit: 4 }),
          api.getResearch({ limit: 4 }),
          api.getMyRegistrations(),
          api.getActiveElection(),
        ]);

      if (cancelled) return;

      if (settingsRes.status === 'fulfilled') {
        const payload = settingsRes.value as { settings?: { whatsappGroupLink?: string } };
        if (payload.settings?.whatsappGroupLink) {
          setWhatsappGroupLink(payload.settings.whatsappGroupLink);
        }
      }

      if (eventsRes.status === 'fulfilled') {
        const payload = eventsRes.value as {
          events?: EventSummary[];
          pagination?: { total?: number };
        };
        setEvents(payload.events ?? []);
        setEventTotal(payload.pagination?.total ?? payload.events?.length ?? 0);
      }

      if (articlesRes.status === 'fulfilled') {
        const payload = articlesRes.value as {
          articles?: ArticleSummary[];
          pagination?: { total?: number };
        };
        setArticles(payload.articles ?? []);
        setArticleTotal(payload.pagination?.total ?? payload.articles?.length ?? 0);
      }

      if (researchRes.status === 'fulfilled') {
        // GET /research returns the list under `researches`; reading `research`
        // left this card permanently empty.
        const payload = researchRes.value as {
          researches?: ResearchSummary[];
          research?: ResearchSummary[];
          pagination?: { total?: number };
        };
        const list = payload.researches ?? payload.research ?? [];
        setResearch(list);
        setResearchTotal(payload.pagination?.total ?? list.length);
      }

      if (registrationsRes.status === 'fulfilled') {
        const payload = registrationsRes.value as { registrations?: RegistrationSummary[] };
        setRegistrations(payload.registrations ?? []);
      }

      if (electionRes.status === 'fulfilled') {
        const payload = electionRes.value as { election?: ActiveElection | null };
        setElection(payload.election ?? null);
      }

      setFetchedAt(Date.now());
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  /**
   * "Upcoming" is relative to the moment the data was fetched. Keeping the
   * cutoff in state rather than calling Date.now() while rendering keeps the
   * render pure, which React Compiler requires.
   */
  const upcomingEvents = useMemo(
    () =>
      events
        .filter((event) => new Date(event.startDate).getTime() >= fetchedAt)
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
    [events, fetchedAt]
  );

  const myUpcoming = useMemo(
    () =>
      registrations
        .filter(
          (registration) =>
            registration.status !== 'CANCELLED' &&
            registration.Event &&
            new Date(registration.Event.startDate).getTime() >= fetchedAt
        )
        .sort(
          (a, b) =>
            new Date(a.Event!.startDate).getTime() - new Date(b.Event!.startDate).getTime()
        ),
    [registrations, fetchedAt]
  );

  const profileGaps = useMemo(() => {
    if (!user) return { missing: [] as string[], percent: 100 };
    const record = user as unknown as Record<string, unknown>;
    const missing = PROFILE_FIELDS.filter((field) => {
      const value = record[field.key];
      return value === undefined || value === null || value === '';
    });
    const filled = PROFILE_FIELDS.length - missing.length;
    return {
      missing: missing.map((field) => field.label),
      percent: Math.round((filled / PROFILE_FIELDS.length) * 100),
    };
  }, [user]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-[#E8231A]" />
      </div>
    );
  }

  const isPending = user.membershipStatus === 'PENDING';
  const isRejected = user.membershipStatus === 'REJECTED';

  return (
    <div className="animate-fade-in space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0D1B33] via-[#1A2B4A] to-[#24406f] p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-0 opacity-[0.06] dashboard-grid-texture" />
        <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-[#E8231A]/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-sky-400/15 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="shrink-0 rounded-2xl border border-white/15 bg-white/10 p-1 backdrop-blur-sm">
              <Avatar src={user.avatar} name={user.name || user.username} size="xl" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="danger" size="md">
                  {user.role === 'SUPER_ADMIN'
                    ? 'Super Admin'
                    : user.role === 'BOARD'
                      ? 'Board'
                      : 'Member'}
                </Badge>
                {user.division?.name && (
                  <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs font-medium text-white/80">
                    {user.division.name}
                  </span>
                )}
              </div>
              <h1 className="mt-2 truncate font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
                {greeting()}, {user.firstName || user.name}
              </h1>
              <p className="mt-1 truncate text-sm text-white/60">{user.email}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard/events"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              <Calendar className="h-4 w-4" />
              Browse events
            </Link>
            {whatsappGroupLink && (
              <a
                href={whatsappGroupLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1FAF55]"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp group
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Membership status */}
      {(isPending || isRejected) && (
        <div
          className={cn(
            'flex flex-col gap-3 rounded-2xl border p-5 sm:flex-row sm:items-center',
            isPending
              ? 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/20'
              : 'border-danger-200 bg-danger-50 dark:border-danger-900/50 dark:bg-danger-900/20'
          )}
        >
          <span
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
              isPending
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                : 'bg-danger-100 text-danger-700 dark:bg-danger-900/50 dark:text-danger-300'
            )}
          >
            {isPending ? <Clock className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {isPending ? 'Membership pending approval' : 'Registration rejected'}
            </p>
            <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
              {isPending
                ? 'The committee is reviewing your registration. Some features unlock once it is approved.'
                : user.rejectionReason || 'Contact the committee for more information.'}
            </p>
          </div>
          <Link
            href="/dashboard/profile"
            className="shrink-0 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            View profile
          </Link>
        </div>
      )}

      {/* Active election */}
      {election && (
        <Link
          href="/dashboard/pemira"
          className="group flex flex-col gap-3 rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 to-white p-5 transition-all hover:border-sky-300 hover:shadow-md sm:flex-row sm:items-center dark:border-sky-900/50 dark:from-sky-900/20 dark:to-slate-900"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300">
            <Vote className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {election.title}
              </p>
              <Badge variant="primary">{election.status}</Badge>
            </div>
            <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
              Voting {formatDate(election.votingStart)} – {formatDate(election.votingEnd)}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-sky-700 dark:text-sky-300">
            Open PEMIRA
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
      )}

      {/* Stats */}
      <KpiGrid>
        <KpiCard
          label="Your events"
          value={myUpcoming.length}
          icon={Ticket}
          tone="red"
          meta={`${registrations.length} registrations in total`}
          href="/dashboard/events"
          isLoading={loading}
        />
        <KpiCard
          label="Upcoming events"
          value={upcomingEvents.length}
          icon={CalendarCheck}
          tone="navy"
          meta={`${eventTotal} published events`}
          href="/dashboard/events"
          isLoading={loading}
        />
        <KpiCard
          label="Articles"
          value={articleTotal}
          icon={FileText}
          tone="emerald"
          meta="Latest community reading"
          href="/dashboard/articles"
          isLoading={loading}
        />
        <KpiCard
          label="Research"
          value={researchTotal}
          icon={BookOpen}
          tone="violet"
          meta="Publications you can download"
          href="/dashboard/research"
          isLoading={loading}
        />
      </KpiGrid>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: my events + latest articles */}
        <div className="space-y-6 lg:col-span-2">
          <Panel>
            <SectionHeading
              title="Your events"
              action={
                <Link
                  href="/dashboard/events"
                  className="shrink-0 text-sm font-semibold text-[#E8231A] hover:underline"
                >
                  All events
                </Link>
              }
            />
            {loading ? (
              <div className="space-y-3">
                {[0, 1].map((row) => (
                  <div key={row} className="h-16 rounded-xl skeleton" />
                ))}
              </div>
            ) : myUpcoming.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                  <Calendar className="h-5 w-5 text-slate-400" />
                </span>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  You have not joined any events yet
                </p>
                <Link
                  href="/dashboard/events"
                  className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-[#E8231A] hover:underline"
                >
                  Find an event <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {myUpcoming.slice(0, 4).map((registration) => {
                  const event = registration.Event!;
                  return (
                    <li key={registration.id}>
                      <Link
                        href={`/dashboard/events/${event.slug}`}
                        className="flex items-center gap-4 rounded-xl border border-slate-200 p-3 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-800/60"
                      >
                        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-[#0D1B33] text-white">
                          <span className="text-[10px] font-semibold uppercase leading-none">
                            {new Date(event.startDate).toLocaleDateString('en-NZ', {
                              month: 'short',
                            })}
                          </span>
                          <span className="text-lg font-black leading-none">
                            {new Date(event.startDate).getDate()}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {event.title}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-slate-500 dark:text-slate-400">
                            {event.location && (
                              <>
                                <MapPin className="h-3 w-3 shrink-0" />
                                {event.location}
                              </>
                            )}
                          </p>
                        </div>
                        <span className="flex shrink-0 flex-col items-end gap-1">
                          {registration.checkedInAt ? (
                            <Badge variant="success">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Attended
                            </Badge>
                          ) : (
                            <Badge variant="primary">Registered</Badge>
                          )}
                          {/* Shown at the door so an organiser can check you in
                              without searching the guest list. Not shown once
                              you are already through. */}
                          {registration.checkInCode && !registration.checkedInAt && (
                            <span className="font-mono text-[11px] font-bold tracking-widest text-slate-400">
                              {registration.checkInCode}
                            </span>
                          )}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel>
            <SectionHeading
              title="Latest articles"
              action={
                <Link
                  href="/dashboard/articles"
                  className="shrink-0 text-sm font-semibold text-[#E8231A] hover:underline"
                >
                  All articles
                </Link>
              }
            />
            {loading ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[0, 1, 2, 3].map((row) => (
                  <div key={row} className="h-24 rounded-xl skeleton" />
                ))}
              </div>
            ) : articles.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                No published articles yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {articles.slice(0, 4).map((article) => (
                  <Link
                    key={article.id}
                    href={`/dashboard/articles/${article.slug}`}
                    className="group flex gap-3 rounded-xl border border-slate-200 p-3 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-800/60"
                  >
                    {/* `relative` is what `fill` positions against. */}
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                      {article.imageUrl ? (
                        <Image
                          // getImageUrl returns undefined for an unrecognised
                          // path; the raw value is already known to be non-empty
                          // from the guard above.
                          src={getImageUrl(article.imageUrl) || article.imageUrl}
                          alt=""
                          fill
                          // A fixed 64px thumbnail, so the width is known exactly.
                          sizes="64px"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <FileText className="h-5 w-5 text-slate-400" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      {article.category && (
                        <span className="text-[11px] font-bold uppercase tracking-wide text-[#E8231A]">
                          {article.category}
                        </span>
                      )}
                      <p className="line-clamp-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {article.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatDate(article.createdAt)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* Right: profile completeness, research, whatsapp */}
        <div className="space-y-6">
          <Panel>
            <SectionHeading title="Profile completeness" />
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 shrink-0">
                <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    strokeWidth="4"
                    className="stroke-slate-100 dark:stroke-slate-800"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.5"
                    fill="none"
                    strokeWidth="4"
                    stroke="#E8231A"
                    strokeLinecap="round"
                    strokeDasharray={`${(profileGaps.percent / 100) * 97.4} 97.4`}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-slate-900 dark:text-slate-100">
                  {profileGaps.percent}%
                </span>
              </div>
              <div className="min-w-0">
                {profileGaps.missing.length === 0 ? (
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Your profile is complete. Thank you!
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {profileGaps.missing.length} details still missing:
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {profileGaps.missing.slice(0, 3).join(', ')}
                      {profileGaps.missing.length > 3 &&
                        ` +${profileGaps.missing.length - 3} more`}
                    </p>
                  </>
                )}
              </div>
            </div>
            <Link
              href="/dashboard/profile"
              className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Update profile
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Panel>

          <Panel>
            <SectionHeading
              title="Latest research"
              action={
                <Link
                  href="/dashboard/research"
                  className="shrink-0 text-sm font-semibold text-[#E8231A] hover:underline"
                >
                  All
                </Link>
              }
            />
            {loading ? (
              <div className="space-y-2">
                {[0, 1, 2].map((row) => (
                  <div key={row} className="h-10 rounded-lg skeleton" />
                ))}
              </div>
            ) : research.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                No publications yet.
              </p>
            ) : (
              <ul className="space-y-1">
                {research.slice(0, 4).map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/dashboard/research/${item.slug}`}
                      className="-mx-2 flex items-start gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    >
                      <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                          {item.title}
                        </span>
                        {typeof item.viewCount === 'number' && (
                          <span className="text-xs text-slate-400">
                            {item.viewCount} views
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {whatsappGroupLink && (
            <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#25D366] to-[#128C7E] p-5 text-white">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <MessageCircle className="h-5 w-5" />
              </span>
              <p className="mt-3 font-display text-base font-bold">PPIA WhatsApp group</p>
              <p className="mt-1 text-sm text-white/85">
                Connect with other members and hear about events sooner.
              </p>
              <a
                href={whatsappGroupLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#128C7E] transition-colors hover:bg-white/90"
              >
                Join now
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <section>
        <SectionHeading title="Quick access" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {QUICK_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
            >
              <span
                className={cn(
                  'mb-3 flex h-11 w-11 items-center justify-center rounded-xl transition-transform group-hover:scale-105',
                  item.tint
                )}
              >
                <item.icon className="h-5 w-5" />
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {item.label}
              </span>
              <span className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {item.description}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
