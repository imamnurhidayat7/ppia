'use client';

/**
 * Member directory.
 *
 * Reads `/members/directory`, which any signed-in member may call. That endpoint
 * returns a narrower field set than the admin member list: no e-mail address,
 * phone number or student id. Members find each other here by what they study
 * and where; getting in touch happens through the social links a member chose to
 * publish, not through details they gave the committee for administration.
 *
 * Filtering is done server-side so a large membership does not have to be
 * downloaded in full to be searched.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Building2, GraduationCap, Users } from 'lucide-react';
import api from '@/lib/api';
import { Avatar, Badge, Button } from '@/components/ui';
import {
  EmptyBlock,
  FilterSelect,
  LoadingRows,
  PageHeading,
  PageStack,
  ResetFiltersButton,
  SearchField,
  SectionCard,
  Toolbar,
} from '@/components/dashboard';

/**
 * Brand marks as inline SVG.
 *
 * lucide-react removed its brand icons, and the footer already draws these by
 * hand for the same reason — so this follows the existing convention rather than
 * adding an icon dependency for three glyphs.
 */
const SOCIAL_ICON_PROPS = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

const LinkedInIcon = () => (
  <svg {...SOCIAL_ICON_PROPS}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-11h4v1.5" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const InstagramIcon = () => (
  <svg {...SOCIAL_ICON_PROPS}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const XIcon = () => (
  <svg {...SOCIAL_ICON_PROPS}>
    <path d="M4 4l16 16M20 4L4 20" />
  </svg>
);

interface DivisionRef {
  id: string;
  name: string;
  slug?: string;
  color?: string | null;
}

interface DirectoryMember {
  id: string;
  username: string;
  name: string;
  avatar?: string | null;
  bio?: string | null;
  role?: string | null;
  position?: string | null;
  university?: string | null;
  major?: string | null;
  degree?: string | null;
  graduationDate?: string | null;
  linkedIn?: string | null;
  instagram?: string | null;
  twitter?: string | null;
  division?: DivisionRef | null;
}

interface DirectoryResponse {
  members?: DirectoryMember[];
  pagination?: { page: number; limit: number; total: number; totalPages: number };
  filters?: { universities?: string[] };
}

/** Degree values from the Prisma enum, labelled for display. */
const DEGREE_OPTIONS = [
  { value: 'FOUNDATION', label: 'Foundation' },
  { value: 'DIPLOMA', label: 'Diploma' },
  { value: 'BACHELOR', label: 'Bachelor' },
  { value: 'MASTER', label: 'Master' },
  { value: 'DOCTORATE', label: 'Doctorate' },
  { value: 'OTHER', label: 'Other' },
];

/** Turn an enum-ish value into something readable: PHD_CANDIDATE -> Phd candidate. */
function humanise(value?: string | null): string | undefined {
  if (!value) return undefined;
  const words = value.replace(/_/g, ' ').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Expected graduation, shown as month and year.
 *
 * A precise date would imply the committee tracks the day someone finishes,
 * which is not what this field is for.
 */
function graduationLabel(value?: string | null): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString('en-NZ', { month: 'short', year: 'numeric' });
}

/**
 * Normalise a stored handle into a URL.
 *
 * Members type these by hand, so the field holds anything from a bare handle to
 * a full URL. Anything that is not obviously http(s) is treated as a handle.
 */
function socialUrl(platform: 'linkedin' | 'instagram' | 'twitter', raw?: string | null): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;

  const handle = value.replace(/^@/, '');
  if (platform === 'linkedin') return `https://www.linkedin.com/in/${handle}`;
  if (platform === 'instagram') return `https://instagram.com/${handle}`;
  return `https://x.com/${handle}`;
}

