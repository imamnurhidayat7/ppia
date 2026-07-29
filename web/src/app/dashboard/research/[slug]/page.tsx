'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen,
  Calendar,
  Download,
  ExternalLink,
  Eye,
  FileText,
  FlaskConical,
  Users,
} from 'lucide-react';
import api from '@/lib/api';
import RichText from '@/components/RichText';
import { cn, formatDate } from '@/lib/utils';
import { Badge, Button } from '@/components/ui';
import {
  DetailItem,
  EmptyBlock,
  PageHeading,
  PageLoading,
  PageStack,
  SectionCard,
  StatTile,
  StatTileRow,
} from '@/components/dashboard';

interface TagRef {
  id: string;
  name: string;
  slug: string;
  color?: string | null;
}

interface DivisionRef {
  id?: string;
  name: string;
  color?: string | null;
}

interface ResearchDetail {
  id: string;
  slug: string;
  title: string;
  titleIndonesian?: string;
  abstract?: string;
  abstractIndonesian?: string;
  researchType?: string;
  authors?: string;
  publicationDate?: string;
  venue?: string;
  doi?: string;
  url?: string;
  pdfUrl?: string;
  keywords?: string;
  tags?: TagRef[];
  viewCount?: number;
  downloadCount?: number;
  /** Prisma exposes the relation as `Division`; keep the lowercase alias too. */
  Division?: DivisionRef | null;
  division?: DivisionRef | null;
}

interface ResearchResponse {
  research?: ResearchDetail;
}

/**
 * Typography for CMS-authored bodies. The project has no typography plugin, so
 * element styles are declared explicitly here.
 */
const RICH_TEXT_CLASS = cn(
  'max-w-none text-sm leading-relaxed ink-body',
  '[&_p]:my-2 [&_strong]:font-bold [&_em]:italic',
  '[&_h2]:font-display [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-1.5 [&_h2]:text-slate-900 dark:[&_h2]:text-slate-50',
  '[&_h3]:font-display [&_h3]:text-base [&_h3]:font-bold [&_h3]:mt-4 [&_h3]:mb-1.5 [&_h3]:text-slate-900 dark:[&_h3]:text-slate-50',
  '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6',
  '[&_a]:text-[#E8231A] [&_a]:underline'
);

function humanizeType(value?: string): string | undefined {
  if (!value) return undefined;
  const words = value.replace(/_/g, ' ').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function isHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value);
}

