/**
 * Section Form Schemas
 *
 * Defines the editor form for every landing section, and — critically — the
 * single source of truth for WHICH block column stores WHICH piece of content.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * BLOCK FIELD CONTRACT
 *
 * The public components in `web/src/components/sections/*` MUST read the same
 * column that the form below writes to. When these drift apart, the symptom is
 * "I edited it in the CMS but nothing changed on the page".
 *
 *   Block type   | title          | subtitle    | content | linkUrl   | imageUrl  | iconName | color         | config
 *   ------------ | -------------- | ----------- | ------- | --------- | --------- | -------- | ------------- | -------------
 *   STATISTIC    | label          | –           | number  | –         | –         | icon     | accent        | –
 *   CTA_BUTTON   | button label   | –           | –       | href      | –         | –        | button colour | variant
 *   FEATURE      | heading        | description | –       | –         | –         | icon     | accent        | –
 *   SPONSOR      | org name       | –           | –       | website   | logo      | –        | –             | –
 *   QUOTE        | person name    | role        | quote   | –         | photo     | –        | –             | –
 *   FAQ          | question       | –           | answer  | –         | –         | –        | –             | –
 *   VIDEO        | video title    | –           | –       | video url | thumbnail | –        | –             | –
 *
 * Anything not in this table is not rendered on the public page.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Each section schema defines:
 * - sectionFields: fields that map to the LandingSection model (or its config)
 * - blockGroups: repeater groups that map to SectionBlock records by block type
 */

// ============================================
// Types
// ============================================

export type SectionFieldType =
  | 'text'
  | 'textarea'
  | 'richtext'
  | 'image'
  | 'url'
  | 'number'
  | 'select'
  | 'color'
  | 'toggle';

export interface SectionFieldDef {
  /** Field key in the section model (e.g., 'title', 'subtitle') */
  key: string;
  /** Label shown to the user */
  label: string;
  /** Help text shown below the field */
  help?: string;
  /** Field type */
  type: SectionFieldType;
  /** Options for select type */
  options?: { label: string; value: string }[];
  /** When set, the value is stored inside the section's config JSON */
  configKey?: string;
  /** Placeholder text */
  placeholder?: string;
  /**
   * Optional heading this field is filed under in the editor.
   *
   * Sections with more than a handful of fields — membership has seven — read as
   * an undifferentiated stack without this. Fields sharing a group name are
   * rendered together under it, in schema order. Fields with no group come
   * first.
   */
  group?: string;
}

export interface BlockFieldDef {
  /** Column on the SectionBlock model this field writes to */
  key: string;
  /** Label shown to the user */
  label: string;
  /** Help text */
  help?: string;
  /** Field type */
  type: SectionFieldType;
  /** Options for select type */
  options?: { label: string; value: string }[];
  /** Placeholder */
  placeholder?: string;
  /**
   * When set, the value is stored inside the block's `config` JSON under this
   * key instead of as a top-level column. Use for presentation-only settings
   * that have no dedicated column (e.g., button variant).
   */
  configKey?: string;
}

export interface BlockGroupDef {
  /** Group label — e.g., "Statistics", "Call-to-action buttons" */
  label: string;
  /** Block type this group maps to */
  blockType: BlockType;
  /** Help text for the group */
  help?: string;
  /** Fields for each item in the repeater */
  fields: BlockFieldDef[];
  /** Minimum number of items (for UX guidance) */
  minItems?: number;
  /** Singular item label — e.g., "Statistic", "Button" */
  itemLabel: string;
}

export interface SectionSchema {
  /** Section key — e.g., 'hero', 'about', 'video' */
  key: string;
  /** Display name — e.g., "Hero section" */
  label: string;
  /** Description shown to user */
  description: string;
  /** Fields that map to the LandingSection model */
  sectionFields: SectionFieldDef[];
  /** Repeater groups that map to SectionBlock records */
  blockGroups: BlockGroupDef[];
  /**
   * Renders a live preview of the assembled heading.
   *
   * The heading is split into a plain part and an accented part, which is hard
   * to picture from two separate text inputs — especially since the accent only
   * appears when the words match the heading exactly. Showing the result removes
   * the guesswork.
   */
  headingPreview?: { titleKey: string; highlightKey: string };
}

// Import BlockType from api-types
import type { BlockType } from './api-types';

// ============================================
// Shared option sets
// ============================================

