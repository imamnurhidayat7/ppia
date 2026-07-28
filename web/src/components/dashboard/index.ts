// Dashboard Component Exports

// Shell
export { DashboardShell } from './dashboard-shell';
export { DashboardChrome } from './dashboard-chrome';
export { CommandPalette } from './command-palette';
export { NotificationCenter } from './notification-center';
export { ThemeToggle, ThemeToggleButton } from './theme-toggle';
export { DashboardDataProvider, useDashboardData } from './dashboard-data-context';
export type { DashboardCounts, DashboardNotification } from './dashboard-data-context';

// Navigation config
export {
  ADMIN_NAV,
  MEMBER_NAV,
  ADMIN_QUICK_CREATE,
  SEGMENT_LABELS,
  canAccess,
  filterSections,
  flattenNav,
  isAdminRole,
  isContentEditor,
} from './nav-config';
export type { DashboardRole, NavItem, NavSection } from './nav-config';

// Page building blocks — compose these instead of restyling pages by hand
export {
  PageStack,
  PageHeading,
  PageHero,
  SectionCard,
  SectionHeading,
  Toolbar,
  SearchField,
  FilterSelect,
  ResetFiltersButton,
  TableShell,
  Th,
  Td,
  Tr,
  IconAction,
  RowActions,
  StatTile,
  StatTileRow,
  EmptyBlock,
  LoadingRows,
  LoadingCards,
  PageLoading,
  ListPageSkeleton,
  AccessDenied,
  Breadcrumbish,
  DetailItem,
  Field,
  FormGrid,
  FormActions,
} from './page-kit';
export type { TileTone } from './page-kit';

// Data display
export { KpiCard, KpiGrid } from './kpi-card';
export type { KpiCardProps, KpiTone } from './kpi-card';
export { Sparkline, BarChart, DonutChart } from './mini-chart';
export type { BarDatum, DonutSlice } from './mini-chart';
export { PageHeader } from './page-header';

export { EmptyState } from './empty-state';
