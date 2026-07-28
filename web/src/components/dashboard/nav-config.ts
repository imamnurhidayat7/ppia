import {
  BarChart3,
  BookmarkCheck,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  ClipboardList,
  FileEdit,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  Layout,
  Mail,
  MessageSquare,
  Palette,
  Search,
  Settings,
  Shield,
  Tag,
  User,
  Users,
  Vote,
  type LucideIcon,
} from 'lucide-react';

/**
 * The role strings the API actually returns (Prisma `Role` enum).
 * The previous sidebar used 'admin' | 'pengurus' | 'member', which never
 * matched anything, so every role filter silently failed.
 */
export type DashboardRole = 'MEMBER' | 'BOARD' | 'SUPER_ADMIN';

/** Which counter (if any) feeds the badge next to a nav item. */
export type NavBadgeKey = 'pendingMembers' | 'recentComments';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Roles allowed to see the item. Omitted means "everyone". */
  roles?: DashboardRole[];
  /** Match child routes as active too. Defaults to true. */
  matchNested?: boolean;
  badgeKey?: NavBadgeKey;
  description?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export function canAccess(item: NavItem, role?: string): boolean {
  if (!item.roles) return true;
  return item.roles.includes(role as DashboardRole);
}

/**
 * BOARD is a content role: it may create and edit what visitors read on the
 * site (articles, events, research, pages, media, comments) and nothing else.
 * Member records, elections, newsletters, site configuration and audit trails
 * belong to SUPER_ADMIN. The API enforces the same split — changing it here
 * alone would only hide buttons, not block requests.
 */
/**
 * BOARD may create and edit the content visitors read — articles, events,
 * research, comments, media, tags. It may not restructure the site itself:
 * the homepage editor, the page tree and the menu/theme settings are
 * SUPER_ADMIN only, because a change there affects every page at once.
 * The API enforces the same split; widening it here alone would only reveal
 * buttons whose requests still fail.
 */
const CONTENT: DashboardRole[] = ['SUPER_ADMIN', 'BOARD'];
const SUPER_ONLY: DashboardRole[] = ['SUPER_ADMIN'];

/** True when the role may reach the admin area at all. */
export function isContentEditor(role?: string): boolean {
  return role === 'BOARD';
}

/** Navigation for the member-facing side of the dashboard. */
export const MEMBER_NAV: NavSection[] = [
  {
    title: 'Home',
    items: [
      {
        label: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        matchNested: false,
        description: 'A summary of your activity',
      },
    ],
  },
  {
    title: 'Explore',
    items: [
      { label: 'Articles', href: '/dashboard/articles', icon: FileText, description: 'News and community writing' },
      { label: 'Events', href: '/dashboard/events', icon: Calendar, description: 'Schedule and registrations' },
      { label: 'Research', href: '/dashboard/research', icon: BookOpen, description: 'Publications and academic work' },
      { label: 'Member directory', href: '/dashboard/directory', icon: Users, description: 'Find other Indonesian students' },
      { label: 'PEMIRA', href: '/dashboard/pemira', icon: Vote, description: 'Student body election' },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Saved articles', href: '/dashboard/saved', icon: BookmarkCheck, description: 'Your reading list' },
      { label: 'My profile', href: '/dashboard/profile', icon: User, description: 'Personal details and member card' },
    ],
  },
];

