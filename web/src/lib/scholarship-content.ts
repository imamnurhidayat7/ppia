export interface ScholarshipContent {
  id: number;
  name: string;
  provider: string;
  type: string;
  color: string;
  level: string[];
  coverage: string[];
  amount: string;
  deadline: string;
  url: string;
  desc: string;
  featured?: boolean;
}

/**
 * Normalise a value that _should_ be string[] but might be:
 *   - undefined / null            → []
 *   - already string[]            → as-is
 *   - [{ value: "Masters" }, …]   → map to ["Masters", …]  (legacy CMS shape)
 *   - comma-separated string      → split
 */
function toStringArray(raw: unknown): string[] {
  if (!raw) return [];
  if (typeof raw === 'string') return raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object' && 'value' in item) return String((item as { value: unknown }).value);
      return '';
    })
    .filter(Boolean);
}

/**
 * Convert raw CMS page.content into typed scholarship data.
 *
 * Deliberately lenient: the CMS stores id as number OR string depending on
 * whether the seed ran or the admin typed it into a number input; level/coverage
 * may be `string[]` or `[{value}]`; desc may be missing when the admin hasn't
 * filled it yet. A single scholarship with a missing non-critical field should
 * not break the entire page.
 */
export function toScholarshipContent(value: unknown): ScholarshipContent[] {
  const scholarships = (value as { scholarships?: unknown } | null)?.scholarships;
  if (!Array.isArray(scholarships)) return [];

  return scholarships
    .map((item): ScholarshipContent | null => {
      if (!item || typeof item !== 'object') return null;
      const r = item as Record<string, unknown>;

      // Must have at least a name to be useful.
      if (typeof r.name !== 'string' || !r.name) return null;

      return {
        id: typeof r.id === 'number' ? r.id : Number(r.id) || 0,
        name: r.name,
        provider: typeof r.provider === 'string' ? r.provider : '',
        type: typeof r.type === 'string' ? r.type : 'University',
        color: typeof r.color === 'string' ? r.color : '#3B82F6',
        level: toStringArray(r.level),
        coverage: toStringArray(r.coverage),
        amount: typeof r.amount === 'string' ? r.amount : '',
        deadline: typeof r.deadline === 'string' ? r.deadline : '',
        url: typeof r.url === 'string' ? r.url : '',
        desc: typeof r.desc === 'string' ? r.desc : '',
        featured: !!r.featured,
      };
    })
    .filter((s): s is ScholarshipContent => s !== null);
}
