/**
 * Types, option lists and payload helpers shared by the scholarship admin
 * pages (`new`, `[id]/edit` and the management list) so labels, badges and
 * payloads never drift apart.
 */

import type {
  Scholarship,
  ScholarshipInput,
  ScholarshipStatus,
  ScholarshipType,
} from '@/lib/api-types';
import type { BadgeProps } from '@/components/ui';

export type { Scholarship, ScholarshipInput, ScholarshipStatus, ScholarshipType };

/** Values are the Prisma `ScholarshipType` enum; only labels change. */
export const SCHOLARSHIP_TYPES: { value: ScholarshipType; label: string }[] = [
  { value: 'INDONESIAN_GOV', label: 'Indonesian government' },
  { value: 'NZ_GOV', label: 'New Zealand government' },
  { value: 'UNIVERSITY', label: 'University' },
];

/** Display label used by the public page filter — kept identical to the CMS copy. */
export const SCHOLARSHIP_TYPE_LABELS: Record<ScholarshipType, string> = {
  INDONESIAN_GOV: 'Indonesian Gov',
  NZ_GOV: 'NZ Gov',
  UNIVERSITY: 'University',
};

export const SCHOLARSHIP_STATUSES: {
  value: ScholarshipStatus;
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

export function typeLabel(value?: string): string {
  if (!value) return '—';
  if (value in SCHOLARSHIP_TYPE_LABELS) {
    return SCHOLARSHIP_TYPE_LABELS[value as ScholarshipType];
  }
  // Legacy CMS rows already carry display labels ("Indonesian Gov").
  return value;
}

export function statusMeta(value?: string) {
  return SCHOLARSHIP_STATUSES.find((status) => status.value === value);
}

export function statusLabel(value?: string): string {
  return statusMeta(value)?.label || value || '—';
}

/** The scholarship form edits exactly these fields. */
export interface ScholarshipFormValues {
  name: string;
  provider: string;
  type: string;
  color: string;
  levelText: string;
  coverageText: string;
  amount: string;
  deadline: string;
  deadlineDate: string;
  url: string;
  desc: string;
  featured: boolean;
  published: boolean;
}

export const EMPTY_SCHOLARSHIP_FORM: ScholarshipFormValues = {
  name: '',
  provider: '',
  type: 'UNIVERSITY',
  color: '#3B82F6',
  levelText: '',
  coverageText: '',
  amount: '',
  deadline: '',
  deadlineDate: '',
  url: '',
  desc: '',
  featured: false,
  published: false,
};

export function formFromScholarship(item: Scholarship): ScholarshipFormValues {
  return {
    name: item.name ?? '',
    provider: item.provider ?? '',
    type: item.type ?? 'UNIVERSITY',
    color: item.color ?? '#3B82F6',
    levelText: (item.level ?? []).join('\n'),
    coverageText: (item.coverage ?? []).join('\n'),
    amount: item.amount ?? '',
    deadline: item.deadline ?? '',
    deadlineDate: item.deadlineDate ? item.deadlineDate.slice(0, 10) : '',
    url: item.url ?? '',
    desc: item.desc ?? '',
    featured: !!item.featured,
    published: !!item.published,
  };
}

function linesToArray(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Payload for `POST /scholarships` and `PUT /scholarships/:id`.
 * `saveAsDraft` keeps the row out of the public list until the board is
 * ready. Only SUPER_ADMIN / BOARD reach these endpoints.
 */
export function buildScholarshipPayload(
  values: ScholarshipFormValues,
  opts?: { saveAsDraft?: boolean; board?: boolean }
): ScholarshipInput {
  const payload: ScholarshipInput = {
    name: values.name.trim(),
    provider: values.provider.trim(),
    type: values.type as ScholarshipType,
    color: values.color || '#3B82F6',
    level: linesToArray(values.levelText),
    coverage: linesToArray(values.coverageText),
    amount: values.amount.trim(),
    deadline: values.deadline.trim(),
    deadlineDate: values.deadlineDate || null,
    url: values.url.trim(),
    desc: values.desc,
  };
  if (opts?.board) {
    payload.featured = values.featured;
    payload.published = values.published;
  } else if (opts?.saveAsDraft) {
    payload.status = 'DRAFT';
  }
  return payload;
}

export function validateScholarshipForm(values: ScholarshipFormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!values.name.trim()) errors.name = 'Scholarship name is required.';
  if (values.url.trim()) {
    try {
      const parsed = new URL(values.url.trim());
      if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) throw new Error('bad protocol');
    } catch {
      errors.url = 'Official link must be a valid URL.';
    }
  }
  if (values.deadlineDate) {
    const d = new Date(values.deadlineDate);
    if (Number.isNaN(d.getTime())) errors.deadlineDate = 'Deadline date is not a valid date.';
  }
  return errors;
}

export function errorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null) {
    const data = (error as { response?: { data?: { error?: string; message?: string } } }).response?.data;
    if (typeof data?.error === 'string' && data.error) return data.error;
    if (typeof data?.message === 'string' && data.message) return data.message;
    if (error instanceof Error && error.message) return error.message;
  }
  return fallback;
}

export function unwrapList<T>(res: unknown, key: string): T[] {
  if (res && typeof res === 'object') {
    const list = (res as Record<string, unknown>)[key];
    if (Array.isArray(list)) return list as T[];
  }
  return [];
}