const ICON_OPTIONS = [
  { label: 'Users', value: 'Users' },
  { label: 'Calendar', value: 'Calendar' },
  { label: 'FileText', value: 'FileText' },
  { label: 'MapPin', value: 'MapPin' },
  { label: 'Heart', value: 'Heart' },
  { label: 'Star', value: 'Star' },
  { label: 'Award', value: 'Award' },
  { label: 'BookOpen', value: 'BookOpen' },
  { label: 'GraduationCap', value: 'GraduationCap' },
  { label: 'Globe', value: 'Globe' },
  { label: 'Mail', value: 'Mail' },
  { label: 'Phone', value: 'Phone' },
  { label: 'Video', value: 'Video' },
  { label: 'Image', value: 'Image' },
  { label: 'Coffee', value: 'Coffee' },
  { label: 'Lightbulb', value: 'Lightbulb' },
  { label: 'Rocket', value: 'Rocket' },
  { label: 'TrendingUp', value: 'TrendingUp' },
  { label: 'CheckCircle', value: 'CheckCircle' },
  { label: 'ArrowRight', value: 'ArrowRight' },
];

/**
 * One wording for the highlight field, everywhere.
 *
 * About said the words "must appear in the heading", membership said they were
 * "appended to the heading" — the same label with two different rules, so an
 * editor had to remember which section behaved which way. Every section now
 * highlights a run of words found inside the heading.
 */
const HIGHLIGHT_HELP = 'Must match the heading exactly.';

const CTA_VARIANT_OPTIONS = [
  { label: 'Solid (filled)', value: 'primary' },
  { label: 'Outline (transparent)', value: 'secondary' },
];

/** Reusable button group — used by hero and membership. */
const ctaButtonGroup = (help: string): BlockGroupDef => ({
  label: 'Call-to-action buttons',
  itemLabel: 'Button',
  blockType: 'CTA_BUTTON',
  help,
  fields: [
    { key: 'title', label: 'Button label', type: 'text', placeholder: 'Join now' },
    {
      key: 'linkUrl',
      label: 'Links to',
      type: 'url',
      placeholder: '/register or https://...',
      help: 'Where the visitor goes when they click',
    },
    {
      key: 'variant',
      configKey: 'variant',
      label: 'Style',
      type: 'select',
      options: CTA_VARIANT_OPTIONS,
      help: 'Solid draws the most attention. Use outline for the secondary action.',
    },
    {
      key: 'color',
      label: 'Button colour',
      type: 'color',
      help: 'Leave empty to use the site theme colour.',
    },
  ],
});

// ============================================
// Section Schemas
// ============================================

