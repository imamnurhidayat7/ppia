import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  RegisterData,
  DivisionInput,
  EventInput,
  ArticleInput,
  TagInput,
  ResearchInput,
  PageInput,
  LandingSection,
  SectionInput,
  SectionBlock,
  BlockInput,
  ApiError,
} from './api-types';

import { API_ORIGIN as API_URL } from './api-base';

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    // Initialize token from localStorage on client-side
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }

    this.client = axios.create({
      baseURL: `${API_URL}/api`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add token to requests if available
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    // Handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<{ message?: string; error?: string; errors?: Record<string, string[]> }>) => {
        if (error.response?.status === 401) {
          this.removeToken();
          // A 401 on the sign-in/registration request itself is a failed
          // attempt (bad credentials, unapproved account) — the caller shows
          // the message. Only redirect when an *authenticated* request is
          // rejected, and never bounce a page that is already /login, so the
          // login screen no longer reloads out from under the error message.
          const url = error.config?.url || '';
          const isAuthAttempt = url.includes('/auth/login') || url.includes('/auth/register');
          if (
            typeof window !== 'undefined' &&
            !isAuthAttempt &&
            window.location.pathname !== '/login'
          ) {
            window.location.href = '/login';
          }
        }
        return Promise.reject(this.parseError(error));
      }
    );
  }

  /** Parse Axios error into a consistent ApiError shape */
  private parseError(error: AxiosError<{ message?: string; error?: string; errors?: Record<string, string[]> }>): ApiError {
    const status = error.response?.status;
    const data = error.response?.data;
    const messages: Record<number, string> = {
      400: 'Invalid request',
      403: 'Access denied',
      404: 'Data not found',
      409: 'Data conflict',
      422: 'The submitted data is invalid',
      429: 'Too many requests',
      500: 'A server error occurred',
    };
    // The API returns its human message under `error`; some endpoints use
    // `message`. Prefer either over the generic per-status fallback so specific
    // messages (e.g. "awaiting admin approval") reach the user.
    const message =
      data?.error || data?.message || (status ? messages[status] : 'An unknown error occurred');
    return { success: false as const, message, errors: data?.errors, status };
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', token);
      }
    } else {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
      }
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token');
    }
    return this.token;
  }

  removeToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
  }

  // Auth
  async register(data: RegisterData) {
    const response = await this.client.post('/auth/register', data);
    // NOTE: registration now requires admin approval, so no token is returned.
    return response.data;
  }

  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', { email, password });
    if (response.data.token) {
      this.setToken(response.data.token);
    }
    return response.data;
  }

  async logout() {
    this.removeToken();
  }

  async getMe() {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  // Public profile by username (no auth)
  async getPublicProfile(username: string) {
    const response = await this.client.get(`/users/username/${encodeURIComponent(username)}`);
    return response.data;
  }

  // Divisions
  async getDivisions() {
    const response = await this.client.get('/divisions');
    return response.data;
  }

  async getDivision(id: string) {
    const response = await this.client.get(`/divisions/${id}`);
    return response.data;
  }

  async createDivision(data: DivisionInput) {
    const response = await this.client.post('/divisions', data);
    return response.data;
  }

  async updateDivision(id: string, data: Partial<DivisionInput>) {
    const response = await this.client.put(`/divisions/${id}`, data);
    return response.data;
  }

  async deleteDivision(id: string) {
    const response = await this.client.delete(`/divisions/${id}`);
    return response.data;
  }

  // Events
  async getEvents(params?: { page?: number; limit?: number; search?: string }) {
    const response = await this.client.get('/events', { params });
    return response.data;
  }

  async getEvent(id: string) {
    const response = await this.client.get(`/events/${id}`);
    return response.data;
  }

  async getEventBySlug(slug: string) {
    const response = await this.client.get(`/events/slug/${slug}`);
    return response.data;
  }

  /** Admin fetch by id — includes unpublished drafts (for the editor). */
  async getEventAdmin(id: string) {
    const response = await this.client.get(`/events/admin/${id}`);
    return response.data;
  }

  async createEvent(data: EventInput) {
    const response = await this.client.post('/events', data);
    return response.data;
  }

  async updateEvent(id: string, data: Partial<EventInput>) {
    const response = await this.client.put(`/events/${id}`, data);
    return response.data;
  }

  async deleteEvent(id: string) {
    const response = await this.client.delete(`/events/${id}`);
    return response.data;
  }

  async getEventsAdmin(params?: { page?: number; limit?: number }) {
    const response = await this.client.get('/events/admin/all', { params });
    return response.data;
  }

  // Articles
  async getArticles(params?: { page?: number; limit?: number; search?: string }) {
    const response = await this.client.get('/articles', { params });
    return response.data;
  }

  async getArticle(id: string) {
    const response = await this.client.get(`/articles/${id}`);
    return response.data;
  }

  async getArticleBySlug(slug: string) {
    const response = await this.client.get(`/articles/slug/${slug}`);
    return response.data;
  }

  /** Admin fetch by id — includes unpublished drafts (for the editor). */
  async getArticleAdmin(id: string) {
    const response = await this.client.get(`/articles/admin/${id}`);
    return response.data;
  }

  async createArticle(data: ArticleInput) {
    const response = await this.client.post('/articles', data);
    return response.data;
  }

  async updateArticle(id: string, data: Partial<ArticleInput>) {
    const response = await this.client.put(`/articles/${id}`, data);
    return response.data;
  }

  async deleteArticle(id: string) {
    const response = await this.client.delete(`/articles/${id}`);
    return response.data;
  }

  async getArticlesAdmin(params?: { page?: number; limit?: number; search?: string; category?: string; status?: string; featured?: string; tags?: string }) {
    const response = await this.client.get('/articles/admin/all', { params });
    return response.data;
  }

  // ===========================================
  // TAGS MANAGEMENT
  // ===========================================
  async getTags(params?: { search?: string }) {
    const response = await this.client.get('/tags', { params });
    return response.data;
  }

  async getTag(id: string) {
    const response = await this.client.get(`/tags/${id}`);
    return response.data;
  }

  async getTagBySlug(slug: string) {
    const response = await this.client.get(`/tags/slug/${slug}`);
    return response.data;
  }

  async createTag(data: TagInput) {
    const response = await this.client.post('/tags', data);
    return response.data;
  }

  async updateTag(id: string, data: Partial<TagInput>) {
    const response = await this.client.put(`/tags/${id}`, data);
    return response.data;
  }

  async deleteTag(id: string) {
    const response = await this.client.delete(`/tags/${id}`);
    return response.data;
  }

  // ===========================================
  // RESEARCH MANAGEMENT
  // ===========================================
  async getResearch(params?: { page?: number; limit?: number; search?: string; type?: string; status?: string; divisionId?: string }) {
    const response = await this.client.get('/research', { params });
    return response.data;
  }

  /**
   * Admin listing that includes drafts. The public `/research` endpoint filters
   * `published: true`, so admin screens must use this one or they never see
   * unpublished work.
   */
  async getResearchAdmin(params?: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    status?: string;
    divisionId?: string;
    published?: 'true' | 'false';
  }) {
    const response = await this.client.get('/research/admin/all', { params });
    return response.data;
  }

  /** Admin fetch by id that also returns unpublished records and skips the view counter. */
  async getResearchAdminById(id: string) {
    const response = await this.client.get(`/research/admin/${id}`);
    return response.data;
  }

  async getResearchById(id: string) {
    const response = await this.client.get(`/research/${id}`);
    return response.data;
  }

  async getResearchBySlug(slug: string) {
    const response = await this.client.get(`/research/slug/${slug}`);
    return response.data;
  }

  async createResearch(data: ResearchInput) {
    const response = await this.client.post('/research', data);
    return response.data;
  }

  async updateResearch(id: string, data: Partial<ResearchInput>) {
    const response = await this.client.put(`/research/${id}`, data);
    return response.data;
  }

  async deleteResearch(id: string) {
    const response = await this.client.delete(`/research/${id}`);
    return response.data;
  }

  // ===========================================
  // MEMBERS
  // ===========================================
  // BOOKMARKS (saved articles)
  // ===========================================

  /** The caller's reading list, newest save first. */
  async getBookmarks(params?: { page?: number; limit?: number }) {
    const response = await this.client.get('/bookmarks', { params });
    return response.data;
  }

  /**
   * Article ids the caller has saved.
   *
   * Used by listings to render many save buttons in the correct state without
   * fetching the whole reading list.
   */
  async getBookmarkedArticleIds() {
    const response = await this.client.get('/bookmarks/ids');
    return response.data as { articleIds: string[] };
  }

  // ===========================================
  // NOTIFICATIONS
  // ===========================================

  /** Recent notifications for the signed-in member, plus the unread tally. */
  async getNotifications(params?: { unreadOnly?: boolean }) {
    const response = await this.client.get('/notifications', { params });
    return response.data;
  }

  async markNotificationRead(id: string) {
    const response = await this.client.patch(`/notifications/${id}/read`);
    return response.data as { updated: number };
  }

  async markAllNotificationsRead() {
    const response = await this.client.post('/notifications/read-all');
    return response.data as { updated: number };
  }

  async deleteNotification(id: string) {
    const response = await this.client.delete(`/notifications/${id}`);
    return response.data as { deleted: boolean };
  }

  /** Save an article. Idempotent. */
  async addBookmark(articleId: string) {
    const response = await this.client.post(`/bookmarks/${articleId}`);
    return response.data as { bookmarked: boolean; savedAt?: string };
  }

  /** Remove a save. Idempotent. */
  async removeBookmark(articleId: string) {
    const response = await this.client.delete(`/bookmarks/${articleId}`);
    return response.data as { bookmarked: boolean };
  }

  /**
   * Member directory, readable by any signed-in member.
   *
   * Returns a narrower field set than `getMembers` — no e-mail, phone or
   * student id — because it is not an administration view.
   */
  async getMemberDirectory(params?: {
    page?: number;
    limit?: number;
    q?: string;
    divisionId?: string;
    university?: string;
    degree?: string;
  }) {
    const response = await this.client.get('/members/directory', { params });
    return response.data;
  }

  async getMembers(params?: { page?: number; limit?: number; role?: string; search?: string; membershipStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' }) {
    const response = await this.client.get('/members', { params });
    return response.data;
  }

  async getMember(id: string) {
    const response = await this.client.get(`/members/${id}`);
    return response.data;
  }

  async updateMember(id: string, data: { role?: string; position?: string; divisionId?: string }) {
    const response = await this.client.put(`/members/${id}`, data);
    return response.data;
  }

  /** Short-lived signed URL for a member's private proof-of-studentship document. */
  async getMemberDocumentUrl(id: string): Promise<{ url: string }> {
    const response = await this.client.get(`/members/${id}/document-url`);
    return response.data;
  }

  async deleteMember(id: string) {
    const response = await this.client.delete(`/members/${id}`);
    return response.data;
  }

  async getMemberStats() {
    const response = await this.client.get('/members/stats');
    return response.data;
  }

  async approveMember(id: string) {
    const response = await this.client.patch(`/members/${id}/approve`);
    return response.data;
  }

  async rejectMember(id: string, reason?: string) {
    const response = await this.client.patch(`/members/${id}/reject`, { reason });
    return response.data;
  }

  // SETTINGS
  /** Settings any visitor may read. Does not include the WhatsApp invite. */
  async getSettings() {
    const response = await this.client.get('/settings');
    return response.data;
  }

  /**
   * Settings a signed-in member may read, including the WhatsApp community
   * invite. Requires a session — the invite is not public.
   */
  async getMemberSettings() {
    const response = await this.client.get('/settings/member');
    return response.data as { settings?: { whatsappGroupLink?: string } };
  }

  async getAllSettings() {
    const response = await this.client.get('/settings/all');
    return response.data;
  }

  async updateSettings(settings: Record<string, string>) {
    const response = await this.client.put('/settings', { settings });
    return response.data;
  }

  // Pages
  async getPages() {
    const response = await this.client.get('/pages');
    return response.data;
  }

  async getPage(id: string) {
    const response = await this.client.get(`/pages/${id}`);
    return response.data;
  }

  async getPageBySlug(slug: string) {
    const response = await this.client.get(`/pages/slug/${slug}`);
    return response.data;
  }

  async createPage(data: PageInput) {
    const response = await this.client.post('/pages', data);
    return response.data;
  }

  async updatePage(id: string, data: Partial<PageInput>) {
    const response = await this.client.put(`/pages/${id}`, data);
    return response.data;
  }

  async deletePage(id: string) {
    const response = await this.client.delete(`/pages/${id}`);
    return response.data;
  }

  async getPagesAdmin(params?: { page?: number; limit?: number; search?: string; type?: string }) {
    const response = await this.client.get('/pages/admin/all', { params });
    return response.data;
  }

  async getPageAdmin(id: string) {
    const response = await this.client.get(`/pages/admin/${id}`);
    return response.data;
  }

  /**
   * Admin lookup by slug. The public `/pages/slug/*` route only returns
   * published pages, so the editor would lock itself out of any page it just
   * unpublished. This resolves the slug through the admin listing first.
   */
  async getPageAdminBySlug(slug: string) {
    const list = await this.getPagesAdmin({ limit: 200 });
    const match = (list.pages || []).find(
      (p: { slug: string }) => p.slug === slug
    );
    if (!match) return { page: null };
    return this.getPageAdmin(match.id);
  }

  // ===========================================
  // PAGE BLOCKS CRUD (admin only)
  // ===========================================
  async createPageBlock(pageId: string, data: any) {
    const response = await this.client.post(`/pages/${pageId}/blocks`, data);
    return response.data;
  }

  async updatePageBlock(blockId: string, data: any) {
    const response = await this.client.put(`/pages/blocks/${blockId}`, data);
    return response.data;
  }

  async deletePageBlock(blockId: string) {
    const response = await this.client.delete(`/pages/blocks/${blockId}`);
    return response.data;
  }

  async reorderPageBlocks(pageId: string, blockIds: string[]) {
    const response = await this.client.put(`/pages/${pageId}/blocks/reorder`, { blockIds });
    return response.data;
  }

  // Upload
  async uploadImage(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  // Upload registration document (PDF, max 2MB) — public endpoint, no auth required
  async uploadDocument(formData: FormData): Promise<{ url: string; filename: string; mimetype: string; size: number }> {
    const response = await this.client.post('/upload/document', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  // ===========================================
  // PASSWORD RESET
  // ===========================================
  async forgotPassword(email: string) {
    const response = await this.client.post('/auth/forgot-password', { email });
    return response.data;
  }

  async resetPassword(token: string, password: string) {
    const response = await this.client.post('/auth/reset-password', { token, password });
    return response.data;
  }

  // ===========================================
  // EMAIL VERIFICATION
  // ===========================================
  async verifyEmail(token: string) {
    const response = await this.client.post('/auth/verify-email', { token });
    return response.data;
  }

  async resendVerification(email: string) {
    const response = await this.client.post('/auth/resend-verification', { email });
    return response.data;
  }

  // ===========================================
  // PROFILE
  // ===========================================
  async getProfile() {
    const response = await this.client.get('/auth/profile');
    return response.data;
  }

  async updateProfile(data: {
    name?: string;
    avatar?: string;
    phone?: string;
    personalEmail?: string;
    bio?: string;
    linkedIn?: string;
    instagram?: string;
    twitter?: string;
  }) {
    const response = await this.client.put('/auth/profile', data);
    return response.data;
  }

  // ===========================================
  // EVENT REGISTRATIONS
  // (mounted under /api/event-registration in the backend)
  // ===========================================
  /**
   * Register for an event. Signing in is optional: pass `guest` when there is no
   * account, and the API records the registration against those details.
   */
  async registerForEvent(
    eventId: string,
    responses?: Record<string, string | string[]>,
    guest?: { name: string; email: string }
  ) {
    const response = await this.client.post('/event-registration', {
      eventId,
      responses,
      ...(guest ? { guestName: guest.name, guestEmail: guest.email } : {}),
    });
    return response.data;
  }

  async cancelRegistration(registrationId: string) {
    const response = await this.client.delete(`/event-registration/${registrationId}`);
    return response.data;
  }

  async getMyRegistrations() {
    const response = await this.client.get('/event-registration/my');
    return response.data;
  }

  async getEventRegistrations(eventId: string) {
    const response = await this.client.get(`/event-registration/event/${eventId}`);
    return response.data;
  }

  /**
   * Check an attendee in from the code they show at the door.
   *
   * Scoped to one event, so a short code is enough to identify a person.
   */
  async checkInByCode(eventId: string, code: string) {
    const response = await this.client.post(
      `/event-registration/event/${eventId}/checkin-by-code`,
      { code }
    );
    return response.data as {
      message: string;
      alreadyCheckedIn?: boolean;
      registration?: { id: string; checkInCode: string; User?: { name: string } };
    };
  }

  async checkInAttendee(registrationId: string) {
    const response = await this.client.patch(`/event-registration/${registrationId}/checkin`);
    return response.data;
  }

  async updateRegistrationStatus(registrationId: string, status: string) {
    const response = await this.client.patch(`/event-registration/${registrationId}/status`, { status });
    return response.data;
  }

  // ===========================================
  // EVENT DOCUMENTATION
  // ===========================================
  /**
   * Public after-event gallery for a published event, by slug.
   *
   * Separate from `getEventDocumentation`, which needs an admin session.
   */
  async getPublicEventDocumentation(slug: string) {
    const response = await this.client.get(`/event-documentation/public/${slug}`);
    return response.data;
  }

  async getEventDocumentation(eventId: string) {
    const response = await this.client.get(`/event-documentation/event/${eventId}`);
    return response.data;
  }

  async addEventDocumentation(data: {
    eventId: string;
    type: 'PHOTO' | 'VIDEO' | 'LINK';
    url: string;
    title?: string;
    description?: string;
  }) {
    const response = await this.client.post('/event-documentation', data);
    return response.data;
  }

  async updateEventDocumentation(id: string, data: {
    type?: 'PHOTO' | 'VIDEO' | 'LINK';
    url?: string;
    title?: string;
    description?: string;
  }) {
    const response = await this.client.put(`/event-documentation/${id}`, data);
    return response.data;
  }

  async deleteEventDocumentation(id: string) {
    const response = await this.client.delete(`/event-documentation/${id}`);
    return response.data;
  }

  // ===========================================
  // MEDIA LIBRARY
  // ===========================================
  async getMedia(params?: { folder?: string; page?: number; limit?: number; search?: string }) {
    const response = await this.client.get('/media', { params });
    return response.data;
  }

  async deleteMedia(id: string) {
    const response = await this.client.delete(`/media/${id}`);
    return response.data;
  }

  async updateMedia(id: string, data: { altText?: string; folder?: string }) {
    const response = await this.client.patch(`/media/${id}`, data);
    return response.data;
  }

  // ===========================================
  // NEWSLETTER
  // ===========================================
  async subscribeNewsletter(email: string, name?: string) {
    const response = await this.client.post('/newsletter/subscribe', { email, name });
    return response.data;
  }

  async unsubscribeNewsletter(email: string) {
    const response = await this.client.post('/newsletter/unsubscribe', { email });
    return response.data;
  }

  async getNewsletterSubscribers(params?: { page?: number; limit?: number; active?: boolean }) {
    const response = await this.client.get('/newsletter/subscribers', { params });
    return response.data;
  }

  async sendNewsletter(subject: string, content: string) {
    const response = await this.client.post('/newsletter/send', { subject, content });
    return response.data;
  }

  // ===========================================
  // SEARCH
  // ===========================================
  async search(query: string, type?: 'events' | 'articles' | 'members', params?: { page?: number; limit?: number }) {
    const response = await this.client.get('/search', {
      params: { q: query, type, ...params }
    });
    return response.data;
  }

  // ===========================================
  // AUDIT LOGS (Admin)
  // ===========================================
  async getAuditLogs(params?: { entity?: string; action?: string; page?: number; limit?: number }) {
    const response = await this.client.get('/audit-logs', { params });
    return response.data;
  }

  async getEntityAuditLogs(entity: string, entityId: string) {
    const response = await this.client.get(`/audit-logs/entity/${entity}/${entityId}`);
    return response.data;
  }

  // ===========================================
  // COMMENTS
  // ===========================================
  async getArticleComments(articleId: string) {
    const response = await this.client.get(`/comments/article/${articleId}`);
    return response.data;
  }

  async getResearchComments(researchId: string) {
    const response = await this.client.get(`/comments/research/${researchId}`);
    return response.data;
  }

  async createPublicComment(data: {
    articleId?: string;
    researchId?: string;
    content: string;
    userName: string;
    userEmail: string;
    parentId?: string;
  }) {
    const response = await this.client.post('/comments/public', data);
    return response.data;
  }

  async createComment(data: {
    articleId?: string;
    researchId?: string;
    content: string;
    parentId?: string;
  }) {
    const response = await this.client.post('/comments', data);
    return response.data;
  }

  async getAllComments(params?: { page?: number; limit?: number; articleId?: string; researchId?: string; hidden?: boolean }) {
    const response = await this.client.get('/comments', { params });
    return response.data;
  }

  async getCommentStats() {
    const response = await this.client.get('/comments/stats');
    return response.data;
  }

  async toggleCommentVisibility(id: string, isHidden: boolean) {
    const response = await this.client.patch(`/comments/${id}/visibility`, { isHidden });
    return response.data;
  }

  async deleteComment(id: string) {
    const response = await this.client.delete(`/comments/${id}`);
    return response.data;
  }

  // ===========================================
  // ANALYTICS
  // ===========================================
  async getArticleAnalytics(params?: { period?: number }) {
    const response = await this.client.get('/analytics/articles', { params });
    return response.data;
  }

  async getResearchAnalytics(params?: { period?: number }) {
    const response = await this.client.get('/analytics/research', { params });
    return response.data;
  }

  async getDashboardAnalytics() {
    const response = await this.client.get('/analytics/dashboard');
    return response.data;
  }

  async getEngagementAnalytics(params?: { period?: number }) {
    const response = await this.client.get('/analytics/engagement', { params });
    return response.data;
  }

  async trackDownload(researchId: string, userId?: string) {
    const response = await this.client.post(`/analytics/download/${researchId}`, { userId });
    return response.data;
  }

  async getResearchDownloadAnalytics(researchId: string) {
    const response = await this.client.get(`/analytics/downloads/${researchId}`);
    return response.data;
  }

  // ===========================================
  // PEMIRA
  // ===========================================
  async getElections(params?: { status?: string }) {
    const response = await this.client.get('/elections', { params });
    return response.data;
  }

  async getActiveElection() {
    const response = await this.client.get('/elections/active');
    return response.data;
  }

  async getElection(id: string) {
    const response = await this.client.get(`/elections/${id}`);
    return response.data;
  }

  async createElection(data: {
    title: string;
    description?: string;
    registrationStart: string;
    registrationEnd: string;
    campaignStart: string;
    campaignEnd: string;
    votingStart: string;
    votingEnd: string;
  }) {
    const response = await this.client.post('/elections', data);
    return response.data;
  }

  async updateElection(id: string, data: Partial<{
    title: string;
    description?: string;
    registrationStart: string;
    registrationEnd: string;
    campaignStart: string;
    campaignEnd: string;
    votingStart: string;
    votingEnd: string;
    status?: string;
  }>) {
    // The API route is PATCH /elections/:id; a PUT here 404s, so editing an
    // election's settings and publishing results silently failed.
    const response = await this.client.patch(`/elections/${id}`, data);
    return response.data;
  }

  async deleteElection(id: string) {
    const response = await this.client.delete(`/elections/${id}`);
    return response.data;
  }

  async getElectionResults(id: string) {
    const response = await this.client.get(`/elections/${id}/results`);
    return response.data;
  }

  async getElectionVoters(id: string) {
    const response = await this.client.get(`/elections/${id}/voters`);
    return response.data;
  }

  async getCandidates(electionId: string, params?: { status?: string }) {
    const response = await this.client.get(`/elections/${electionId}/candidates`, { params });
    return response.data;
  }

  async registerCandidate(electionId: string, data: {
    vision: string;
    mission: string;
    experience?: string;
    program?: string;
    slogan?: string;
    posterUrl?: string;
  }) {
    const response = await this.client.post(`/elections/${electionId}/candidates`, data);
    return response.data;
  }

  async approveCandidate(candidateId: string) {
    const response = await this.client.patch(`/candidates/${candidateId}/approve`);
    return response.data;
  }

  async rejectCandidate(candidateId: string, reason: string) {
    const response = await this.client.patch(`/candidates/${candidateId}/reject`, { reason });
    return response.data;
  }

  async withdrawCandidate(candidateId: string) {
    const response = await this.client.delete(`/candidates/${candidateId}`);
    return response.data;
  }

  async castVote(electionId: string, candidateId: string) {
    const response = await this.client.post(`/elections/${electionId}/vote`, { candidateId });
    return response.data;
  }

  async getMyVote(electionId: string) {
    const response = await this.client.get(`/elections/${electionId}/my-vote`);
    return response.data;
  }

  // ===========================================
  // LANDING PAGE SECTIONS (PUBLIC)
  // ===========================================
  async getLandingSections() {
    const response = await this.client.get('/landing-sections');
    return response.data;
  }

  async getLandingSectionByKey(key: string) {
    const response = await this.client.get(`/landing-sections/key/${key}`);
    return response.data;
  }

  // ===========================================
  // LANDING PAGE SECTIONS (ADMIN)
  // ===========================================
  async getLandingSectionsAdmin() {
    const response = await this.client.get('/landing-sections/admin');
    return response.data;
  }

  async createLandingSection(data: SectionInput) {
    const response = await this.client.post('/landing-sections', data);
    return response.data;
  }

  async updateLandingSection(id: string, data: Partial<SectionInput>) {
    const response = await this.client.put(`/landing-sections/${id}`, data);
    return response.data;
  }

  async deleteLandingSection(id: string) {
    const response = await this.client.delete(`/landing-sections/${id}`);
    return response.data;
  }

  async reorderLandingSections(sections: { id: string; order: number }[]) {
    const response = await this.client.put('/landing-sections/reorder', { sections });
    return response.data;
  }

  // ===========================================
  // SECTION BLOCKS (ADMIN)
  // ===========================================
  async createSectionBlock(sectionId: string, data: BlockInput) {
    const response = await this.client.post(`/landing-sections/${sectionId}/blocks`, data);
    return response.data;
  }

  async updateSectionBlock(sectionId: string, blockId: string, data: Partial<BlockInput>) {
    const response = await this.client.put(`/landing-sections/${sectionId}/blocks/${blockId}`, data);
    return response.data;
  }

  async deleteSectionBlock(sectionId: string, blockId: string) {
    const response = await this.client.delete(`/landing-sections/${sectionId}/blocks/${blockId}`);
    return response.data;
  }

  async reorderSectionBlocks(sectionId: string, blocks: { id: string; order: number }[]) {
    const response = await this.client.put(`/landing-sections/${sectionId}/blocks/reorder`, { blocks });
    return response.data;
  }

  // ===========================================
  // MENU ITEMS (PUBLIC)
  // ===========================================
  async getMenuItems() {
    const response = await this.client.get('/menus');
    return response.data;
  }

  async getMenuItem(key: string) {
    const response = await this.client.get(`/menus/${key}`);
    return response.data;
  }

  async getSiteConfig() {
    const response = await this.client.get('/config');
    return response.data;
  }

  async getSiteConfigByKey(key: string) {
    const response = await this.client.get(`/config/${key}`);
    return response.data;
  }

  // ===========================================
  // MENU ITEMS (ADMIN)
  // ===========================================
  async getMenuItemsAdmin() {
    const response = await this.client.get('/admin/menus');
    return response.data;
  }

  async updateMenuItem(key: string, data: { items: any; enabled?: boolean }) {
    const response = await this.client.put(`/admin/menus/${key}`, data);
    return response.data;
  }

  async getSiteConfigAdmin() {
    const response = await this.client.get('/admin/config');
    return response.data;
  }

  async updateSiteConfig(key: string, config: any) {
    const response = await this.client.put(`/admin/config/${key}`, { config });
    return response.data;
  }

  async getBlockData(params: {
    type: string;
    filter?: string;
    limit?: number;
    category?: string;
  }): Promise<any[]> {
    const query: Record<string, string> = { type: params.type };
    if (params.filter) query.filter = params.filter;
    if (params.limit) query.limit = String(params.limit);
    if (params.category) query.category = params.category;
    const response = await this.client.get('/blocks/data', { params: query });
    return Array.isArray(response.data) ? response.data : response.data?.data ?? [];
  }
}

export const api = new ApiClient();
export default api;
