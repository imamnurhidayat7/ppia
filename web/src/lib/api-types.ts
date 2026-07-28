// ===========================================
// Shared API Response Types
// ===========================================

// Generic paginated response
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Generic API response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
  status?: number;
}

// Auth types
export type MembershipStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName?: string;
  phone: string;
  studentId: string;
  university: string;
  universityEmail: string;
  upi: string;
  degree: string;
  major: string;
  graduationDate: string;
  funding: string;
  consent?: boolean;
  confirmation: boolean;
  loaCoe?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// User types
export interface User {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin" | "superadmin";
  nip?: string;
  username?: string;
  phone?: string;
  bio?: string;
  avatar?: string;
  divisionId?: string;
  division?: Division;
  isVerified: boolean;
  membershipStatus?: MembershipStatus;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  name: string;
  role: string;
  position?: string;
  divisionId?: string;
  division?: { id: string; name: string; slug: string; color?: string };
  avatar?: string;
  bio?: string;
  linkedIn?: string;
  instagram?: string;
  twitter?: string;
  isVerified?: boolean;
  memberCardUrl?: string;
  loaCoe?: string;
  personalEmail?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  studentId?: string;
  university?: string;
  universityEmail?: string;
  upi?: string;
  degree?: string;
  major?: string;
  graduationDate?: string;
  funding?: string;
  membershipStatus?: MembershipStatus;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

// Division types
export interface Division {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  order: number;
  members?: User[];
  createdAt: string;
  updatedAt: string;
}

export interface DivisionInput {
  name: string;
  slug: string;
  description?: string;
  color?: string;
}

// Event types
export interface Event {
  id: string;
  title: string;
  slug: string;
  description: string;
  content?: string;
  date: string;
  endDate?: string;
  location?: string;
  image?: string;
  category?: string;
  status: "draft" | "published" | "cancelled";
  featured: boolean;
  tags?: string[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventInput {
  title: string;
  slug: string;
  description: string;
  content?: object;
  imageUrl?: string;
  startDate: string;
  endDate?: string;
  location?: string;
  divisionId?: string;
  published?: boolean;
  capacity?: number;
  isFree?: boolean;
  registrationDeadline?: string;
  scheduledPublishAt?: string;
  scheduledUnpublishAt?: string;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  event: {
    id: string;
    title: string;
    slug: string;
    startDate: string;
    location?: string;
    imageUrl?: string;
  };
  userId: string;
  status: 'REGISTERED' | 'CANCELLED' | 'WAITLISTED' | 'ATTENDED' | 'NO_SHOW';
  registeredAt: string;
  checkedInAt?: string;
  /**
   * Six-character code the attendee shows at the door. Derived from the
   * registration id server-side, so it is present on every registration.
   */
  checkInCode?: string;
}

// Article types
export interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  coverImage?: string;
  category?: string;
  status: "draft" | "published" | "archived";
  featured: boolean;
  tags?: string[];
  author?: Pick<User, "id" | "name" | "avatar">;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArticleInput {
  title: string;
  slug: string;
  excerpt?: string;
  content: object;
  imageUrl?: string;
  category?: string;
  divisionId?: string;
  published?: boolean;
  scheduledPublishAt?: string;
  scheduledUnpublishAt?: string;
  isFeatured?: boolean;
  featuredOrder?: number;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  tags?: string[];
}

// Tag types
export interface Tag {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface TagInput {
  name: string;
  description?: string;
  color?: string;
}

// Research types
export interface Research {
  id: string;
  title: string;
  slug: string;
  abstract: string;
  content?: string;
  type: "paper" | "report" | "thesis" | "other";
  status: "draft" | "published" | "archived";
  divisionId?: string;
  division?: Division;
  author?: Pick<User, "id" | "name" | "avatar">;
  fileUrl?: string;
  tags?: string[];
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchInput {
  title: string;
  titleIndonesian?: string;
  slug?: string;
  abstract: string;
  abstractIndonesian?: string;
  researchType?: 'ACADEMIC_PAPER' | 'THESIS' | 'DISSERTATION' | 'RESEARCH_PROJECT' | 'PUBLICATION' | 'CONFERENCE_PAPER' | 'JOURNAL_ARTICLE';
  researchStatus?: 'DRAFT' | 'PENDING_REVIEW' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PUBLISHED';
  authors?: Record<string, unknown>[];
  publicationDate?: string;
  venue?: string;
  doi?: string;
  url?: string;
  keywords?: string;
  citationFormat?: string;
  pdfUrl?: string;
  divisionId?: string;
  published?: boolean;
  featuredOrder?: number;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  scheduledPublishAt?: string;
}

// Gallery types
export interface Gallery {
  id: string;
  title: string;
  description?: string;
  images: GalleryImage[];
  createdAt: string;
  updatedAt: string;
}

export interface GalleryImage {
  id: string;
  url: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
}

export interface GalleryInput {
  title: string;
  description?: string;
  images: { url: string; alt?: string; caption?: string }[];
}

// Media types
export interface Media {
  id: string;
  filename: string;
  url: string;
  mimetype: string;
  size: number;
  folder?: string;
  altText?: string;
  createdAt: string;
}

// Newsletter
export interface NewsletterSubscriber {
  id: string;
  email: string;
  name?: string;
  isActive: boolean;
  subscribedAt: string;
  unsubscribedAt?: string;
}

export interface NewsletterSubscription {
  email: string;
  name?: string;
  subscribedAt: string;
}

// Audit / Activity
export interface AuditLog {
  id: string;
  userId?: string;
  user?: { id: string; name: string; email: string };
  action: string;
  entity: string;
  entityId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface ActivityItem {
  id: string;
  type: "user" | "event" | "article" | "system";
  action: string;
  description: string;
  userId?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalEvents: number;
  totalArticles: number;
  totalMembers: number;
  recentActivity: ActivityItem[];
}

// Comment types
export interface Comment {
  id: string;
  content: string;
  articleId?: string;
  researchId?: string;
  userId?: string;
  userName: string;
  userEmail: string;
  parentId?: string;
  parent?: Comment;
  replies?: Comment[];
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name: string; avatar?: string };
  article?: { id: string; title: string; slug: string };
  research?: { id: string; title: string; slug: string };
}

export interface CommentStats {
  total: number;
  articleComments: number;
  researchComments: number;
  hidden: number;
  last7Days: number;
}

// ===========================================
// Page Builder Types
// ===========================================

// Block types for page builder (extends SectionBlock types)
export type BlockType =
  | 'TEXT'
  | 'IMAGE'
  | 'VIDEO'
  | 'CTA_BUTTON'
  | 'STATISTIC'
  | 'FEATURE'
  | 'ARTICLE_CARD'
  | 'EVENT_CARD'
  | 'MEMBER_CARD'
  | 'SOCIAL_LINK'
  | 'NEWSLETTER_FORM'
  | 'HERO'
  | 'GALLERY'
  | 'DIVIDER'
  | 'SPACER'
  | 'CODE'
  | 'QUOTE'
  | 'HEADING'
  | 'COLUMNS'
  | 'TIMELINE'
  | 'TEAM'
  | 'TABLE'
  | 'CONTACT'
  | 'COUNTDOWN'
  | 'SPONSOR'
  | 'MAP'
  | 'FAQ';

// Page block (for custom pages)
export interface PageBlock {
  id: string;
  pageId: string;
  type: BlockType;
  title?: string;
  titleId?: string;        // Indonesian
  subtitle?: string;
  subtitleId?: string;     // Indonesian
  content?: string;
  contentId?: string;      // Indonesian HTML content
  linkUrl?: string;
  linkText?: string;
  linkTextId?: string;
  imageUrl?: string;
  iconName?: string;
  color?: string;
  order: number;
  config?: Record<string, any>;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Block input for creating/updating blocks
export interface BlockInput {
  type: BlockType;
  title?: string;
  titleId?: string;
  subtitle?: string;
  subtitleId?: string;
  content?: string;
  contentId?: string;
  linkUrl?: string;
  linkText?: string;
  linkTextId?: string;
  imageUrl?: string;
  iconName?: string;
  color?: string;
  order?: number;
  config?: Record<string, any>;
  enabled?: boolean;
}

// Page author (minimal info)
export interface PageAuthor {
  id: string;
  name?: string;
  avatar?: string;
}

// Page model (full)
export interface Page {
  id: string;
  title: string;
  slug: string;
  content?: unknown;
  excerpt?: string;
  metaTitle?: string;
  metaDescription?: string;
  featuredImage?: string;
  pageType: 'standard' | 'landing' | 'custom';
  template: string; // default | landing | cabinet | timeline | event_list | division_grid
  published: boolean;
  author: PageAuthor;
  blocks?: PageBlock[];
  createdAt: string;
  updatedAt: string;
}

// Page list item (for listings)
export interface PageListItem {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  featuredImage?: string;
  pageType: string;
  template: string;
  published: boolean;
  updatedAt: string;
}

// Page input for creating/updating pages
export interface PageInput {
  title: string;
  slug?: string;
  content?: unknown;
  excerpt?: string;
  metaTitle?: string;
  metaDescription?: string;
  featuredImage?: string;
  pageType?: 'standard' | 'landing' | 'custom';
  template?: string;
  published?: boolean;
  blocks?: BlockInput[];
}

// Page response (for public API)
export interface PageResponse {
  page: Page;
}

// Pages list response
export interface PagesListResponse {
  pages: PageListItem[];
}

// Admin pages list response
export interface PagesAdminResponse {
  pages: (Page & { _count?: { blocks: number } })[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Block response
export interface BlockResponse {
  block: PageBlock;
}

// Reorder blocks request
export interface ReorderBlocksRequest {
  blockIds: string[];
}

// ===========================================
// Landing Page CMS Types (keep for landing pages)
// ===========================================

// Landing section block (uses same BlockType)
export interface SectionBlock {
  id: string;
  sectionId: string;
  type: BlockType;
  title?: string;
  titleId?: string;        // Indonesian
  subtitle?: string;
  subtitleId?: string;     // Indonesian
  content?: string;
  contentId?: string;     // Indonesian HTML content
  linkUrl?: string;
  linkText?: string;
  linkTextId?: string;     // Indonesian
  imageUrl?: string;
  iconName?: string;
  color?: string;
  order: number;
  config?: Record<string, any>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LandingSection {
  id: string;
  key: string;
  title?: string;
  titleId?: string;        // Indonesian
  subtitle?: string;
  subtitleId?: string;     // Indonesian
  description?: string;
  descriptionId?: string;   // Indonesian
  enabled: boolean;
  order: number;
  config?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  blocks?: SectionBlock[];
}

export interface SectionInput {
  key?: string;
  title?: string;
  titleId?: string;
  subtitle?: string;
  subtitleId?: string;
  description?: string;
  descriptionId?: string;
  enabled?: boolean;
  order?: number;
  config?: Record<string, any>;
}

export interface BlockInput {
  type: BlockType;
  title?: string;
  titleId?: string;
  subtitle?: string;
  subtitleId?: string;
  content?: string;
  contentId?: string;
  linkUrl?: string;
  linkText?: string;
  linkTextId?: string;
  imageUrl?: string;
  iconName?: string;
  color?: string;
  order?: number;
  config?: Record<string, any>;
  enabled?: boolean;
}

// Menu Types
export interface MenuItem {
  label: string;
  href?: string;
  children?: MenuItem[];
}

export interface MenuConfig {
  en: MenuItem[];
  id: MenuItem[];
}

export interface MenuItemResponse {
  id: string;
  key: string;
  items: MenuConfig;
  enabled: boolean;
}

// Site Config Types
export interface HeaderConfig {
  logoUrl?: string;
  logoAlt?: string;
  contactEmail?: string;
  contactPhone?: string;
  showSearch?: boolean;
}

export interface FooterConfig {
  logoUrl?: string;
  logoAlt?: string;
  description?: string;
  descriptionId?: string;
  address?: string;
  email?: string;
  phone?: string;
  copyrightText?: string;
}

export interface SocialConfig {
  instagram?: string;
  linkedin?: string;
  youtube?: string;
  tiktok?: string;
  facebook?: string;
}

export interface SiteConfigResponse {
  id: string;
  key: string;
  // COLORS is stored through the same site-config endpoint as HEADER/FOOTER/SOCIAL,
  // so its shape belongs in this union too.
  config: HeaderConfig | FooterConfig | SocialConfig | ColorConfig;
}

// Color configuration for landing page
export interface ColorConfig {
  primary?: string;      // Main brand color (default: navy)
  accent?: string;       // Accent color for buttons, highlights (default: red)
  textAccent?: string;   // Text highlight color (default: red)
  buttonPrimary?: string; // Primary button bg
  buttonSecondary?: string; // Secondary button bg
}

export interface ColorConfigResponse {
  id: string;
  key: 'COLORS';
  config: ColorConfig;
}

// Pemira (election) types
export interface Candidate {
  id: string;
  name: string;
  vision: string;
  mission: string[];
  photo?: string;
  voteCount?: number;
  createdAt: string;
}

export interface Election {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: "upcoming" | "active" | "ended";
  candidates: Candidate[];
  totalVotes?: number;
  createdAt: string;
}

export interface Ballot {
  id: string;
  electionId: string;
  candidateId: string;
  userId: string;
  castAt: string;
}

// Contact
export interface ContactInput {
  name: string;
  email: string;
  subject: string;
  message: string;
}

// Opportunity types
export interface Opportunity {
  id: string;
  title: string;
  slug: string;
  description: string;
  content?: string;
  type: "job" | "internship" | "scholarship" | "volunteer" | "other";
  organization?: string;
  location?: string;
  applicationUrl?: string;
  applicationDeadline?: string;
  status: "open" | "closed" | "draft";
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface OpportunityInput {
  title: string;
  description: string;
  content?: string;
  type: "job" | "internship" | "scholarship" | "volunteer" | "other";
  organization?: string;
  location?: string;
  applicationUrl?: string;
  applicationDeadline?: string;
  status?: "open" | "closed" | "draft";
  tags?: string[];
}