export const SECTION_SCHEMAS: Record<string, SectionSchema> = {
  // ──────────────────────────────────────────
  // HERO
  // ──────────────────────────────────────────
  hero: {
    key: 'hero',
    label: 'Hero',
    description:
      'The first thing visitors see. Holds the headline, supporting text, location badge, statistics and the main buttons.',
    headingPreview: { titleKey: 'title', highlightKey: 'titleHighlight' },
    sectionFields: [
      {
        key: 'title',
        label: 'Headline',
        type: 'textarea',
        placeholder: 'Sailing Together, Growing Together',
        help: 'The large heading. Press Enter to break the line.',
      },
      {
        key: 'titleHighlight',
        label: 'Words to highlight',
        type: 'text',
        configKey: 'titleHighlight',
        placeholder: 'Indonesia',
        help: HIGHLIGHT_HELP,
      },
      {
        key: 'subtitle',
        label: 'Supporting text',
        type: 'textarea',
        placeholder: 'The home of Indonesian students in Auckland...',
        help: 'One or two sentences below the headline.',
      },
      {
        key: 'location',
        label: 'Location badge',
        type: 'text',
        configKey: 'location',
        placeholder: 'Auckland, New Zealand',
        help: 'Small pill above the headline. Leave empty to hide it.',
      },
      {
        key: 'eyebrow',
        label: 'Organisation line',
        type: 'text',
        configKey: 'eyebrow',
        placeholder: 'Perhimpunan Pelajar Indonesia Auckland',
        help: 'Small uppercase line directly above the headline. Leave empty to hide it.',
      },
      {
        key: 'illustrationCaption',
        label: 'Illustration caption',
        type: 'text',
        configKey: 'illustrationCaption',
        placeholder: 'Tāmaki Makaurau · 36.8509° S',
        help: 'Small pill on the illustration. Leave empty to hide it.',
      },
    ],
    blockGroups: [
      {
        label: 'Statistics',
        itemLabel: 'Statistic',
        blockType: 'STATISTIC',
        help: 'Counters that animate up from zero. Three works best on desktop.',
        fields: [
          {
            key: 'content',
            label: 'Number',
            type: 'text',
            placeholder: '150',
            help: 'Digits only — the counter animates up to this value.',
          },
          { key: 'title', label: 'Label', type: 'text', placeholder: 'Active members' },
          { key: 'iconName', label: 'Icon', type: 'select', options: ICON_OPTIONS },
          {
            key: 'color',
            label: 'Icon colour',
            type: 'color',
            help: 'Leave empty to use the site accent colour.',
          },
        ],
      },
      ctaButtonGroup('The main buttons in the hero, e.g. "Join our community" and "Meet the team".'),
    ],
  },

  // ──────────────────────────────────────────
  // ABOUT
  // ──────────────────────────────────────────
  about: {
    key: 'about',
    label: 'About us',
    description: 'Explains what PPIA Auckland is, followed by a grid of highlights.',
    headingPreview: { titleKey: 'title', highlightKey: 'titleHighlight' },
    sectionFields: [
      { key: 'badge', label: 'Eyebrow text', type: 'text', configKey: 'badge', placeholder: 'About us', help: 'Small label above the heading.' },
      { key: 'title', label: 'Heading', type: 'text', placeholder: 'What is PPIA Auckland?' },
      {
        key: 'titleHighlight',
        label: 'Words to highlight',
        type: 'text',
        configKey: 'titleHighlight',
        placeholder: 'PPIA Auckland?',
        help: HIGHLIGHT_HELP,
      },
      { key: 'description', label: 'Intro paragraph', type: 'richtext' },
    ],
    blockGroups: [
      {
        label: 'Highlights',
        itemLabel: 'Highlight',
        blockType: 'FEATURE',
        help: 'The cards below the intro, e.g. "Strong community". Four fills the row evenly.',
        fields: [
          { key: 'title', label: 'Heading', type: 'text', placeholder: 'Strong community' },
          {
            key: 'subtitle',
            label: 'Description',
            type: 'textarea',
            placeholder: 'Over 500 Indonesian students supporting each other.',
          },
          { key: 'iconName', label: 'Icon', type: 'select', options: ICON_OPTIONS },
          { key: 'color', label: 'Accent colour', type: 'color', help: 'Tints the icon and the hover glow.' },
        ],
      },
    ],
  },

  // ──────────────────────────────────────────
  // VIDEO
  // ──────────────────────────────────────────
  video: {
    key: 'video',
    label: 'Video',
    description: 'A single featured video with a heading above it.',
    sectionFields: [
      { key: 'badge', label: 'Eyebrow text', type: 'text', configKey: 'badge', placeholder: 'Watch', help: 'Small label above the heading.' },
      { key: 'title', label: 'Heading', type: 'text', placeholder: 'Watch our story' },
      {
        key: 'featuredLabel',
        label: 'Caption label',
        type: 'text',
        configKey: 'featuredLabel',
        placeholder: 'Featured Video',
        help: 'Small line in the caption strip under the player.',
      },
    ],
    blockGroups: [
      {
        label: 'Video',
        itemLabel: 'Video',
        blockType: 'VIDEO',
        help: 'Only the first video is shown.',
        fields: [
          { key: 'title', label: 'Video title', type: 'text', placeholder: 'PPIA Auckland introduction' },
          {
            key: 'linkUrl',
            label: 'Video URL',
            type: 'url',
            placeholder: 'https://www.youtube.com/watch?v=...',
            help: 'YouTube links are embedded automatically.',
          },
          { key: 'imageUrl', label: 'Thumbnail', type: 'image', help: 'Optional. Shown before the video plays.' },
        ],
      },
    ],
  },

  // ──────────────────────────────────────────
  // EVENTS
  // ──────────────────────────────────────────
  events: {
    key: 'events',
    label: 'Events',
    description:
      'Shows upcoming events. The events themselves come from the Events database — this section only controls the heading and the link.',
    headingPreview: { titleKey: 'title', highlightKey: 'titleHighlight' },
    sectionFields: [
      { key: 'badge', label: 'Eyebrow text', type: 'text', configKey: 'badge', placeholder: 'Events', help: 'Small label above the heading.' },
      { key: 'title', label: 'Heading', type: 'text', placeholder: 'Upcoming events' },
      {
        key: 'titleHighlight',
        label: 'Words to highlight',
        type: 'text',
        configKey: 'titleHighlight',
        placeholder: 'Events',
        help: HIGHLIGHT_HELP,
      },
      {
        key: 'viewAll',
        label: 'Link label',
        type: 'text',
        configKey: 'viewAll',
        placeholder: 'View all events',
        group: 'View-all link',
      },
      {
        key: 'viewAllHref',
        label: 'Link target',
        type: 'text',
        configKey: 'viewAllHref',
        placeholder: '/activities/events',
        group: 'View-all link',
      },
    ],
    blockGroups: [],
  },

  // ──────────────────────────────────────────
  // ARTICLES
  // ──────────────────────────────────────────
  articles: {
    key: 'articles',
    label: 'Articles',
    description:
      'Shows the latest articles. The articles come from the Articles database — this section only controls the heading and the link.',
    headingPreview: { titleKey: 'title', highlightKey: 'titleHighlight' },
    sectionFields: [
      { key: 'badge', label: 'Eyebrow text', type: 'text', configKey: 'badge', placeholder: 'Articles', help: 'Small label above the heading.' },
      { key: 'title', label: 'Heading', type: 'text', placeholder: 'Read & Grow' },
      {
        key: 'titleHighlight',
        label: 'Words to highlight',
        type: 'text',
        configKey: 'titleHighlight',
        placeholder: 'Grow',
        help: HIGHLIGHT_HELP,
      },
      {
        key: 'viewAll',
        label: 'Link label',
        type: 'text',
        configKey: 'viewAll',
        placeholder: 'All articles',
        group: 'View-all link',
      },
      {
        key: 'viewAllHref',
        label: 'Link target',
        type: 'text',
        configKey: 'viewAllHref',
        placeholder: '/activities/news-articles',
        group: 'View-all link',
      },
    ],
    blockGroups: [],
  },

  // ──────────────────────────────────────────
  // PARTNERS
  // ──────────────────────────────────────────
  partners: {
    key: 'partners',
    label: 'Partners',
    description: 'A continuously scrolling strip of partner and university logos, used as social proof.',
    sectionFields: [
      {
        key: 'title',
        label: 'Strip label',
        type: 'text',
        placeholder: 'Trusted by organisations across New Zealand',
        help: 'Small uppercase line above the logos.',
      },
    ],
    blockGroups: [
      {
        label: 'Logos',
        itemLabel: 'Partner',
        blockType: 'SPONSOR',
        help: 'Use transparent PNG or SVG logos. They are shown in greyscale until hovered, so plain marks read best.',
        fields: [
          {
            key: 'title',
            label: 'Organisation name',
            type: 'text',
            placeholder: 'University of Auckland',
            help: 'Used as the image alt text, so screen readers announce it.',
          },
          { key: 'imageUrl', label: 'Logo', type: 'image' },
          {
            key: 'linkUrl',
            label: 'Website',
            type: 'url',
            placeholder: 'https://www.auckland.ac.nz',
            help: 'Optional. Makes the logo clickable.',
          },
        ],
      },
    ],
  },

  // ──────────────────────────────────────────
  // TESTIMONIALS
  // ──────────────────────────────────────────
  testimonials: {
    key: 'testimonials',
    label: 'Testimonials',
    description: 'Short quotes from real members. Three fills the row evenly on desktop.',
    headingPreview: { titleKey: 'subtitle', highlightKey: 'titleHighlight' },
    sectionFields: [
      { key: 'title', label: 'Eyebrow text', type: 'text', placeholder: 'What members say' },
      {
        key: 'subtitle',
        label: 'Heading',
        type: 'text',
        placeholder: 'Real stories from our community',
      },
      {
        key: 'titleHighlight',
        label: 'Words to highlight',
        type: 'text',
        configKey: 'titleHighlight',
        placeholder: 'our community',
        help: HIGHLIGHT_HELP,
      },
    ],
    blockGroups: [
      {
        label: 'Quotes',
        itemLabel: 'Testimonial',
        blockType: 'QUOTE',
        help: 'Keep quotes to two or three sentences so the cards stay the same height.',
        fields: [
          { key: 'content', label: 'Quote', type: 'textarea', placeholder: 'Joining PPIA gave me a community from day one...' },
          { key: 'title', label: 'Name', type: 'text', placeholder: 'Anisa R.' },
          {
            key: 'subtitle',
            label: 'Role or course',
            type: 'text',
            placeholder: "Master's student, University of Auckland",
          },
          { key: 'imageUrl', label: 'Photo', type: 'image', help: 'Optional. Falls back to initials.' },
        ],
      },
    ],
  },

  // ──────────────────────────────────────────
  // FAQ
  // ──────────────────────────────────────────
  faq: {
    key: 'faq',
    label: 'FAQ',
    description: 'A short list of expandable questions, placed just before the membership call to action.',
    sectionFields: [
      { key: 'badge', label: 'Eyebrow text', type: 'text', configKey: 'badge', placeholder: 'FAQ', help: 'Small label above the heading.' },
      { key: 'title', label: 'Heading', type: 'text', placeholder: 'Got questions?' },
      {
        key: 'subtitle',
        label: 'Supporting text',
        type: 'textarea',
        placeholder: 'Here are the answers to the things people ask most before joining.',
      },
    ],
    blockGroups: [
      {
        label: 'Questions',
        itemLabel: 'Question',
        blockType: 'FAQ',
        help: 'Answer the objections that stop people from registering. Four is usually enough here — put the rest on the FAQ page.',
        fields: [
          { key: 'title', label: 'Question', type: 'text', placeholder: 'Is PPIA membership free?' },
          {
            key: 'content',
            label: 'Answer',
            type: 'textarea',
            placeholder: 'Yes — membership is completely free for all Indonesian students in Auckland.',
          },
        ],
      },
    ],
  },

  // ──────────────────────────────────────────
  // MEMBERSHIP
  // ──────────────────────────────────────────
  membership: {
    key: 'membership',
    label: 'Membership',
    description: 'The closing call to action inviting visitors to join.',
    headingPreview: { titleKey: 'title', highlightKey: 'titleHighlight' },
    sectionFields: [
      { key: 'badge', label: 'Eyebrow text', type: 'text', configKey: 'badge', placeholder: 'Membership', help: 'Small label above the heading.' },
      {
        key: 'title',
        label: 'Heading',
        type: 'text',
        placeholder: 'Become part of the PPIA Family',
      },
      {
        key: 'titleHighlight',
        label: 'Words to highlight',
        type: 'text',
        configKey: 'titleHighlight',
        placeholder: 'PPIA Family',
        help: HIGHLIGHT_HELP,
      },
      { key: 'description', label: 'Description', type: 'richtext' },
      {
        key: 'cardTitle',
        label: 'Name on the card',
        type: 'text',
        configKey: 'cardTitle',
        placeholder: 'PPIA Auckland',
        group: 'Membership card',
      },
      {
        key: 'cardBadge',
        label: 'Badge',
        type: 'text',
        configKey: 'cardBadge',
        placeholder: 'FREE',
        group: 'Membership card',
      },
      {
        key: 'cardBadgeSubtitle',
        label: 'Badge caption',
        type: 'text',
        configKey: 'cardBadgeSubtitle',
        placeholder: 'for active students',
        group: 'Membership card',
      },
    ],
    blockGroups: [
      ctaButtonGroup('The join buttons. The first is shown solid, the rest as quiet text links.'),
      {
        label: 'Member benefits',
        itemLabel: 'Benefit',
        blockType: 'FEATURE',
        help: 'The ticked list next to the membership card.',
        fields: [
          { key: 'title', label: 'Benefit', type: 'text', placeholder: 'Access to all exclusive PPIA events' },
          {
            key: 'subtitle',
            label: 'Detail',
            type: 'text',
            help: 'Optional. Shown instead of the benefit line when filled.',
          },
        ],
      },
    ],
  },
};

// ============================================
// Helpers
// ============================================

export const KNOWN_SECTION_KEYS = Object.keys(SECTION_SCHEMAS);

/**
 * Get the schema for a section key, or null if no schema exists.
 * Sections without schemas fall back to the generic block editor.
 */
export function getSectionSchema(key: string): SectionSchema | null {
  return SECTION_SCHEMAS[key] || null;
}
