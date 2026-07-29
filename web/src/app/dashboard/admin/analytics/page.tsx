'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { Badge, Button } from '@/components/ui';
import {
  AccessDenied,
  BarChart,
  DonutChart,
  EmptyBlock,
  KpiCard,
  KpiGrid,
  PageHeading,
  PageStack,
  SectionCard,
  SectionHeading,
  TableShell,
  Td,
  Th,
  Tr,
} from '@/components/dashboard';
import { cn, formatRelativeTime } from '@/lib/utils';
import {
  Activity,
  BarChart3,
  Calendar,
  Eye,
  FileText,
  RefreshCw,
  Users,
} from 'lucide-react';

/** Number of days used for the chart and the "this period" counts. */
const PERIODS = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
];

interface MemberRow {
  createdAt: string;
}

interface EventRow {
  startDate: string;
  published?: boolean;
}

interface ArticleRow {
  id: string;
  title: string;
  slug?: string;
  createdAt: string;
  views?: number;
  published?: boolean;
}

interface AuditRow {
  id: string;
  action: string;
  entity: string;
  createdAt: string;
  user?: { name: string };
}

const ACTION_VARIANT: Record<string, 'success' | 'primary' | 'danger' | 'default'> = {
  CREATE: 'success',
  UPDATE: 'primary',
  DELETE: 'danger',
};

const ACTION_LABEL: Record<string, string> = {
  CREATE: 'Create',
  UPDATE: 'Update',
  DELETE: 'Delete',
  SEND: 'Send',
};

const DAY_MS = 24 * 60 * 60 * 1000;

