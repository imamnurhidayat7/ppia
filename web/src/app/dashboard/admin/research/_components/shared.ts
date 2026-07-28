/**
 * Types, option lists and payload helpers shared by the research admin pages.
 *
 * `research/new` and `research/[id]/edit` edit the exact same 23 fields, and the
 * list and detail pages need the same label maps, so everything that never
 * differs lives here.
 */

import type { LucideIcon } from 'lucide-react';
import {
  Award,
  BarChart3,
  BookOpen,
  File,
  FileText,
  GraduationCap,
  Users,
} from 'lucide-react';
import type { ResearchInput } from '@/lib/api-types';
import type { BadgeProps } from '@/components/ui';

// Both helpers already serve the article pages, so they are reused, not copied.
export { errorMessage, unwrapList } from '../../articles/_components/shared';

export type ResearchType =
  | 'ACADEMIC_PAPER'
  | 'THESIS'
  | 'DISSERTATION'
  | 'RESEARCH_PROJECT'
  | 'PUBLICATION'
  | 'CONFERENCE_PAPER'
  | 'JOURNAL_ARTICLE';

export type ResearchStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'PUBLISHED';

/** The values are never changed because the backend relies on them; only the labels are. */
export const RESEARCH_TYPES: { value: ResearchType; label: string; icon: LucideIcon }[] = [
  { value: 'ACADEMIC_PAPER', label: 'Academic paper', icon: FileText },
  { value: 'THESIS', label: 'Thesis', icon: GraduationCap },
  { value: 'DISSERTATION', label: 'Dissertation', icon: Award },
  { value: 'RESEARCH_PROJECT', label: 'Research project', icon: BarChart3 },
  { value: 'PUBLICATION', label: 'Publication', icon: BookOpen },
  { value: 'CONFERENCE_PAPER', label: 'Conference paper', icon: Users },
  { value: 'JOURNAL_ARTICLE', label: 'Journal article', icon: File },
];

export const RESEARCH_STATUSES: {
  value: ResearchStatus;
  label: string;
  badge: NonNullable<BadgeProps['variant']>;
}[] = [
  { value: 'DRAFT', label: 'Draft', badge: 'default' },
  { value: 'PENDING_REVIEW', label: 'Pending review', badge: 'warning' },
  { value: 'UNDER_REVIEW', label: 'Under review', badge: 'primary' },
  { value: 'APPROVED', label: 'Approved', badge: 'success' },
  { value: 'REJECTED', label: 'Rejected', badge: 'danger' },
  { value: 'PUBLISHED', label: 'Published', badge: 'success' },
];

export const CITATION_FORMATS = ['APA', 'MLA', 'Chicago', 'IEEE', 'Harvard'];

export function typeMeta(value?: string) {
  return RESEARCH_TYPES.find((type) => type.value === value);
}

export function typeLabel(value?: string): string {
  return typeMeta(value)?.label || value || '—';
}

export function statusMeta(value?: string) {
  return RESEARCH_STATUSES.find((status) => status.value === value);
}

export function statusLabel(value?: string): string {
  return statusMeta(value)?.label || value || '—';
}

export interface DivisionRef {
  id: string;
  name: string;
  color?: string;
}

export interface TagRef {
  id: string;
  name: string;
  slug?: string;
  color?: string;
}

/** Row shape used by the research list. */
export interface ResearchListItem {
  id: string;
  title: string;
  slug: string;
  researchType?: string;
  researchStatus?: string;
  published: boolean;
  viewCount?: number;
  downloadCount?: number;
  mainAuthor?: { name?: string };
  createdAt: string;
}

/** Full shape used by the detail page. */
export interface ResearchDetail extends ResearchListItem {
  titleIndonesian?: string;
  abstract?: string;
  abstractIndonesian?: string;
  authors?: string;
  publicationDate?: string;
  venue?: string;
  doi?: string;
  url?: string;
  keywords?: string;
  citationFormat?: string;
  pdfUrl?: string;
  imageUrl?: string;
  featuredOrder?: number;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  scheduledPublishAt?: string;
  division?: DivisionRef;
  tags?: TagRef[];
  updatedAt: string;
}

/** The research form edits exactly these fields. */
export interface ResearchFormValues {
  title: string;
  titleIndonesian: string;
  slug: string;
  abstract: string;
  abstractIndonesian: string;
  researchType: string;
  researchStatus: string;
  authors: string;
  publicationDate: string;
  venue: string;
  doi: string;
  url: string;
  keywords: string;
  citationFormat: string;
  pdfUrl: string;
  imageUrl: string;
  divisionId: string;
  published: boolean;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  scheduledPublishAt: string;
  selectedTags: string[];
}

export const EMPTY_RESEARCH_FORM: ResearchFormValues = {
  title: '',
  titleIndonesian: '',
  slug: '',
  abstract: '',
  abstractIndonesian: '',
  researchType: 'RESEARCH_PROJECT',
  researchStatus: 'DRAFT',
  authors: '',
  publicationDate: '',
  venue: '',
  doi: '',
  url: '',
  keywords: '',
  citationFormat: 'APA',
  pdfUrl: '',
  imageUrl: '',
  divisionId: '',
  published: false,
  metaTitle: '',
  metaDescription: '',
  metaKeywords: '',
  scheduledPublishAt: '',
  selectedTags: [],
};

/** Same slug transformation the old handlers used, kept byte for byte. */
export function slugFromTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * The payload sent to `POST /research` and `PUT /research/:id`, identical to
 * the previous version. `authors` is still sent as a comma separated string
 * while the shared type declares an array, and `imageUrl` and `tags` are simply
 * missing from that type — hence the single cast here instead of an `any` on
 * every page.
 */
export function buildResearchPayload(values: ResearchFormValues): ResearchInput {
  const payload = {
    title: values.title,
    titleIndonesian: values.titleIndonesian || undefined,
    slug: values.slug || undefined,
    abstract: values.abstract,
    abstractIndonesian: values.abstractIndonesian || undefined,
    researchType: values.researchType as ResearchType,
    researchStatus: values.researchStatus as ResearchStatus,
    authors: values.authors,
    publicationDate: values.publicationDate || undefined,
    venue: values.venue || undefined,
    doi: values.doi || undefined,
    url: values.url || undefined,
    keywords: values.keywords || undefined,
    citationFormat: values.citationFormat || undefined,
    pdfUrl: values.pdfUrl || undefined,
    imageUrl: values.imageUrl || undefined,
    divisionId: values.divisionId || undefined,
    published: values.published,
    metaTitle: values.metaTitle || undefined,
    metaDescription: values.metaDescription || undefined,
    metaKeywords: values.metaKeywords || undefined,
    scheduledPublishAt: values.scheduledPublishAt || undefined,
    tags: values.selectedTags.length > 0 ? values.selectedTags : undefined,
  };
  return payload as unknown as ResearchInput;
}
