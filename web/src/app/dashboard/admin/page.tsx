'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { Badge, Button } from '@/components/ui';
import { useToast } from '@/components/Toast';
import {
  BarChart,
  DonutChart,
  KpiCard,
  KpiGrid,
  useDashboardData,
} from '@/components/dashboard';
import { cn, formatRelativeTime } from '@/lib/utils';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Check,
  Download,
  Eye,
  FileEdit,
  FileText,
  Layout,
  MessageSquare,
  Settings,
  Shield,
  Sparkles,
  UserCheck,
  Users,
  X,
} from 'lucide-react';

interface DashboardAnalytics {
  overview: {
    totalArticles: number;
    totalResearch: number;
    totalMembers: number;
    totalEvents: number;
    upcomingEvents: number;
  };
  today: { articles: number; research: number; newMembers: number };
  engagement: {
    totalArticleViews: number;
    totalResearchViews: number;
    totalDownloads: number;
  };
  recentActivity: {
    articles: { id: string; title: string; slug: string; createdAt: string; views: number }[];
    research: { id: string; title: string; slug: string; createdAt: string; viewCount: number }[];
    members: { id: string; name: string; email: string; createdAt: string }[];
  };
}

interface ArticleAnalytics {
  summary: {
    total: number;
    published: number;
    drafts: number;
    featured: number;
    totalViews: number;
    totalLikes: number;
  };
  topArticles: { id: string; title: string; slug: string; views: number; likes: number }[];
  articlesPerDay: { date: string; count: number | string }[];
}

interface PendingMember {
  id: string;
  name: string;
  email: string;
  university?: string;
  createdAt: string;
}

type ActivityTab = 'articles' | 'research' | 'members';

const EMPTY_ANALYTICS: DashboardAnalytics = {
  overview: { totalArticles: 0, totalResearch: 0, totalMembers: 0, totalEvents: 0, upcomingEvents: 0 },
  today: { articles: 0, research: 0, newMembers: 0 },
  engagement: { totalArticleViews: 0, totalResearchViews: 0, totalDownloads: 0 },
  recentActivity: { articles: [], research: [], members: [] },
};

const SITE_SHORTCUTS = [
  {
    label: 'Homepage',
    description: 'Visual editor for the homepage hero, sections, and images',
    href: '/dashboard/admin/canvas',
    icon: Layout,
    tint: 'bg-[#FFF0EF] text-[#E8231A] dark:bg-[#E8231A]/20 dark:text-[#FF8A84]',
    superAdminOnly: false,
  },
  {
    label: 'Static pages',
    description: 'About, Contact, Scholarships, and other pages',
    href: '/dashboard/admin/pages',
    icon: FileEdit,
    tint: 'bg-teal-50 text-teal-600 dark:bg-teal-900/40 dark:text-teal-300',
    superAdminOnly: false,
  },
  {
    // Navigation, footer links and theme colours are site configuration rather
    // than content, so content editors (BOARD) do not see this.
    label: 'Menus & theme',
    description: 'Navigation, footer, social links, and site colours',
    href: '/dashboard/admin/landing-page',
    icon: Settings,
    tint: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    superAdminOnly: true,
  },
];

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-50">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

function Panel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
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