export default function DashboardResearchDetailPage() {
  const params = useParams();
  const slug = typeof params.slug === 'string' ? params.slug : undefined;

  const [research, setResearch] = useState<ResearchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchResearch = useCallback(async () => {
    if (!slug) return;
    try {
      const res = (await api.getResearchBySlug(slug)) as ResearchResponse;
      if (res.research) {
        setResearch(res.research);
      } else {
        setError('Research not found');
      }
    } catch (err) {
      console.error('Failed to fetch research:', err);
      setError('Research not found');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  /* eslint-disable react-hooks/set-state-in-effect --
     fetchResearch() only writes state after awaiting the network request; the
     linter cannot see past the await. */
  useEffect(() => {
    fetchResearch();
  }, [fetchResearch]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (loading) {
    return <PageLoading label="Loading research…" />;
  }

  if (error || !research) {
    return (
      <PageStack>
        <PageHeading
          title="Research"
          backHref="/dashboard/research"
          backLabel="Back to all research"
        />
        <SectionCard flush>
          <EmptyBlock
            icon={BookOpen}
            title="Research not found"
            description="The link may have changed, or the publication is no longer available."
            action={
              <Link href="/dashboard/research">
                <Button variant="primary">Go to all research</Button>
              </Link>
            }
          />
        </SectionCard>
      </PageStack>
    );
  }

  const division = research.Division ?? research.division ?? null;
  const researchType = humanizeType(research.researchType);
  const keywords = (research.keywords || '')
    .split(',')
    .map((keyword) => keyword.trim())
    .filter(Boolean);

  return (
    <PageStack>
      <PageHeading
        eyebrow={division?.name || researchType || 'Research corner'}
        title={research.title}
        description={research.titleIndonesian || undefined}
        icon={FlaskConical}
        backHref="/dashboard/research"
        backLabel="Back to all research"
        actions={
          <>
            {research.pdfUrl && (
              <a href={research.pdfUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="primary" leftIcon={<Download className="h-4 w-4" />}>
                  Download PDF
                </Button>
              </a>
            )}
            {research.doi && (
              <a
                href={`https://doi.org/${research.doi}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="secondary" leftIcon={<ExternalLink className="h-4 w-4" />}>
                  Open DOI
                </Button>
              </a>
            )}
          </>
        }
      />

      <StatTileRow columns={2}>
        <StatTile label="Views" value={research.viewCount || 0} tone="sky" icon={Eye} />
        <StatTile
          label="Downloads"
          value={research.downloadCount || 0}
          tone="red"
          icon={Download}
        />
      </StatTileRow>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {research.abstract && (
            <SectionCard title="Abstract" icon={FileText}>
              <div className={RICH_TEXT_CLASS}>
                {isHtml(research.abstract) ? (
                  <RichText html={research.abstract} />
                ) : (
                  <p>{research.abstract}</p>
                )}
              </div>
            </SectionCard>
          )}

          {research.abstractIndonesian && (
            <SectionCard title="Abstract (Indonesian)" icon={FileText}>
              <div className={RICH_TEXT_CLASS}>
                {isHtml(research.abstractIndonesian) ? (
                  <RichText html={research.abstractIndonesian} />
                ) : (
                  <p>{research.abstractIndonesian}</p>
                )}
              </div>
            </SectionCard>
          )}

          {(keywords.length > 0 || (research.tags && research.tags.length > 0)) && (
            <SectionCard title="Keywords & tags" icon={BookOpen}>
              <div className="space-y-4">
                {keywords.length > 0 && (
                  <div>
                    <p className="data-type mb-2 text-[12px] font-bold uppercase ink-muted">
                      Keywords
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {keywords.map((keyword) => (
                        <Badge key={keyword} variant="default">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {research.tags && research.tags.length > 0 && (
                  <div>
                    <p className="data-type mb-2 text-[12px] font-bold uppercase ink-muted">
                      Tags
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {research.tags.map((tag) => (
                        <Badge key={tag.id} variant="outline">
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>
          )}
        </div>

        <SectionCard
          title="Publication details"
          description="Research metadata"
          className="lg:sticky lg:top-6"
        >
          <div className="space-y-5">
            <DetailItem label="Author" value={research.authors || 'Anonymous'} icon={Users} />
            {research.publicationDate && (
              <DetailItem
                label="Publication date"
                value={
                  /* Metadata, so it is set in the data face. */
                  <span className="data-type">
                    {formatDate(research.publicationDate, {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                }
                icon={Calendar}
              />
            )}
            {research.venue && (
              <DetailItem label="Venue" value={research.venue} icon={BookOpen} />
            )}
            {researchType && (
              <DetailItem label="Type" value={researchType} icon={FlaskConical} />
            )}
            {division?.name && (
              <DetailItem label="Division" value={division.name} icon={Users} />
            )}
            {research.doi && (
              <DetailItem
                label="DOI"
                icon={ExternalLink}
                value={
                  <a
                    href={`https://doi.org/${research.doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="data-type accent-label break-all hover:underline"
                  >
                    {research.doi}
                  </a>
                }
              />
            )}
            {research.url && (
              <DetailItem
                label="External link"
                icon={ExternalLink}
                value={
                  <a
                    href={research.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="accent-label break-all hover:underline"
                  >
                    {research.url}
                  </a>
                }
              />
            )}
          </div>
        </SectionCard>
      </div>
    </PageStack>
  );
}