/** Navigation for the admin side of the dashboard. */
export const ADMIN_NAV: NavSection[] = [
  {
    title: 'Overview',
    items: [
      {
        label: 'Dashboard',
        href: '/dashboard/admin',
        icon: LayoutDashboard,
        matchNested: false,
        roles: CONTENT,
        description: 'Platform overview',
      },
      {
        label: 'Analytics',
        href: '/dashboard/admin/analytics',
        icon: BarChart3,
        roles: CONTENT,
        description: 'Content performance',
      },
    ],
  },
  {
    title: 'Content',
    items: [
      { label: 'Articles', href: '/dashboard/admin/articles', icon: FileText, roles: CONTENT, description: 'News and articles' },
      { label: 'Events', href: '/dashboard/admin/events', icon: Calendar, roles: CONTENT, description: 'Event schedule' },
      { label: 'Research', href: '/dashboard/admin/research', icon: BookOpen, roles: CONTENT, description: 'Academic publications' },
      {
        label: 'Comments',
        href: '/dashboard/admin/comments',
        icon: MessageSquare,
        roles: CONTENT,
        badgeKey: 'recentComments',
        description: 'Discussion moderation',
      },
      { label: 'Media', href: '/dashboard/admin/media', icon: ImageIcon, roles: CONTENT, description: 'Image and file library' },
      { label: 'Tags', href: '/dashboard/admin/tags', icon: Tag, roles: CONTENT, description: 'Content grouping' },
    ],
  },
  {
    title: 'Site pages',
    items: [
      { label: 'Homepage', href: '/dashboard/admin/canvas', icon: Layout, roles: SUPER_ONLY, description: 'Visual homepage editor' },
      { label: 'Pages', href: '/dashboard/admin/pages', icon: FileEdit, roles: SUPER_ONLY, description: 'About, Contact, and more' },
    ],
  },
  {
    title: 'Community',
    items: [
      {
        label: 'Members',
        href: '/dashboard/admin/members',
        icon: Users,
        roles: SUPER_ONLY,
        badgeKey: 'pendingMembers',
        description: 'Member approval and management',
      },
      { label: 'Divisions', href: '/dashboard/admin/divisions', icon: Building2, roles: SUPER_ONLY, description: 'Organisation structure' },
      { label: 'Event registrations', href: '/dashboard/admin/registrations', icon: ClipboardList, roles: SUPER_ONLY, description: 'Attendees and attendance' },
      { label: 'PEMIRA', href: '/dashboard/admin/pemira', icon: Vote, roles: SUPER_ONLY, description: 'Election administration' },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Newsletter', href: '/dashboard/admin/newsletter', icon: Mail, roles: SUPER_ONLY, description: 'Subscribers and sends' },
      { label: 'Menus & theme', href: '/dashboard/admin/landing-page', icon: Palette, roles: SUPER_ONLY, description: 'Navigation, footer, colours' },
      { label: 'Search', href: '/dashboard/admin/search', icon: Search, roles: SUPER_ONLY, description: 'Search console' },
      { label: 'Audit log', href: '/dashboard/admin/audit-logs', icon: Shield, roles: SUPER_ONLY, description: 'Activity trail' },
      { label: 'Settings', href: '/dashboard/admin/settings', icon: Settings, roles: SUPER_ONLY, description: 'Site configuration' },
    ],
  },
];

/**
 * Flattened, role-filtered list used by the command palette so every reachable
 * page is keyboard-navigable without duplicating the tree above.
 */
export function flattenNav(sections: NavSection[], role?: string): NavItem[] {
  return sections.flatMap((section) => section.items.filter((item) => canAccess(item, role)));
}

export function filterSections(sections: NavSection[], role?: string): NavSection[] {
  return sections
    .map((section) => ({ ...section, items: section.items.filter((item) => canAccess(item, role)) }))
    .filter((section) => section.items.length > 0);
}

export function isAdminRole(role?: string): boolean {
  return role === 'SUPER_ADMIN' || role === 'BOARD';
}

/** Quick-create shortcuts surfaced in the topbar and admin home. */
export const ADMIN_QUICK_CREATE: NavItem[] = [
  { label: 'New article', href: '/dashboard/admin/articles/new', icon: FileText, roles: CONTENT },
  { label: 'New event', href: '/dashboard/admin/events/new', icon: Calendar, roles: CONTENT },
  { label: 'New research', href: '/dashboard/admin/research/new', icon: BookOpen, roles: CONTENT },
  { label: 'New page', href: '/dashboard/admin/pages', icon: FileEdit, roles: SUPER_ONLY },
];

/**
 * Human-readable labels for URL segments, used to build breadcrumbs without
 * hardcoding a trail in every page.
 */
export const SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  admin: 'Admin',
  members: 'Members',
  events: 'Events',
  articles: 'Articles',
  research: 'Research',
  divisions: 'Divisions',
  pages: 'Pages',
  analytics: 'Analytics',
  registrations: 'Registrations',
  comments: 'Comments',
  newsletter: 'Newsletter',
  search: 'Search',
  media: 'Media',
  tags: 'Tags',
  'audit-logs': 'Audit log',
  pemira: 'PEMIRA',
  directory: 'Member directory',
  saved: 'Saved articles',
  settings: 'Settings',
  profile: 'Profile',
  canvas: 'Homepage',
  'landing-page': 'Menus & theme',
  'page-builder': 'Page Builder',
  news: 'News',
  new: 'New',
  edit: 'Edit',
  documentation: 'Documentation',
  candidates: 'Candidates',
  voters: 'Voters',
  jobs: 'Jobs',
  marketplace: 'Marketplace',
};

export const OPPORTUNITY_LINKS: NavItem[] = [
  { label: 'Career info', href: '/opportunities/career-info', icon: Briefcase },
  { label: 'Scholarships', href: '/opportunities/scholarship', icon: BookOpen },
];