export default function AnalyticsPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const [events, setEvents] = useState<EventRow[]>([]);
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [activity, setActivity] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState(30);
  /**
   * "Now" is captured when the data arrives instead of during render, so the
   * period split stays stable across renders.
   */
  const [nowTs, setNowTs] = useState(0);

  // Analytics is read-only over content, so Board can view it too.
  const canView = user?.role === 'SUPER_ADMIN' || user?.role === 'BOARD';
  // Member data and the audit trail are Super Admin only.
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const fetchAnalytics = useCallback(async () => {
    const [eventsRes, articlesRes, membersRes, auditRes] = await Promise.allSettled([
      api.getEventsAdmin(),
      api.getArticlesAdmin(),
      isSuperAdmin ? api.getMembers({ limit: 1000 }) : Promise.resolve(null),
      isSuperAdmin ? api.getAuditLogs({ limit: 10 }) : Promise.resolve(null),
    ]);

    if (eventsRes.status === 'fulfilled' && eventsRes.value) {
      const payload = eventsRes.value as { events?: EventRow[] } | EventRow[];
      setEvents(Array.isArray(payload) ? payload : payload.events ?? []);
    }

    if (articlesRes.status === 'fulfilled' && articlesRes.value) {
      const payload = articlesRes.value as { articles?: ArticleRow[] } | ArticleRow[];
      setArticles(Array.isArray(payload) ? payload : payload.articles ?? []);
    }

    if (membersRes.status === 'fulfilled' && membersRes.value) {
      const payload = membersRes.value as { members?: MemberRow[] } | MemberRow[];
      setMembers(Array.isArray(payload) ? payload : payload.members ?? []);
    }

    if (auditRes.status === 'fulfilled' && auditRes.value) {
      const payload = auditRes.value as { logs?: AuditRow[] };
      setActivity(payload.logs ?? []);
    }

    setNowTs(Date.now());
    setLoading(false);
    setRefreshing(false);
  }, [isSuperAdmin]);

  /* eslint-disable react-hooks/set-state-in-effect --
     fetchAnalytics() only writes state after awaiting the network; the linter
     cannot see past the call. */
  useEffect(() => {
    if (user && canView) {
      fetchAnalytics();
    }
  }, [user, canView, fetchAnalytics]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Non-admins never trigger the fetch, so the skeleton must not wait on it.
  const showSkeleton = (isLoading || loading) && (isLoading || canView);

  const periodStart = nowTs - period * DAY_MS;

  const totals = useMemo(() => {
    const totalViews = articles.reduce((sum, article) => sum + (article.views || 0), 0);
    return {
      members: members.length,
      events: events.length,
      articles: articles.length,
      views: totalViews,
      avgViews: articles.length > 0 ? Math.round(totalViews / articles.length) : 0,
      publishedArticles: articles.filter((article) => article.published !== false).length,
      publishedEvents: events.filter((event) => event.published !== false).length,
    };
  }, [members, events, articles]);

  const inPeriod = useMemo(() => {
    const countSince = (values: (string | undefined)[]) =>
      values.filter((value) => {
        if (!value) return false;
        const timestamp = new Date(value).getTime();
        return Number.isFinite(timestamp) && timestamp >= periodStart && timestamp <= nowTs;
      }).length;

    return {
      members: countSince(members.map((member) => member.createdAt)),
      events: countSince(events.map((event) => event.startDate)),
      articles: countSince(articles.map((article) => article.createdAt)),
    };
  }, [members, events, articles, periodStart, nowTs]);

  /** Articles created per time bucket, split evenly across the period. */
  const articleTrend = useMemo(() => {
    if (nowTs === 0) return [] as { label: string; value: number }[];
    const buckets = period <= 7 ? 7 : period <= 30 ? 10 : 12;
    const bucketMs = (period * DAY_MS) / buckets;
    const series = Array.from({ length: buckets }, (_, index) => {
      const start = periodStart + index * bucketMs;
      return {
        label: new Date(start + bucketMs / 2).toLocaleDateString('en-NZ', {
          day: '2-digit',
          month: 'short',
        }),
        value: 0,
      };
    });

    articles.forEach((article) => {
      const timestamp = new Date(article.createdAt).getTime();
      if (!Number.isFinite(timestamp) || timestamp < periodStart || timestamp > nowTs) return;
      const index = Math.min(buckets - 1, Math.floor((timestamp - periodStart) / bucketMs));
      series[index].value += 1;
    });

    return series;
  }, [articles, period, periodStart, nowTs]);

  const contentMix = useMemo(
    () => [
      { label: 'Articles', value: totals.articles, color: '#10B981' },
      { label: 'Events', value: totals.events, color: '#E8231A' },
      { label: 'Members', value: totals.members, color: '#1A2B4A' },
    ],
    [totals]
  );

  const topArticles = useMemo(
    () =>
      [...articles]
        .sort((a, b) => (b.views || 0) - (a.views || 0))
        .slice(0, 8)
        .filter((article) => (article.views || 0) > 0),
    [articles]
  );

  if (showSkeleton) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-56 rounded skeleton" />
          <div className="h-4 w-80 rounded skeleton" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((card) => (
            <div key={card} className="h-36 rounded-[5px] skeleton" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="h-72 rounded-[5px] skeleton lg:col-span-2" />
          <div className="h-72 rounded-[5px] skeleton" />
        </div>
      </div>
    );
  }

  if (!canView) {
    return (
      <AccessDenied
        message="Only Super Admin and Board can view analytics."
        backHref="/dashboard"
      />
    );
  }

  const periodLabel = PERIODS.find((option) => option.value === period)?.label ?? `${period} days`;

  return (
    <PageStack>
      <PageHeading
        title="Analytics"
        description={`A summary of content and community performance for the last ${periodLabel}.`}
        icon={BarChart3}
        backHref="/dashboard/admin"
        backLabel="Back to admin panel"
        actions={
          <>
            <div
              role="group"
              aria-label="Select period"
              className="chart-paper flex rounded-[4px] border border-[#DCE7F1] p-1 dark:border-slate-700"
            >
              {PERIODS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPeriod(option.value)}
                  aria-pressed={period === option.value}
                  className={cn(
                    'rounded-[4px] px-3 py-1.5 text-sm font-semibold transition-colors',
                    period === option.value
                      ? 'bg-[#0D1B33] text-white'
                      : 'ink-muted hover:text-slate-900 dark:hover:text-slate-100'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />}
              onClick={() => {
                setRefreshing(true);
                fetchAnalytics();
              }}
            >
              Refresh
            </Button>
          </>
        }
      />

      <KpiGrid>
        {isSuperAdmin && (
          <KpiCard
            label="Members"
            value={totals.members}
            icon={Users}
            tone="navy"
            meta={`+${inPeriod.members} in ${periodLabel}`}
            href="/dashboard/admin/members"
          />
        )}
        <KpiCard
          label="Events"
          value={totals.events}
          icon={Calendar}
          tone="red"
          meta={`${inPeriod.events} scheduled in ${periodLabel}`}
          href="/dashboard/admin/events"
        />
        <KpiCard
          label="Articles"
          value={totals.articles}
          icon={FileText}
          tone="emerald"
          meta={`${inPeriod.articles} new in ${periodLabel}`}
          trend={articleTrend.map((bucket) => bucket.value)}
          href="/dashboard/admin/articles"
        />
        <KpiCard
          label="Total views"
          value={totals.views}
          icon={Eye}
          tone="violet"
          meta={`Average ${totals.avgViews.toLocaleString('en-NZ')} per article`}
        />
      </KpiGrid>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SectionCard
          title={`New articles in ${periodLabel}`}
          description={`${inPeriod.articles} articles created in this period.`}
          icon={BarChart3}
          className="lg:col-span-2"
        >
          {articleTrend.length === 0 || inPeriod.articles === 0 ? (
            <EmptyBlock
              icon={BarChart3}
              title="No articles in this period"
              description="Try a longer period."
            />
          ) : (
            <BarChart data={articleTrend} />
          )}
        </SectionCard>

        <SectionCard
          title="Platform mix"
          description="A comparison of the main entity counts."
          icon={Activity}
        >
          <DonutChart
            slices={contentMix}
            centerLabel="total entities"
            centerValue={contentMix
              .reduce((sum, slice) => sum + slice.value, 0)
              .toLocaleString('en-NZ')}
          />
          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className="ink-muted">Published articles</dt>
              <dd className="font-semibold ink-strong">
                {totals.publishedArticles}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="ink-muted">Published events</dt>
              <dd className="font-semibold ink-strong">
                {totals.publishedEvents}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="ink-muted">Average views</dt>
              <dd className="font-semibold ink-strong">
                {totals.avgViews.toLocaleString('en-NZ')}
              </dd>
            </div>
          </dl>
        </SectionCard>
      </div>

      <section>
        <SectionHeading
          title="Top content"
          description="Articles with the highest view counts of all time."
          action={
            <Link
              href="/dashboard/admin/articles"
              className="shrink-0 text-sm font-semibold text-[#E8231A] hover:underline"
            >
              Manage articles
            </Link>
          }
        />
        {topArticles.length === 0 ? (
          <SectionCard flush>
            <EmptyBlock
              icon={Eye}
              title="No view data yet"
              description="View counts appear after visitors read the articles."
            />
          </SectionCard>
        ) : (
          <TableShell
            head={
              <>
                <Th className="w-12">#</Th>
                <Th>Article</Th>
                <Th align="right">Views</Th>
                <Th align="right">Created</Th>
              </>
            }
          >
            {topArticles.map((article, index) => (
              <Tr key={article.id}>
                <Td>
                  <span className="flex h-6 w-6 items-center justify-center rounded-[3px] bg-[#EDF5FB] text-[12px] font-bold ink-muted dark:bg-slate-800">
                    {index + 1}
                  </span>
                </Td>
                <Td>
                  <span className="block max-w-lg truncate font-semibold ink-strong">
                    {article.title}
                  </span>
                  {article.slug && (
                    <span className="data-type block truncate text-[12px] ink-muted">/{article.slug}</span>
                  )}
                </Td>
                <Td align="right">
                  <span className="data-type font-semibold ink-strong">
                    {(article.views || 0).toLocaleString('en-NZ')}
                  </span>
                </Td>
                <Td align="right">
                  <span className="data-type whitespace-nowrap text-[12px] ink-muted">
                    {formatRelativeTime(article.createdAt)}
                  </span>
                </Td>
              </Tr>
            ))}
          </TableShell>
        )}
      </section>

      {isSuperAdmin && (
        <SectionCard
          title="Recent admin activity"
          description="The last ten actions from the audit trail."
          icon={Activity}
          action={
            <Link
              href="/dashboard/admin/audit-logs"
              className="text-sm font-semibold text-[#E8231A] hover:underline"
            >
              View all
            </Link>
          }
        >
          {activity.length === 0 ? (
            <EmptyBlock
              icon={Activity}
              title="No activity yet"
              description="Admin actions are recorded automatically in the audit trail."
            />
          ) : (
            <ul className="divide-y divide-[#E7EFF7] dark:divide-slate-800">
              {activity.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-2.5">
                  <Badge variant={ACTION_VARIANT[item.action] ?? 'default'} className="data-type uppercase">
                    {ACTION_LABEL[item.action] ?? item.action}
                  </Badge>
                  <span className="min-w-0 flex-1 truncate text-sm ink-body">
                    {item.user?.name || 'System'} on {item.entity}
                  </span>
                  <span className="shrink-0 text-[12px] ink-muted">
                    {formatRelativeTime(item.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      )}
    </PageStack>
  );
}