export default function MemberDirectoryPage() {
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [universities, setUniversities] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [universityFilter, setUniversityFilter] = useState('');
  const [degreeFilter, setDegreeFilter] = useState('');

  /**
   * Debounced query value.
   *
   * Search runs on the server, so firing on every keystroke would mean a request
   * per character.
   */
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Any change to the filters invalidates the current page number.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, universityFilter, degreeFilter]);

  const fetchDirectory = useCallback(async () => {
    setLoading(true);
    try {
      const res = (await api.getMemberDirectory({
        page,
        limit: 24,
        ...(debouncedSearch ? { q: debouncedSearch } : {}),
        ...(universityFilter ? { university: universityFilter } : {}),
        ...(degreeFilter ? { degree: degreeFilter } : {}),
      })) as DirectoryResponse;

      setMembers(res.members ?? []);
      setTotal(res.pagination?.total ?? 0);
      setTotalPages(res.pagination?.totalPages ?? 1);
      // Filter options come from the whole approved population, so they are only
      // adopted when the server sends them.
      if (res.filters?.universities?.length) {
        setUniversities(res.filters.universities);
      }
      setError(null);
    } catch (err) {
      console.error('Failed to load the member directory:', err);
      setError('Could not load the member directory.');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, universityFilter, degreeFilter]);

  /* eslint-disable react-hooks/set-state-in-effect --
     fetchDirectory() only writes state after awaiting the network request; the
     linter cannot see past the await. */
  useEffect(() => {
    fetchDirectory();
  }, [fetchDirectory]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const universityOptions = useMemo(
    () => universities.map((name) => ({ value: name, label: name })),
    [universities]
  );

  const hasFilters = Boolean(search.trim() || universityFilter || degreeFilter);
  const resetFilters = () => {
    setSearch('');
    setUniversityFilter('');
    setDegreeFilter('');
  };

  return (
    <PageStack>
      <PageHeading
        eyebrow="Community"
        title="Member directory"
        description="Find other Indonesian students in Auckland by university, field of study, or division."
        icon={Users}
      />

      <Toolbar>
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Search by name, university, or major…"
          ariaLabel="Search members"
        />
        {universityOptions.length > 1 && (
          <FilterSelect
            value={universityFilter}
            onChange={setUniversityFilter}
            options={universityOptions}
            placeholder="All universities"
            ariaLabel="Filter by university"
          />
        )}
        <FilterSelect
          value={degreeFilter}
          onChange={setDegreeFilter}
          options={DEGREE_OPTIONS}
          placeholder="All degrees"
          ariaLabel="Filter by degree"
        />
        {hasFilters && <ResetFiltersButton onClick={resetFilters} />}
      </Toolbar>

      {loading ? (
        <LoadingRows rows={4} />
      ) : error ? (
        <SectionCard flush>
          <EmptyBlock
            icon={Users}
            title="Directory unavailable"
            description={error}
            action={
              <Button variant="primary" onClick={fetchDirectory}>
                Try again
              </Button>
            }
          />
        </SectionCard>
      ) : members.length === 0 ? (
        <SectionCard flush>
          <EmptyBlock
            icon={Users}
            title={hasFilters ? 'No members match those filters' : 'No members to show yet'}
            description={
              hasFilters
                ? 'Try a different keyword, or clear the filters to see everyone.'
                : 'Approved members will appear here.'
            }
          />
        </SectionCard>
      ) : (
        <>
          {/* A count, so it reads as a instrument reading. */}
          <p className="data-type text-[12px] ink-muted">
            {total} {total === 1 ? 'member' : 'members'}
            {hasFilters ? ' matching your filters' : ''}
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {members.map((member) => {
              const degree = humanise(member.degree);
              const graduation = graduationLabel(member.graduationDate);
              const linkedIn = socialUrl('linkedin', member.linkedIn);
              const instagram = socialUrl('instagram', member.instagram);
              const twitter = socialUrl('twitter', member.twitter);
              const hasSocials = Boolean(linkedIn || instagram || twitter);

              return (
                <SectionCard key={member.id} className="flex h-full flex-col">
                  <div className="flex items-start gap-3">
                    {/* Porthole frame around the portrait, as elsewhere. */}
                    <span
                      className="shrink-0 rounded-full p-0.5"
                      style={{ boxShadow: 'inset 0 0 0 1px rgba(11,28,46,0.14), 0 0 0 4px rgba(11,28,46,0.05)' }}
                    >
                      <Avatar src={member.avatar ?? undefined} name={member.name} size="lg" />
                    </span>
                    <div className="min-w-0 flex-1">
                      {/* Public profiles are keyed by username, and the route
                          already exposes only non-sensitive fields. */}
                      <Link
                        href={`/profile/${member.username}`}
                        className="block truncate font-display text-base font-bold ink-strong transition-colors hover:text-[#C41E16] dark:hover:text-[#FF8A84]"
                      >
                        {member.name}
                      </Link>
                      <p className="data-type truncate text-[12px] ink-muted">@{member.username}</p>
                      {member.position && (
                        <Badge variant="primary" className="mt-1.5">
                          {humanise(member.position)}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {member.bio && (
                    <p className="mt-3 line-clamp-2 text-sm leading-relaxed ink-body">
                      {member.bio}
                    </p>
                  )}

                  <div className="mt-3 space-y-1.5 text-sm ink-body">
                    {member.university && (
                      <p className="flex items-start gap-2">
                        <Building2 aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 ink-muted" />
                        <span className="min-w-0">{member.university}</span>
                      </p>
                    )}
                    {(member.major || degree) && (
                      <p className="flex items-start gap-2">
                        <GraduationCap aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 ink-muted" />
                        <span className="min-w-0">
                          {[degree, member.major].filter(Boolean).join(' · ')}
                          {graduation && (
                            <span className="data-type text-[12px] ink-muted"> — until {graduation}</span>
                          )}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Pushed to the bottom so cards of differing heights line up. */}
                  <div className="mt-auto pt-4">
                    <span aria-hidden="true" className="rope-rule mb-3 block opacity-60" />
                    <div className="flex items-center justify-between gap-2">
                    {member.division?.name ? (
                      <Badge variant="outline">{member.division.name}</Badge>
                    ) : (
                      <span />
                    )}
                    {hasSocials && (
                      <span className="flex items-center gap-1">
                        {linkedIn && (
                          <a
                            href={linkedIn}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${member.name} on LinkedIn`}
                            className="rounded-[3px] p-1.5 ink-muted transition-colors hover:bg-[#F5FAFD] hover:text-[#0A66C2] dark:hover:bg-slate-800"
                          >
                            <LinkedInIcon />
                          </a>
                        )}
                        {instagram && (
                          <a
                            href={instagram}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${member.name} on Instagram`}
                            className="rounded-[3px] p-1.5 ink-muted transition-colors hover:bg-[#F5FAFD] hover:text-[#E1306C] dark:hover:bg-slate-800"
                          >
                            <InstagramIcon />
                          </a>
                        )}
                        {twitter && (
                          <a
                            href={twitter}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${member.name} on X`}
                            className="rounded-[3px] p-1.5 ink-muted transition-colors hover:bg-[#F5FAFD] hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                          >
                            <XIcon />
                          </a>
                        )}
                      </span>
                    )}
                    </div>
                  </div>
                </SectionCard>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 pt-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </Button>
              <span className="data-type text-[12px] ink-muted">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </PageStack>
  );
}
