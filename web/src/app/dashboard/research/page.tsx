'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Calendar, Download, Eye, FlaskConical, Users } from 'lucide-react';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui';
import {
  EmptyBlock,
  FilterSelect,
  LoadingRows,
  PageHeading,
  PageStack,
  ResetFiltersButton,
  SearchField,
  SectionCard,
  StatTile,
  StatTileRow,
  Toolbar,
} from '@/components/dashboard';

interface DivisionRef {
  id?: string;
  name: string;
  color?: string | null;
}

interface ResearchItem {
  id: string;
  slug?: string;
  title: string;
  abstract?: string;
  authors?: string;
  publicationDate?: string;
  venue?: string;
  category?: string;
  researchType?: string;
  /** Prisma exposes the relation as `Division`; keep the lowercase alias too. */
  Division?: DivisionRef | null;
  division?: DivisionRef | null;
  viewCount?: number;
  downloadCount?: number;
}

interface ResearchApiResponse {
  researches?: ResearchItem[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, '').trim();
}

function humanizeType(value?: string): string | undefined {
  if (!value) return undefined;
  const words = value.replace(/_/g, ' ').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function topicOf(paper: ResearchItem): string | undefined {
  return paper.category || humanizeType(paper.researchType);
}

export default function DashboardResearchPage() {
  const [research, setResearch] = useState<ResearchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const fetchResearch = useCallback(async () => {
    try {
      const res = (await api.getResearch({ limit: 50 })) as ResearchApiResponse;
      setResearch(Array.isArray(res.researches) ? res.researches : []);
    } catch (error) {
      console.error('Failed to fetch research:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect --
     fetchResearch() only writes state after awaiting the network request; the
     linter cannot see past the await. */
  useEffect(() => {
    fetchResearch();
  }, [fetchResearch]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const totals = useMemo(
    () =>
      research.reduce(
        (accumulator, paper) => ({
          views: accumulator.views + (paper.viewCount || 0),
          downloads: accumulator.downloads + (paper.downloadCount || 0),
        }),
        { views: 0, downloads: 0 }
      ),
    [research]
  );

  const typeOptions = useMemo(() => {
    const seen = new Map<string, string>();
    research.forEach((paper) => {
      if (paper.researchType && !seen.has(paper.researchType)) {
        seen.set(paper.researchType, humanizeType(paper.researchType) as string);
      }
    });
    return Array.from(seen, ([value, label]) => ({ value, label }));
  }, [research]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return research.filter((paper) => {
      if (typeFilter && paper.researchType !== typeFilter) return false;
      if (!query) return true;
      return (
        paper.title.toLowerCase().includes(query) ||
        (paper.abstract || '').toLowerCase().includes(query) ||
        (paper.authors || '').toLowerCase().includes(query)
      );
    });
  }, [research, searchQuery, typeFilter]);

  const hasFilters = Boolean(searchQuery.trim() || typeFilter);

  const resetFilters = () => {
    setSearchQuery('');
    setTypeFilter('');
  };

  return (
    <PageStack>
      <PageHeading
        eyebrow="Research corner"
        title="Research & publications"
        description="Academic work and publications from PPIA Auckland members."
        icon={FlaskConical}
      />

      <StatTileRow columns={3}>
        <StatTile label="Publications" value={research.length} tone="violet" icon={BookOpen} />
        <StatTile label="Total views" value={totals.views} tone="sky" icon={Eye} />
        <StatTile label="Total downloads" value={totals.downloads} tone="emerald" icon={Download} />
      </StatTileRow>

      <Toolbar>
        <SearchField
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by title, abstract, or author…"
          ariaLabel="Search research"
        />
        {typeOptions.length > 0 && (
          <FilterSelect
            value={typeFilter}
            onChange={setTypeFilter}
            options={typeOptions}
            placeholder="All types"
            ariaLabel="Filter by research type"
          />
        )}
        {hasFilters && <ResetFiltersButton onClick={resetFilters} />}
      </Toolbar>

      {loading ? (
        <LoadingRows rows={5} />
      ) : filtered.length === 0 ? (
        <SectionCard flush>
          <EmptyBlock
            icon={BookOpen}
            title={hasFilters ? 'No matching research' : 'No publications yet'}
            description={
              hasFilters
                ? 'Try another keyword or clear the filters to see every publication.'
                : 'Member publications will appear here once they are published.'
            }
          />
        </SectionCard>
      ) : (
        <div className="space-y-4">
          {filtered.map((paper) => {
            const href = `/dashboard/research/${paper.slug || slugify(paper.title)}`;
            const abstract = stripHtml(paper.abstract || '');
            const topic = topicOf(paper);
            const division = paper.Division ?? paper.division ?? null;
            return (
              <Link key={paper.id} href={href} className="group block">
                <SectionCard className="transition-all hover:-translate-y-0.5 hover:border-[#C3D2E0] hover:shadow-lg dark:hover:border-slate-700">
                  <div className="flex flex-wrap items-center gap-2">
                    {topic && <Badge variant="primary">{topic}</Badge>}
                    {division?.name && <Badge variant="outline">{division.name}</Badge>}
                    {paper.publicationDate && (
                      <span className="data-type inline-flex items-center gap-1 text-[12px] ink-muted">
                        <Calendar aria-hidden="true" className="h-3 w-3" />
                        {formatDate(paper.publicationDate, {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                  </div>

                  <h3 className="mt-3 font-display text-lg font-bold leading-snug ink-strong transition-colors group-hover:text-[#C41E16] dark:group-hover:text-[#FF8A84]">
                    {paper.title}
                  </h3>

                  {abstract && (
                    <p className="mt-2 line-clamp-2 border-l-4 border-[#DCE7F1] pl-3 text-sm leading-relaxed ink-body dark:border-slate-700">
                      {abstract}
                    </p>
                  )}

                  <div className="mt-4 pt-3">
                    <span aria-hidden="true" className="rope-rule mb-3 block opacity-60" />
                    {/* Author line and the two counters: the paper's log entry. */}
                    <div className="data-type flex flex-wrap items-center justify-between gap-3 text-[12px] ink-muted">
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        <Users aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{paper.authors || 'Anonymous'}</span>
                      </span>
                      <span className="inline-flex items-center gap-3">
                        <span className="inline-flex items-center gap-1">
                          <Eye aria-hidden="true" className="h-3.5 w-3.5" />
                          {paper.viewCount || 0}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Download aria-hidden="true" className="h-3.5 w-3.5" />
                          {paper.downloadCount || 0}
                        </span>
                      </span>
                    </div>
                  </div>
                </SectionCard>
              </Link>
            );
          })}
        </div>
      )}
    </PageStack>
  );
}