export default function AdminDashboardPage() {
  const { user, isLoading } = useAuth();
  const { showSuccess, showError } = useToast();
  const { refresh: refreshShellData } = useDashboardData();

  const [analytics, setAnalytics] = useState<DashboardAnalytics>(EMPTY_ANALYTICS);
  const [articleStats, setArticleStats] = useState<ArticleAnalytics | null>(null);
  const [commentStats, setCommentStats] = useState<{ total: number; hidden: number; last7Days: number } | null>(null);
  const [pending, setPending] = useState<PendingMember[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [divisions, setDivisions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activityTab, setActivityTab] = useState<ActivityTab>('articles');
  const [busyMember, setBusyMember] = useState<string | null>(null);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const canView = user?.role === 'SUPER_ADMIN' || user?.role === 'BOARD';

  const loadData = useCallback(async () => {
    if (!canView) return;

    const [dashboardRes, articleRes, commentRes, divisionRes, pendingRes] = await Promise.allSettled([
      api.getDashboardAnalytics(),
      api.getArticleAnalytics({ period: 30 }),
      api.getCommentStats(),
      api.getDivisions(),
      isSuperAdmin
        ? api.getMembers({ limit: 5, membershipStatus: 'PENDING' })
        : Promise.resolve(null),
    ]);

    if (dashboardRes.status === 'fulfilled' && dashboardRes.value) {
      const payload = dashboardRes.value as Partial<DashboardAnalytics>;
      setAnalytics({
        overview: { ...EMPTY_ANALYTICS.overview, ...payload.overview },
        today: { ...EMPTY_ANALYTICS.today, ...payload.today },
        engagement: { ...EMPTY_ANALYTICS.engagement, ...payload.engagement },
        recentActivity: { ...EMPTY_ANALYTICS.recentActivity, ...payload.recentActivity },
      });
    }

    if (articleRes.status === 'fulfilled' && articleRes.value) {
      setArticleStats(articleRes.value as ArticleAnalytics);
    }

    if (commentRes.status === 'fulfilled' && commentRes.value) {
      const payload = commentRes.value as {
        stats?: { total?: number; hidden?: number; last7Days?: number };
      };
      setCommentStats({
        total: payload.stats?.total ?? 0,
        hidden: payload.stats?.hidden ?? 0,
        last7Days: payload.stats?.last7Days ?? 0,
      });
    }

    if (divisionRes.status === 'fulfilled' && divisionRes.value) {
      const payload = divisionRes.value as { divisions?: unknown[] };
      setDivisions(payload.divisions?.length ?? 0);
    }

    if (pendingRes.status === 'fulfilled' && pendingRes.value) {
      // Every list endpoint returns { <key>, pagination: { total } } — the old
      // dashboard read `.total` off the root, so every counter showed 0.
      const payload = pendingRes.value as {
        members?: PendingMember[];
        pagination?: { total?: number };
      };
      setPending(payload.members ?? []);
      setPendingTotal(payload.pagination?.total ?? payload.members?.length ?? 0);
    }

    setLoading(false);
  }, [canView, isSuperAdmin]);

  /* eslint-disable react-hooks/set-state-in-effect --
     loadData() only writes state after awaiting the network, which is the
     intended way to fetch on mount; the linter cannot see past the call. */
  useEffect(() => {
    if (!user || !canView) return;
    loadData();
  }, [user, canView, loadData]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Non-admins never trigger a fetch, so the skeleton must not depend on it.
  const showSkeleton = loading && canView;

  const handleApprove = async (member: PendingMember) => {
    setBusyMember(member.id);
    try {
      await api.approveMember(member.id);
      showSuccess(`${member.name} approved as a member`);
      setPending((list) => list.filter((item) => item.id !== member.id));
      setPendingTotal((total) => Math.max(0, total - 1));
      refreshShellData();
    } catch (error) {
      const err = error as { message?: string };
      showError(err.message || 'Could not approve member');
    } finally {
      setBusyMember(null);
    }
  };

  const handleReject = async (member: PendingMember) => {
    const reason = window.prompt(`Reason for rejecting ${member.name} (optional):`);
    if (reason === null) return;
    setBusyMember(member.id);
    try {
      await api.rejectMember(member.id, reason || undefined);
      showSuccess(`Registration for ${member.name} rejected`);
      setPending((list) => list.filter((item) => item.id !== member.id));
      setPendingTotal((total) => Math.max(0, total - 1));
      refreshShellData();
    } catch (error) {
      const err = error as { message?: string };
      showError(err.message || 'Could not reject member');
    } finally {
      setBusyMember(null);
    }
  };

  /** Last 14 days of article creation, zero-filled so the chart has no gaps. */
  const articleTrend = useMemo(() => {
    const byDate = new Map<string, number>();
    (articleStats?.articlesPerDay ?? []).forEach((row) => {
      const key = new Date(row.date).toISOString().slice(0, 10);
      byDate.set(key, Number(row.count) || 0);
    });
    const days: { label: string; value: number; key: string }[] = [];
    for (let offset = 13; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - offset);
      const key = date.toISOString().slice(0, 10);
      days.push({
        key,
        label: date.toLocaleDateString('en-NZ', { day: 'numeric' }),
        value: byDate.get(key) ?? 0,
      });
    }
    return days;
  }, [articleStats]);

  const engagementSlices = useMemo(() => {
    const { totalArticleViews, totalResearchViews, totalDownloads } = analytics.engagement;
    return [
      { label: 'Views (articles)', value: totalArticleViews, color: '#E8231A' },
      { label: 'Views (research)', value: totalResearchViews, color: '#1A2B4A' },
      { label: 'Research downloads', value: totalDownloads, color: '#10B981' },
    ];
  }, [analytics.engagement]);

  const activityItems = useMemo(() => {
    const { articles, research, members } = analytics.recentActivity;
    if (activityTab === 'articles') {
      return articles.map((item) => ({
        id: item.id,
        title: item.title,
        meta: `${item.views ?? 0} views`,
        at: item.createdAt,
        /**
         * Articles have no read-only detail route — `articles/[id]` only holds
         * `edit`, and the list page shows detail in a modal instead. So the
         * item opens the editor, which is what the list's own row action does.
         * This used to point at the bare list, meaning every row in this panel
         * led to the same place and the click told the user nothing.
         */
        href: `/dashboard/admin/articles/${item.id}/edit`,
      }));
    }
    if (activityTab === 'research') {
      return research.map((item) => ({
        id: item.id,
        title: item.title,
        meta: `${item.viewCount ?? 0} views`,
        at: item.createdAt,
        href: `/dashboard/admin/research/${item.id}`,
      }));
    }
    return members.map((item) => ({
      id: item.id,
      title: item.name,
      meta: item.email,
      at: item.createdAt,
      href: `/dashboard/admin/members/${item.id}`,
    }));
  }, [analytics.recentActivity, activityTab]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-[#E8231A]" />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-danger-50 dark:bg-danger-900/40">
          <Shield className="h-8 w-8 text-danger-600 dark:text-danger-300" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-slate-100">Access denied</h2>
        <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
          You do not have permission to open the admin panel.
        </p>
        <Link href="/dashboard">
          <Button variant="primary">Go to member dashboard</Button>
        </Link>
      </div>
    );
  }

  const publishRate =
    articleStats && articleStats.summary.total > 0
      ? Math.round((articleStats.summary.published / articleStats.summary.total) * 100)
      : 0;

  return (
    <div className="animate-fade-in space-y-8">
      {/* Greeting */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0D1B33] via-[#1A2B4A] to-[#24406f] p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-0 opacity-[0.06] dashboard-grid-texture" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#E8231A]/25 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="danger" size="md">
                {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Board'}
              </Badge>
              <span className="text-xs text-white/60">
                {new Date().toLocaleDateString('en-NZ', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
            <h1 className="mt-2 font-display text-2xl font-black tracking-tight text-white sm:text-3xl">
              {greeting()}, {user?.firstName || user?.name}
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-white/70">
              {!isSuperAdmin
                ? 'You manage site content: articles, events, research, and pages.'
                : pendingTotal > 0
                  ? `There are ${pendingTotal} member registrations waiting for your decision.`
                  : 'No approvals in the queue. The platform is running normally.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard/admin/analytics"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              <Sparkles className="h-4 w-4" />
              View analytics
            </Link>
            <Link
              href="/dashboard/admin/canvas"
              className="inline-flex items-center gap-2 rounded-xl bg-[#E8231A] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#C41E16]"
            >
              <Layout className="h-4 w-4" />
              Edit homepage
            </Link>
          </div>
        </div>
      </section>

      {/* KPI */}
      <KpiGrid>
        <KpiCard
          label="Members"
          value={analytics.overview.totalMembers}
          icon={Users}
          tone="navy"
          meta={
            analytics.today.newMembers > 0
              ? `+${analytics.today.newMembers} registered today`
              : `${divisions} active divisions`
          }
          href={isSuperAdmin ? '/dashboard/admin/members' : undefined}
          isLoading={showSkeleton}
        />
        <KpiCard
          label="Upcoming events"
          value={analytics.overview.upcomingEvents}
          icon={Calendar}
          tone="red"
          meta={`${analytics.overview.totalEvents} events scheduled`}
          href="/dashboard/admin/events"
          isLoading={showSkeleton}
        />
        <KpiCard
          label="Articles"
          value={analytics.overview.totalArticles}
          icon={FileText}
          tone="emerald"
          meta={
            articleStats
              ? `${articleStats.summary.drafts} drafts • ${publishRate}% published`
              : 'Loading…'
          }
          trend={articleTrend.map((day) => day.value)}
          href="/dashboard/admin/articles"
          isLoading={showSkeleton}
        />
        <KpiCard
          label="Research"
          value={analytics.overview.totalResearch}
          icon={BookOpen}
          tone="violet"
          meta={`${analytics.engagement.totalDownloads} downloads in total`}
          href="/dashboard/admin/research"
          isLoading={showSkeleton}
        />
      </KpiGrid>

      {/* Needs attention + activity */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-6">
          {/* Approval queue */}
          {isSuperAdmin && (
            <Panel>
              <SectionHeading
                title="Needs attention"
                description="Member registrations pending approval"
                action={
                  pendingTotal > 0 ? (
                    <Link
                      href="/dashboard/admin/members?status=PENDING"
                      className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[#E8231A] hover:underline"
                    >
                      View all ({pendingTotal})
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : undefined
                }
              />

              {showSkeleton ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((row) => (
                    <div key={row} className="h-16 rounded-xl skeleton" />
                  ))}
                </div>
              ) : pending.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-success-50 dark:bg-success-900/40">
                    <UserCheck className="h-5 w-5 text-success-700 dark:text-success-300" />
                  </span>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    The approval queue is empty
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Every registration has been processed.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {pending.map((member) => (
                    <li
                      key={member.id}
                      className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center dark:border-slate-800"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard/admin/members/${member.id}`}
                            className="truncate text-sm font-semibold text-slate-900 hover:underline dark:text-slate-100"
                          >
                            {member.name}
                          </Link>
                          <Badge variant="warning">Pending</Badge>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                          {member.email}
                          {member.university ? ` • ${member.university}` : ''} •{' '}
                          {formatRelativeTime(member.createdAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          size="xs"
                          variant="success"
                          leftIcon={<Check className="h-3.5 w-3.5" />}
                          isLoading={busyMember === member.id}
                          onClick={() => handleApprove(member)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="xs"
                          variant="secondary"
                          leftIcon={<X className="h-3.5 w-3.5" />}
                          disabled={busyMember === member.id}
                          onClick={() => handleReject(member)}
                        >
                          Reject
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}

          {/* Article publishing trend */}
          <Panel>
            <SectionHeading
              title="Articles published in the last 14 days"
              description={
                articleStats
                  ? `${articleStats.summary.totalViews.toLocaleString('en-NZ')} total views • ${articleStats.summary.totalLikes.toLocaleString('en-NZ')} likes`
                  : undefined
              }
            />
            {showSkeleton ? (
              <div className="h-40 rounded-xl skeleton" />
            ) : (
              <BarChart data={articleTrend.map(({ label, value }) => ({ label, value }))} />
            )}
          </Panel>

          {/* Recent activity */}
          <Panel>
            <SectionHeading title="Recent activity" />
            <div className="mb-4 flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              {(
                [
                  ['articles', 'Articles'],
                  ['research', 'Research'],
                  ['members', 'Members'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActivityTab(key)}
                  className={cn(
                    'flex-1 rounded-lg py-1.5 text-sm font-semibold transition-colors',
                    activityTab === key
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {showSkeleton ? (
              <div className="space-y-2">
                {[0, 1, 2, 3].map((row) => (
                  <div key={row} className="h-12 rounded-lg skeleton" />
                ))}
              </div>
            ) : activityItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                No activity yet.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {activityItems.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                          {item.title}
                        </span>
                        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                          {item.meta}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-slate-400">
                        {formatRelativeTime(item.at)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <Panel>
            <SectionHeading title="Engagement" description="Accumulated since launch" />
            {showSkeleton ? (
              <div className="h-36 rounded-xl skeleton" />
            ) : (
              <DonutChart
                slices={engagementSlices}
                centerLabel="interactions"
                centerValue={engagementSlices
                  .reduce((sum, slice) => sum + slice.value, 0)
                  .toLocaleString('en-NZ')}
              />
            )}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <Eye className="mb-1.5 h-4 w-4 text-slate-400" />
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {analytics.engagement.totalArticleViews.toLocaleString('en-NZ')}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Article views</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <Download className="mb-1.5 h-4 w-4 text-slate-400" />
                <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {analytics.engagement.totalDownloads.toLocaleString('en-NZ')}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Research downloads</p>
              </div>
            </div>
          </Panel>

          {/* Top articles */}
          <Panel>
            <SectionHeading
              title="Top articles"
              action={
                <Link
                  href="/dashboard/admin/analytics"
                  className="shrink-0 text-sm font-semibold text-[#E8231A] hover:underline"
                >
                  Details
                </Link>
              }
            />
            {showSkeleton ? (
              <div className="space-y-2">
                {[0, 1, 2].map((row) => (
                  <div key={row} className="h-10 rounded-lg skeleton" />
                ))}
              </div>
            ) : (articleStats?.topArticles?.length ?? 0) === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                No visit data yet.
              </p>
            ) : (
              <ol className="space-y-2.5">
                {articleStats?.topArticles.slice(0, 5).map((article, index) => (
                  <li key={article.id} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {article.title}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {article.views.toLocaleString('en-NZ')} views • {article.likes} likes
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          {/* Moderation snapshot */}
          <Panel>
            <SectionHeading title="Moderation" />
            <ul className="space-y-2.5">
              {[
                {
                  label: 'Comments this week',
                  value: commentStats?.last7Days ?? 0,
                  href: '/dashboard/admin/comments',
                  icon: MessageSquare,
                },
                {
                  label: 'Hidden comments',
                  value: commentStats?.hidden ?? 0,
                  href: '/dashboard/admin/comments',
                  icon: Shield,
                },
                {
                  label: 'Total comments',
                  value: commentStats?.total ?? 0,
                  href: '/dashboard/admin/comments',
                  icon: MessageSquare,
                },
              ].map((row) => (
                <li key={row.label}>
                  <Link
                    href={row.href}
                    className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  >
                    <row.icon className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-600 dark:text-slate-300">
                      {row.label}
                    </span>
                    <span className="shrink-0 text-sm font-bold text-slate-900 dark:text-slate-100">
                      {row.value}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      {/* Site content shortcuts */}
      <section>
        <SectionHeading
          title="Site content"
          description="The editor entry points you use most"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {SITE_SHORTCUTS.filter((item) => !item.superAdminOnly || isSuperAdmin).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex h-full items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
            >
              <span
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                  item.tint
                )}
              >
                <item.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-slate-100">
                  {item.label}
                  <ArrowRight className="h-3.5 w-3.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {item.description}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
