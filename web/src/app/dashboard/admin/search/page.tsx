'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import api from '@/lib/api';
import { Badge, Button } from '@/components/ui';
import {
  AccessDenied,
  EmptyBlock,
  Field,
  LoadingRows,
  PageHeading,
  PageStack,
  SectionCard,
  StatTile,
  StatTileRow,
  TableShell,
  Td,
  Th,
  Tr,
} from '@/components/dashboard';
import {
  AlertCircle,
  BarChart3,
  Calendar,
  FileText,
  Hash,
  Play,
  Search as SearchIcon,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type SearchType = '' | 'events' | 'articles' | 'members';

const SEARCH_TYPES: { value: SearchType; label: string }[] = [
  { value: '', label: 'All types' },
  { value: 'events', label: 'Event' },
  { value: 'articles', label: 'Article' },
  { value: 'members', label: 'Member' },
];

interface SearchResultItem {
  id?: string;
  type?: string;
  title?: string;
  name?: string;
  description?: string;
  excerpt?: string;
  slug?: string;
}

interface SearchResults {
  results?: SearchResultItem[];
  events?: SearchResultItem[];
  articles?: SearchResultItem[];
  members?: SearchResultItem[];
  total?: number;
}

const TYPE_META: Record<string, { label: string; icon: LucideIcon; className: string }> = {
  event: { label: 'Event', icon: Calendar, className: 'text-[#E8231A]' },
  events: { label: 'Event', icon: Calendar, className: 'text-[#E8231A]' },
  article: { label: 'Article', icon: FileText, className: 'text-emerald-500' },
  articles: { label: 'Article', icon: FileText, className: 'text-emerald-500' },
  member: { label: 'Member', icon: Users, className: 'text-sky-500' },
  members: { label: 'Member', icon: Users, className: 'text-sky-500' },
};

function flattenResults(payload: SearchResults | null): SearchResultItem[] {
  if (!payload) return [];
  if (Array.isArray(payload.results)) return payload.results;
  const buckets: SearchResultItem[] = [];
  if (Array.isArray(payload.events)) {
    buckets.push(...payload.events.map((item) => ({ ...item, type: item.type ?? 'event' })));
  }
  if (Array.isArray(payload.articles)) {
    buckets.push(...payload.articles.map((item) => ({ ...item, type: item.type ?? 'article' })));
  }
  if (Array.isArray(payload.members)) {
    buckets.push(...payload.members.map((item) => ({ ...item, type: item.type ?? 'member' })));
  }
  return buckets;
}

export default function AdminSearchPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const [queryInput, setQueryInput] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('');
  const [searching, setSearching] = useState(false);
  const [payload, setPayload] = useState<SearchResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** The query that was actually run, kept separate from the input box content. */
  const [ranQuery, setRanQuery] = useState('');
  const [ranType, setRanType] = useState<SearchType>('');

  // The search console touches member data, so only Super Admin can view it.
  const canView = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const results = useMemo(() => flattenResults(payload), [payload]);

  const typeCounts = useMemo(() => {
    const result = { events: 0, articles: 0, members: 0 };
    results.forEach((item) => {
      const type = (item.type || '').toLowerCase();
      if (type.startsWith('event')) result.events += 1;
      else if (type.startsWith('article')) result.articles += 1;
      else if (type.startsWith('member')) result.members += 1;
    });
    return result;
  }, [results]);

  const runSearch = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const query = queryInput.trim();
    if (!query) return;

    setSearching(true);
    setError(null);
    setPayload(null);
    setRanQuery(query);
    setRanType(searchType);
    try {
      const data = await api.search(query, searchType === '' ? undefined : searchType, {
        limit: 10,
      });
      setPayload(data as SearchResults);
    } catch (requestError) {
      const err = requestError as {
        response?: { data?: { error?: string; message?: string } };
        message?: string;
      };
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          err.message ||
          'The search could not be run'
      );
    } finally {
      setSearching(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-60 rounded skeleton" />
          <div className="h-4 w-80 rounded skeleton" />
        </div>
        <div className="h-40 rounded-[5px] skeleton" />
        <LoadingRows rows={4} />
      </div>
    );
  }

  if (!canView) {
    return (
      <AccessDenied message="Only Super Admin can use the search console." backHref="/dashboard" />
    );
  }

  return (
    <PageStack>
      <PageHeading
        title="Search console"
        description="Test the site search index for events, articles, and members."
        icon={SearchIcon}
        backHref="/dashboard/admin"
        backLabel="Back to admin panel"
      />

      <SectionCard
        title="Run a query"
        description="Queries are sent to the public search endpoint. It is read-only and safe to run any time."
        icon={Play}
        action={<Badge variant="success" className="data-type uppercase">Active</Badge>}
      >
        <form onSubmit={runSearch} className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <Field label="Keyword" htmlFor="search-query" className="flex-1">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ink-muted" />
                <input
                  id="search-query"
                  type="search"
                  value={queryInput}
                  onChange={(event) => setQueryInput(event.target.value)}
                  placeholder="For example: scholarships, webinar, or a member's name"
                  className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700 input-with-icon"
                />
              </div>
            </Field>
            <Field label="Content type" htmlFor="search-type" className="lg:w-52">
              <select
                id="search-type"
                value={searchType}
                onChange={(event) => setSearchType(event.target.value as SearchType)}
                className="input-base rounded-[4px] border-[#C3D2E0] dark:border-slate-700"
              >
                {SEARCH_TYPES.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Button
              type="submit"
              variant="primary"
              leftIcon={<Play className="h-4 w-4" />}
              isLoading={searching}
              disabled={!queryInput.trim()}
              className="lg:mb-0"
            >
              Run
            </Button>
          </div>
        </form>
      </SectionCard>

      {results.length > 0 && (
        <StatTileRow columns={4}>
          <StatTile
            label="Total results"
            value={payload?.total ?? results.length}
            tone="slate"
            icon={Hash}
          />
          <StatTile label="Events" value={typeCounts.events} tone="red" icon={Calendar} />
          <StatTile label="Articles" value={typeCounts.articles} tone="emerald" icon={FileText} />
          <StatTile label="Members" value={typeCounts.members} tone="sky" icon={Users} />
        </StatTileRow>
      )}

      {searching ? (
        <SectionCard title="Search results">
          <LoadingRows rows={4} />
        </SectionCard>
      ) : error ? (
        <SectionCard flush>
          <EmptyBlock
            icon={AlertCircle}
            title="Search failed"
            description={error}
            action={
              <Button variant="secondary" onClick={() => runSearch()}>
                Try again
              </Button>
            }
          />
        </SectionCard>
      ) : payload && results.length === 0 ? (
        <SectionCard flush>
          <EmptyBlock
            icon={SearchIcon}
            title="No results"
            description={`The query "${ranQuery}" found no matches. Try a different keyword or type.`}
          />
        </SectionCard>
      ) : results.length > 0 ? (
        <TableShell
          head={
            <>
              <Th>Title</Th>
              <Th>Type</Th>
              <Th>Summary</Th>
            </>
          }
          footer={
            <div className="data-type flex flex-wrap items-center justify-between gap-2 border-t border-[#E7EFF7] px-5 py-3 text-[12px] ink-muted dark:border-slate-800">
              <span>
                {results.length} results shown
                {typeof payload?.total === 'number' && payload.total !== results.length
                  ? ` of ${payload.total}`
                  : ''}
              </span>
              <span>
                q=&quot;{ranQuery}&quot;{ranType ? `, type=${ranType}` : ''}
              </span>
            </div>
          }
        >
          {results.slice(0, 10).map((item, index) => {
            const meta = TYPE_META[(item.type || '').toLowerCase()];
            const Icon = meta?.icon ?? Hash;
            const summary = item.description || item.excerpt;
            return (
              <Tr key={item.id ?? `${item.slug ?? 'result'}-${index}`}>
                <Td>
                  <span className="flex items-center gap-2">
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${meta?.className ?? 'ink-muted'}`} />
                    <span className="font-semibold ink-strong">
                      {item.title || item.name || `Result ${index + 1}`}
                    </span>
                  </span>
                  {item.slug && (
                    <span className="data-type mt-0.5 block text-[12px] ink-muted">
                      /{item.slug}
                    </span>
                  )}
                </Td>
                <Td>
                  <Badge variant="outline" className="data-type uppercase">{meta?.label ?? 'Other'}</Badge>
                </Td>
                <Td>
                  {summary ? (
                    <span className="line-clamp-2 max-w-lg ink-body">
                      {summary}
                    </span>
                  ) : (
                    <span className="ink-muted">—</span>
                  )}
                </Td>
              </Tr>
            );
          })}
        </TableShell>
      ) : (
        <SectionCard flush>
          <EmptyBlock
            icon={SearchIcon}
            title="No query run yet"
            description="Enter a keyword above and press Run to see the results."
          />
        </SectionCard>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard
          title="Top queries"
          description="The keywords visitors search for most often."
          icon={TrendingUp}
          flush
        >
          <EmptyBlock
            icon={BarChart3}
            title="Not available yet"
            description="There is no search statistics endpoint yet, so these numbers are intentionally left blank."
          />
        </SectionCard>
        <SectionCard
          title="Queries with no results"
          description="Searches that found nothing — content gaps."
          icon={AlertCircle}
          flush
        >
          <EmptyBlock
            icon={AlertCircle}
            title="Not available yet"
            description="This will fill in once the backend starts recording search history."
          />
        </SectionCard>
        <SectionCard
          title="Breakdown by type"
          description="A comparison of event, article, and member searches."
          icon={BarChart3}
          flush
        >
          <EmptyBlock
            icon={BarChart3}
            title="Not available yet"
            description="The historical breakdown is waiting on the search statistics endpoint."
          />
        </SectionCard>
      </div>
    </PageStack>
  );
}
