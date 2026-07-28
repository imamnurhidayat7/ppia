// ===========================================
// Service layer — wraps the API client with typed, cached accessors.
// Components call these instead of using `api` directly, so data-fetching
// logic, caching keys, and error handling live in one place.
// ===========================================

import api from "./api";

// In-memory cache for client-side dedup across renders in a session.
const memoryCache = new Map<string, { data: unknown; ts: number }>();

const DEFAULT_TTL = 60_000; // 1 minute

function getCached<T>(key: string): T | undefined {
  const entry = memoryCache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.ts > DEFAULT_TTL) {
    memoryCache.delete(key);
    return undefined;
  }
  return entry.data as T;
}

function setCached<T>(key: string, data: T): void {
  memoryCache.set(key, { data, ts: Date.now() });
}

/** Public content — frequently accessed, safe to cache */
export const contentService = {
  async getEvents(params?: { page?: number; limit?: number; search?: string }) {
    const key = `events:${JSON.stringify(params || {})}`;
    const cached = getCached<unknown>(key);
    if (cached) return cached;
    const data = await api.getEvents(params);
    setCached(key, data);
    return data;
  },

  async getEventBySlug(slug: string) {
    const key = `event:${slug}`;
    const cached = getCached<unknown>(key);
    if (cached) return cached;
    const data = await api.getEventBySlug(slug);
    setCached(key, data);
    return data;
  },

  async getArticles(params?: { page?: number; limit?: number; search?: string }) {
    const key = `articles:${JSON.stringify(params || {})}`;
    const cached = getCached<unknown>(key);
    if (cached) return cached;
    const data = await api.getArticles(params);
    setCached(key, data);
    return data;
  },

  async getArticleBySlug(slug: string) {
    const key = `article:${slug}`;
    const cached = getCached<unknown>(key);
    if (cached) return cached;
    const data = await api.getArticleBySlug(slug);
    setCached(key, data);
    return data;
  },

  async getResearch(params?: { page?: number; limit?: number; search?: string }) {
    const key = `research:${JSON.stringify(params || {})}`;
    const cached = getCached<unknown>(key);
    if (cached) return cached;
    const data = await api.getResearch(params);
    setCached(key, data);
    return data;
  },

  async getResearchBySlug(slug: string) {
    const key = `research-item:${slug}`;
    const cached = getCached<unknown>(key);
    if (cached) return cached;
    const data = await api.getResearchBySlug(slug);
    setCached(key, data);
    return data;
  },

  /** Invalidate everything (e.g. after logout) */
  invalidateAll() {
    memoryCache.clear();
  },

  /** Invalidate a specific pattern */
  invalidate(pattern: string) {
    for (const key of memoryCache.keys()) {
      if (key.includes(pattern)) memoryCache.delete(key);
    }
  },
};

/** Authenticated user data — never cached */
export const userService = {
  getMe: () => api.getMe(),
  getProfile: () => api.getProfile(),
  updateProfile: (data: Parameters<typeof api.updateProfile>[0]) => {
    contentService.invalidate("user");
    return api.updateProfile(data);
  },
  getMyRegistrations: () => api.getMyRegistrations(),
};

/** Pemira elections — short cache for results, no cache for vote */
export const pemiraService = {
  getElections: (params?: { status?: string }) => {
    contentService.invalidate("elections");
    return api.getElections(params);
  },
  getActiveElection: () => api.getActiveElection(),
  getCandidates: (electionId: string, params?: { status?: string }) =>
    api.getCandidates(electionId, params),
  getElectionResults: (electionId: string) => api.getElectionResults(electionId),
  getMyVote: (electionId: string) => api.getMyVote(electionId),
  castVote: (electionId: string, candidateId: string) => {
    contentService.invalidate(`election:${electionId}`);
    return api.castVote(electionId, candidateId);
  },
};

export { memoryCache };
