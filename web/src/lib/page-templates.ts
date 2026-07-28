/**
 * Page Template Registry — Single Source of Truth
 *
 * Defines which block types are available per template, default blocks to
 * pre-fill, and the layout wrapper used for public rendering.
 *
 * To add a new template:
 * 1. Add the id to `PageTemplate` type
 * 2. Add an entry to `TEMPLATE_REGISTRY`
 * 3. (Optional) Add a layout wrapper in the public route renderer
 */

import {
  FileText,
  Layout,
  Users,
  Clock,
  CalendarDays,
  Grid3x3,
  type LucideIcon,
} from 'lucide-react';
import type { BlockType, BlockInput } from './api-types';

// ============================================
// Types
// ============================================

export type PageTemplate =
  | 'default'
  | 'landing'
  | 'cabinet'
  | 'timeline'
  | 'event_list'
  | 'division_grid';

export type TemplateLayout = 'article' | 'full' | 'wide';

export interface TemplateConfig {
  id: PageTemplate;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string; // Tailwind gradient classes, e.g. 'from-slate-500 to-slate-600'
  layout: TemplateLayout;
  allowedBlocks: BlockType[];
  defaultBlocks?: BlockInput[];
}

// ============================================
// All block types (for default template)
// ============================================

const ALL_BLOCK_TYPES: BlockType[] = [
  'HEADING',
  'TEXT',
  'IMAGE',
  'GALLERY',
  'VIDEO',
  'CTA_BUTTON',
  'STATISTIC',
  'FEATURE',
  'HERO',
  'ARTICLE_CARD',
  'EVENT_CARD',
  'MEMBER_CARD',
  'SOCIAL_LINK',
  'NEWSLETTER_FORM',
  'QUOTE',
  'CODE',
  'COLUMNS',
  'DIVIDER',
  'SPACER',
];

// ============================================
// Template Registry
// ============================================

export const TEMPLATE_REGISTRY: Record<PageTemplate, TemplateConfig> = {
  default: {
    id: 'default',
    label: 'Default Page',
    description: 'A general page with every block type available.',
    icon: FileText,
    color: 'from-slate-500 to-slate-600',
    layout: 'article',
    allowedBlocks: ALL_BLOCK_TYPES,
    defaultBlocks: [
      { type: 'HEADING', title: 'New Page', order: 0, enabled: true },
      { type: 'TEXT', content: 'Start writing your content here...', order: 1, enabled: true },
    ],
  },

  landing: {
    id: 'landing',
    label: 'Landing Page',
    description: 'A main page with hero, features, statistics, and CTA.',
    icon: Layout,
    color: 'from-[#E8231A] to-[#C41E16]',
    layout: 'full',
    allowedBlocks: [
      'HERO',
      'FEATURE',
      'STATISTIC',
      'CTA_BUTTON',
      'TEXT',
      'IMAGE',
      'VIDEO',
      'NEWSLETTER_FORM',
      'GALLERY',
    ],
    defaultBlocks: [
      {
        type: 'HERO',
        title: 'Welcome to PPIA Auckland',
        subtitle: 'Perhimpunan Pelajar Indonesia di Auckland',
        content: 'Connect, learn, and grow with our community.',
        order: 0,
        enabled: true,
      },
      { type: 'FEATURE', title: 'Our Features', order: 1, enabled: true },
    ],
  },

  cabinet: {
    id: 'cabinet',
    label: 'Cabinet',
    description: 'A cabinet/leadership page with members and divisions.',
    icon: Users,
    color: 'from-indigo-500 to-violet-600',
    layout: 'wide',
    allowedBlocks: ['HEADING', 'TEXT', 'MEMBER_CARD', 'IMAGE', 'CTA_BUTTON'],
    defaultBlocks: [
      {
        type: 'HEADING',
        title: 'Our Cabinet',
        subtitle: 'Meet the team behind PPIA Auckland',
        order: 0,
        enabled: true,
      },
      { type: 'MEMBER_CARD', title: 'New Member', order: 1, enabled: true },
    ],
  },

  timeline: {
    id: 'timeline',
    label: 'Timeline / Archive',
    description: 'A history archive page with a milestone timeline.',
    icon: Clock,
    color: 'from-amber-500 to-orange-600',
    layout: 'article',
    allowedBlocks: ['HEADING', 'TEXT', 'IMAGE', 'CTA_BUTTON', 'QUOTE', 'GALLERY'],
    defaultBlocks: [
      {
        type: 'HEADING',
        title: 'Our History',
        subtitle: 'Milestones throughout the years',
        order: 0,
        enabled: true,
      },
      { type: 'TEXT', content: 'Document your historical milestones here...', order: 1, enabled: true },
    ],
  },

  event_list: {
    id: 'event_list',
    label: 'Events',
    description: 'An event listing page with event cards.',
    icon: CalendarDays,
    color: 'from-cyan-500 to-blue-600',
    layout: 'wide',
    allowedBlocks: ['HEADING', 'TEXT', 'EVENT_CARD', 'CTA_BUTTON', 'IMAGE'],
    defaultBlocks: [
      {
        type: 'HEADING',
        title: 'Upcoming Events',
        subtitle: 'Join our upcoming activities',
        order: 0,
        enabled: true,
      },
      { type: 'EVENT_CARD', title: 'New Event', order: 1, enabled: true },
    ],
  },

  division_grid: {
    id: 'division_grid',
    label: 'Divisions',
    description: 'A divisions overview page with division cards.',
    icon: Grid3x3,
    color: 'from-emerald-500 to-teal-600',
    layout: 'wide',
    allowedBlocks: ['HEADING', 'TEXT', 'FEATURE', 'IMAGE', 'CTA_BUTTON'],
    defaultBlocks: [
      {
        type: 'HEADING',
        title: 'Our Divisions',
        subtitle: 'Explore our organizational divisions',
        order: 0,
        enabled: true,
      },
      { type: 'FEATURE', title: 'New Division', order: 1, enabled: true },
    ],
  },
};

// ============================================
// Helpers
// ============================================

export const TEMPLATE_LIST: TemplateConfig[] = Object.values(TEMPLATE_REGISTRY);

export function getTemplate(id: string): TemplateConfig {
  return TEMPLATE_REGISTRY[id as PageTemplate] ?? TEMPLATE_REGISTRY.default;
}

export function getAllowedBlocks(templateId: string): BlockType[] {
  return getTemplate(templateId).allowedBlocks;
}

export function getDefaultBlocks(templateId: string): BlockInput[] {
  return getTemplate(templateId).defaultBlocks ?? [];
}

export function getTemplateLayout(templateId: string): TemplateLayout {
  return getTemplate(templateId).layout;
}

export function isValidTemplate(id: string): id is PageTemplate {
  return id in TEMPLATE_REGISTRY;
}
