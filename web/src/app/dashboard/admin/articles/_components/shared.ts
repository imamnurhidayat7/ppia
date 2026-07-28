/**
 * Types and helpers shared by the article-style admin pages.
 *
 * `articles/`, `articles/news/` and `articles/research/` were near-identical
 * copies of the same list + form, so the pieces that never differ live here and
 * each page keeps only its own fetching and filtering rules.
 */

export interface TagRef {
  id: string;
  name: string;
  slug?: string;
  color?: string;
}

export interface DivisionRef {
  id: string;
  name: string;
  color?: string;
}

/** Row shape used by every article-style list, including the research corner. */
export interface AdminArticle {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: Record<string, unknown> | string;
  imageUrl?: string;
  category?: string;
  published: boolean;
  isFeatured?: boolean;
  featuredOrder?: number;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  division?: DivisionRef;
  /** Some endpoints answer with the bare id instead of the nested division. */
  divisionId?: string;
  author?: { name?: string };
  views?: number;
  likes?: number;
  tags?: TagRef[];
  createdAt: string;
  updatedAt?: string;
}

/** Every article-style form edits exactly these fields. */
export interface ArticleFormValues {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  imageUrl: string;
  divisionId: string;
  published: boolean;
  isFeatured: boolean;
  featuredOrder: number;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  selectedTags: string[];
}

export const EMPTY_ARTICLE_FORM: ArticleFormValues = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  imageUrl: '',
  divisionId: '',
  published: false,
  isFeatured: false,
  featuredOrder: 0,
  metaTitle: '',
  metaDescription: '',
  metaKeywords: '',
  selectedTags: [],
};

/** Same transformation the old inline handlers used, kept byte for byte. */
export function slugFromTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '').trim();
}

/**
 * The API sometimes answers with a bare array and sometimes with `{ key: [] }`,
 * so list pages normalise it here instead of repeating the fallback chain.
 */
export function unwrapList<T>(payload: unknown, key: string): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object') {
    const value = (payload as Record<string, unknown>)[key];
    if (Array.isArray(value)) return value as T[];
  }
  return [];
}

/** Narrows an unknown thrown value into the message the API returns. */
export function errorMessage(error: unknown, fallback: string): string {
  const err = error as { response?: { data?: { error?: string } }; message?: string };
  return err?.response?.data?.error || err?.message || fallback;
}
