/**
 * Content Schema Registry — Single Source of Truth for page content structure.
 *
 * Defines the editable fields for each page template so the CMS can render
 * a visual form editor (instead of raw JSON) for non-technical users.
 *
 * CONTRACT RULE
 * -------------
 * Every key declared here MUST match a key that the corresponding public page
 * actually reads from `page.content`. If a public page renders it, it belongs
 * here; if a public page ignores it, it must NOT be here — otherwise editors
 * change fields that never show up on the site.
 *
 * Each schema describes:
 *   - field key (matches the key in the page.content JSON object)
 *   - label (human-friendly English, shown in the form)
 *   - type (text, textarea, richtext, image, url, number, color, array,
 *           stringList, group, toggle, select)
 *   - optional help text
 *   - for arrays: the schema of each item
 *   - for stringList: a plain list of strings (NOT objects)
 *
 * The form editor auto-generates inputs from these schemas.
 *
 * To add a new page:
 *   1. Add a template key to `CONTENT_SCHEMAS`
 *   2. Map the page slug to its template in `TEMPLATE_FOR_SLUG`
 *   3. Ensure the public page reads the same keys from `page.content`
 */

export type FieldType =
  | 'text'
  | 'textarea'
  | 'richtext'
  | 'image'
  | 'url'
  | 'number'
  | 'color'
  | 'array'
  /** Array of plain strings — e.g. ["Masters", "PhD"]. Never objects. */
  | 'stringList'
  | 'group'
  | 'toggle'
  | 'select';

export interface FieldSchema {
  key: string;
  label: string;
  type: FieldType;
  /** For text/textarea: optional placeholder */
  placeholder?: string;
  /** For textarea: number of rows */
  rows?: number;
  /** For array type: the schema of each array item */
  itemSchema?: FieldSchema[];
  /** For group type: nested fields */
  fields?: FieldSchema[];
  /** For select type: available options */
  options?: { value: string; label: string }[];
  /** Optional help text shown under the input */
  help?: string;
}

// ============================================
// Reusable field groups
// ============================================

const HEADER_FIELDS: FieldSchema[] = [
  {
    key: 'label',
    label: 'Eyebrow above the heading',
    type: 'text',
    placeholder: 'About PPIA',
    help: 'Small line shown above the page title.',
  },
  {
    key: 'title',
    label: 'Title',
    type: 'text',
    placeholder: 'Our',
    help: 'The dark part of the heading.',
  },
  {
    key: 'titleAccent',
    label: 'Highlighted word',
    type: 'text',
    placeholder: 'Cabinet',
    help: 'Joined after the Title. Example: Title "Our" + this "Cabinet" → Our Cabinet.',
  },
  {
    key: 'description',
    label: 'Description',
    type: 'textarea',
    rows: 3,
    placeholder: 'A short line under the heading.',
  },
  {
    key: 'breadcrumbs',
    label: 'Breadcrumb trail',
    type: 'array',
    help: 'Navigation trail above the heading (e.g. About › Cabinet).',
    itemSchema: [
      { key: 'label', label: 'Text', type: 'text', placeholder: 'About' },
    ],
  },
];

const CTA_FIELDS: FieldSchema[] = [
  { key: 'title', label: 'Title', type: 'text', placeholder: 'Want to Join the Team?' },
  { key: 'description', label: 'Description', type: 'textarea', rows: 3 },
  { key: 'buttonText', label: 'Button label', type: 'text', placeholder: 'Get Involved' },
  { key: 'buttonHref', label: 'Button link', type: 'url', placeholder: '/contact' },
];

/** Section heading used inside a page body (label + title + accent + description). */
const SECTION_HEADING_FIELDS: FieldSchema[] = [
  { key: 'label', label: 'Eyebrow above the heading', type: 'text', placeholder: 'Why Partner' },
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'titleAccent', label: 'Highlighted word', type: 'text' },
  { key: 'description', label: 'Description', type: 'textarea', rows: 3 },
];

/**
 * One person in a division. `photo` is optional throughout — the page falls
 * back to initials on the division colour, so a half-filled cabinet still looks
 * deliberate rather than broken.
 */
const MEMBER_ITEM_SCHEMA: FieldSchema[] = [
  { key: 'name', label: 'Full name', type: 'text', placeholder: 'Full name' },
  {
    key: 'role',
    label: 'Role',
    type: 'text',
    placeholder: 'Coordinator',
    help: 'Optional. Leave empty for a general member.',
  },
  {
    key: 'photo',
    label: 'Photo',
    type: 'image',
    help: 'A head-and-shoulders portrait works best — it is cropped to a square. Falls back to initials when empty.',
  },
];

/** Division card — used by the Cabinet page. */
const DIVISION_ITEM_SCHEMA: FieldSchema[] = [
  {
    key: 'id',
    label: 'Unique code',
    type: 'text',
    placeholder: 'education',
    help: 'Lowercase, no spaces. Used internally and never shown on the page.',
  },
  { key: 'name', label: 'Division name', type: 'text', placeholder: 'Education' },
  {
    key: 'group',
    label: 'Sits under',
    type: 'text',
    placeholder: 'internal',
    help: 'The code of the group this division belongs to, from "Division groups" above. Leave empty to show it on its own.',
  },
  { key: 'color', label: 'Colour', type: 'color', help: 'Tints the division heading and any initials avatars inside it.' },
  {
    key: 'desc',
    label: 'What this division does',
    type: 'textarea',
    rows: 2,
    placeholder: 'Runs academic programmes and study support.',
  },
  {
    key: 'head',
    label: 'Division head',
    type: 'group',
    fields: MEMBER_ITEM_SCHEMA,
  },
  {
    key: 'deputy',
    label: 'Vice division head',
    type: 'group',
    fields: MEMBER_ITEM_SCHEMA,
  },
  {
    key: 'members',
    label: 'Other members',
    type: 'array',
    help: 'Staff in this division besides the head and vice head, in the order they should appear.',
    itemSchema: MEMBER_ITEM_SCHEMA,
  },
];

/**
 * Leadership slot — president, vice president, and any other role the
 * organisation wants shown above the divisions.
 *
 * This is an array rather than fixed `president` / `vicePresident` fields so a
 * third or fourth office can be added from the CMS without a code change.
 */
const LEADER_ITEM_SCHEMA: FieldSchema[] = [
  { key: 'name', label: 'Full name', type: 'text', placeholder: 'Full name' },
  { key: 'role', label: 'Office', type: 'text', placeholder: 'President' },
  {
    key: 'tier',
    label: 'Level',
    type: 'select',
    help: 'The chair is shown on its own above the rest of the executive.',
    options: [
      { value: 'chair', label: 'Chair — shown large, on its own' },
      { value: 'executive', label: 'Executive — shown in the row below' },
    ],
  },
  {
    key: 'photo',
    label: 'Photo',
    type: 'image',
    help: 'Shown large, so use the highest quality portrait available. Falls back to initials when empty.',
  },
  {
    key: 'major',
    label: 'Course or university',
    type: 'text',
    placeholder: 'Master of Engineering, University of Auckland',
    help: 'Optional line under the name.',
  },
  {
    key: 'quote',
    label: 'Short message',
    type: 'textarea',
    rows: 3,
    placeholder: 'One or two sentences in their own words.',
    help: 'Optional. Shown beside the photo.',
  },
  {
    key: 'email',
    label: 'Contact email',
    type: 'text',
    placeholder: 'president@ppiaklan.org',
    help: 'Optional. Adds a contact link to the card.',
  },
];

/** Lucide icon names used by pages that map string → component. */
const LUCIDE_ICON_OPTIONS = [
  { value: 'Users', label: 'Users' },
  { value: 'Calendar', label: 'Calendar' },
  { value: 'FileText', label: 'File Text' },
  { value: 'BookOpen', label: 'Book Open' },
  { value: 'Archive', label: 'Archive' },
  { value: 'Download', label: 'Download' },
  { value: 'Lightbulb', label: 'Lightbulb' },
  { value: 'Target', label: 'Target' },
  { value: 'Heart', label: 'Heart' },
  { value: 'Star', label: 'Star' },
  { value: 'Globe', label: 'Globe' },
  { value: 'DollarSign', label: 'Dollar Sign' },
  { value: 'Megaphone', label: 'Megaphone' },
  { value: 'GraduationCap', label: 'Graduation Cap' },
  { value: 'FlaskConical', label: 'Flask' },
  { value: 'TrendingUp', label: 'Trending Up' },
  { value: 'Plane', label: 'Plane' },
  { value: 'MapPin', label: 'Map Pin' },
  { value: 'Car', label: 'Car' },
  { value: 'ShoppingBag', label: 'Shopping Bag' },
  { value: 'Sun', label: 'Sun' },
  { value: 'Home', label: 'Home' },
  { value: 'Landmark', label: 'Bank' },
  { value: 'HeartPulse', label: 'Health' },
];

// ============================================
// Template Schemas
// ============================================

export const CONTENT_SCHEMAS: Record<string, FieldSchema[]> = {
  // ── Cabinet — /about/cabinet ──────────────────────────────────
  division_grid: [
    { key: 'header', label: 'Page header', type: 'group', fields: HEADER_FIELDS },
    {
      key: 'stats',
      label: 'Summary numbers',
      type: 'array',
      help: 'Numbers shown under the header. The first card (member count) is calculated automatically.',
      itemSchema: [
        { key: 'valueStatic', label: 'Number', type: 'text', placeholder: '9' },
        { key: 'valueLabel', label: 'Caption', type: 'text', placeholder: 'Departments' },
      ],
    },
    {
      key: 'leadershipSection',
      label: 'Leadership heading',
      type: 'group',
      fields: SECTION_HEADING_FIELDS,
    },
    {
      key: 'leaders',
      label: 'Leadership',
      type: 'array',
      help: 'President, vice president, and any other office. Shown as large portrait cards above the divisions.',
      itemSchema: LEADER_ITEM_SCHEMA,
    },
    {
      key: 'divisionsSection',
      label: 'Divisions heading',
      type: 'group',
      fields: SECTION_HEADING_FIELDS,
    },
    {
      key: 'divisionGroups',
      label: 'Division groups',
      type: 'array',
      help: 'Optional. Groups the divisions under a heading — for example the divisions each vice president oversees. Divisions point at a group using its code.',
      itemSchema: [
        {
          key: 'key',
          label: 'Code',
          type: 'text',
          placeholder: 'internal',
          help: 'Lowercase, no spaces. Divisions reference this in their "Sits under" field.',
        },
        { key: 'label', label: 'Heading', type: 'text', placeholder: 'Under the VP Internal' },
        { key: 'description', label: 'Short caption', type: 'textarea', rows: 2 },
      ],
    },
    {
      key: 'divisions',
      label: 'Divisions',
      type: 'array',
      help: 'Each division shows its head and vice head, then a grid of the other members.',
      itemSchema: DIVISION_ITEM_SCHEMA,
    },
    { key: 'cta', label: 'Call to action at the bottom', type: 'group', fields: CTA_FIELDS },
  ],

  // ── Historical Archive — /about/historical-archive ────────────
  timeline: [
    { key: 'header', label: 'Page header', type: 'group', fields: HEADER_FIELDS },
    {
      key: 'timelineSection',
      label: 'Timeline section heading',
      type: 'group',
      fields: SECTION_HEADING_FIELDS,
    },
    {
      key: 'documents',
      label: 'Documents',
      type: 'array',
      help: 'Downloadable or linkable documents, shown above the timeline.',
      itemSchema: [
        { key: 'icon', label: 'Icon', type: 'select', options: LUCIDE_ICON_OPTIONS },
        { key: 'label', label: 'Label', type: 'text', placeholder: 'Grand Design' },
        { key: 'title', label: 'Document title', type: 'text' },
        { key: 'sub', label: 'Short caption', type: 'text' },
        { key: 'color', label: 'Colour', type: 'color' },
        { key: 'href', label: 'Link or file', type: 'url', placeholder: 'https://... or /uploads/file.pdf' },
        {
          key: 'target',
          label: 'Open in a new tab',
          type: 'select',
          options: [
            { value: '', label: 'Open in the same tab' },
            { value: '_blank', label: 'Open in a new tab' },
          ],
        },
      ],
    },
    {
      key: 'milestones',
      label: 'Milestones',
      type: 'array',
      help: 'Timeline entries, ordered by year.',
      itemSchema: [
        { key: 'year', label: 'Year', type: 'text', placeholder: '2024' },
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'desc', label: 'Description', type: 'textarea', rows: 2 },
        { key: 'color', label: 'Colour', type: 'color' },
      ],
    },
    { key: 'cta', label: 'Call to action at the bottom', type: 'group', fields: CTA_FIELDS },
  ],

  // ── Ambition & Action — /about/ambition-action ────────────────
  ambition_action: [
    { key: 'header', label: 'Page header', type: 'group', fields: HEADER_FIELDS },
    { key: 'sectionLabel', label: 'Eyebrow above the section heading', type: 'text', placeholder: 'Our Philosophy' },
    { key: 'sectionTitle', label: 'Section heading', type: 'text', placeholder: 'Trías' },
    { key: 'sectionTitleAccent', label: 'Highlighted word', type: 'text', placeholder: 'Harmonía' },
    {
      key: 'sectionIntro',
      label: 'Section intro',
      type: 'textarea',
      rows: 4,
      placeholder: 'PPIA Auckland rests on three pillars...',
    },
    {
      key: 'pillars',
      label: 'Three pillars',
      type: 'array',
      help: 'The Trías Harmonía pillars. Three items work best.',
      itemSchema: [
        { key: 'icon', label: 'Icon', type: 'select', options: LUCIDE_ICON_OPTIONS },
        { key: 'title', label: 'Pillar name', type: 'text', placeholder: 'Education' },
        { key: 'color', label: 'Colour', type: 'color' },
        { key: 'desc', label: 'Description', type: 'textarea', rows: 3 },
      ],
    },
    { key: 'ambitionLabel', label: 'Eyebrow above the quote', type: 'text', placeholder: 'Our Ambition' },
    {
      key: 'ambitionQuote',
      label: 'Ambition quote',
      type: 'textarea',
      rows: 3,
      placeholder: 'Creating an open and supportive environment...',
    },
    {
      key: 'ambitionQuoteAccent',
      label: 'Highlighted part of the quote',
      type: 'text',
      placeholder: 'positive impact on society.',
      help: 'Must be an exact substring of the ambition quote.',
    },
    { key: 'ctaTitle', label: 'Call-to-action heading', type: 'text', placeholder: "Don't Be Alone in Auckland!" },
    { key: 'ctaDescription', label: 'Call-to-action description', type: 'textarea', rows: 2 },
    { key: 'ctaButtonText', label: 'Call-to-action button label', type: 'text', placeholder: 'Join PPIA' },
    { key: 'ctaButtonUrl', label: 'Call-to-action button link', type: 'url', placeholder: '/register' },
  ],

  // ── AD & ART — /about/ad-art ──────────────────────────────────
  //
  // Two bound documents, not one: Anggaran Dasar (adArticles) is the
  // constitution, Anggaran Rumah Tangga (artArticles) is the bylaws that
  // implement it. The public page (ad-art-content.tsx) already renders both as
  // separate filed-sheet sections, and artArticles has carried real content
  // since the AD/ART re-seed — but this schema only exposed adArticles, so an
  // admin opening Canvas had no field to edit the bylaws chapters at all.
  legal_document: [
    { key: 'header', label: 'Page header', type: 'group', fields: HEADER_FIELDS },
    {
      key: 'preamble',
      label: 'Pembukaan (preamble)',
      type: 'textarea',
      rows: 6,
      help: 'Read before the Anggaran Dasar. Leave empty to hide this section.',
    },
    {
      key: 'adArticles',
      label: 'AD — Anggaran Dasar (chapters & articles)',
      type: 'array',
      help: 'The constitution, grouped by chapter.',
      itemSchema: [
        { key: 'id', label: 'Unique code', type: 'text', placeholder: 'bab-1', help: 'Lowercase, no spaces.' },
        { key: 'chapter', label: 'Chapter label', type: 'text', placeholder: 'BAB I' },
        { key: 'title', label: 'Chapter title', type: 'text', placeholder: 'Name and registered location' },
        {
          key: 'articles',
          label: 'Articles in this chapter',
          type: 'array',
          itemSchema: [
            { key: 'num', label: 'Number', type: 'text', placeholder: 'Pasal 1' },
            { key: 'title', label: 'Article title', type: 'text' },
            { key: 'content', label: 'Article text', type: 'richtext' },
          ],
        },
      ],
    },
    {
      key: 'artArticles',
      label: 'ART — Anggaran Rumah Tangga (chapters & articles)',
      type: 'array',
      help: 'The bylaws, grouped by chapter. Shown as a second bound document below the AD. Leave empty to hide this section.',
      itemSchema: [
        { key: 'id', label: 'Unique code', type: 'text', placeholder: 'art-bab-1', help: 'Lowercase, no spaces.' },
        { key: 'chapter', label: 'Chapter label', type: 'text', placeholder: 'BAB I' },
        { key: 'title', label: 'Chapter title', type: 'text', placeholder: 'Ketua Umum' },
        {
          key: 'articles',
          label: 'Articles in this chapter',
          type: 'array',
          itemSchema: [
            { key: 'num', label: 'Number', type: 'text', placeholder: 'Pasal 1' },
            { key: 'title', label: 'Article title', type: 'text' },
            { key: 'content', label: 'Article text', type: 'richtext' },
          ],
        },
      ],
    },
  ],

  // ── Legal: Privacy Policy / Terms of Service ──────────────────
  legal_simple: [
    { key: 'header', label: 'Page header', type: 'group', fields: HEADER_FIELDS },
    {
      key: 'sections',
      label: 'Document sections',
      type: 'array',
      help: 'Numbered sections of the legal document.',
      itemSchema: [
        { key: 'id', label: 'Number', type: 'number', placeholder: '1' },
        { key: 'title', label: 'Title', type: 'text', placeholder: 'Membership' },
        { key: 'body', label: 'Body', type: 'richtext', rows: 4 },
      ],
    },
  ],

  // ── Career Info — /opportunities/career-info ──────────────────
  career_info: [
    { key: 'header', label: 'Page header', type: 'group', fields: HEADER_FIELDS },
    {
      key: 'stats',
      label: 'Summary numbers',
      type: 'array',
      help: 'Four numbers on the dark panel under the header.',
      itemSchema: [
        { key: 'value', label: 'Value', type: 'text', placeholder: '20h' },
        { key: 'label', label: 'Caption', type: 'text', placeholder: 'Max work hours/week' },
      ],
    },
    {
      key: 'platforms',
      label: 'Job platforms',
      type: 'array',
      help: 'Job boards, shown on the "Jobs" tab.',
      itemSchema: [
        { key: 'name', label: 'Name', type: 'text', placeholder: 'Seek NZ' },
        { key: 'url', label: 'Website address', type: 'text', placeholder: 'seek.co.nz' },
        { key: 'desc', label: 'Description', type: 'textarea', rows: 2 },
        { key: 'color', label: 'Colour', type: 'color' },
      ],
    },
    {
      key: 'cvTips',
      label: 'CV & interview tips',
      type: 'array',
      help: 'Shown on the "CV & Interview" tab.',
      itemSchema: [
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'desc', label: 'Description', type: 'textarea', rows: 3 },
        { key: 'color', label: 'Colour', type: 'color' },
        { key: 'highlight', label: 'Mark as important', type: 'toggle' },
      ],
    },
    {
      key: 'workCultureTips',
      label: 'NZ work culture tips',
      type: 'array',
      help: 'Shown on the "NZ Work Culture" tab.',
      itemSchema: [
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'desc', label: 'Description', type: 'textarea', rows: 3 },
        { key: 'color', label: 'Colour', type: 'color' },
      ],
    },
  ],

  // ── Partnership — /opportunities/partnership ───────────────────
  benefit_grid: [
    { key: 'header', label: 'Page header', type: 'group', fields: HEADER_FIELDS },
    { key: 'benefitsSection', label: 'Benefits section heading', type: 'group', fields: SECTION_HEADING_FIELDS },
    {
      key: 'benefits',
      label: 'Partnership benefits',
      type: 'array',
      itemSchema: [
        { key: 'icon', label: 'Icon', type: 'select', options: LUCIDE_ICON_OPTIONS },
        { key: 'color', label: 'Colour', type: 'color' },
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'desc', label: 'Description', type: 'textarea', rows: 3 },
      ],
    },
    { key: 'tiersSection', label: 'Tiers section heading', type: 'group', fields: SECTION_HEADING_FIELDS },
    {
      key: 'tiers',
      label: 'Partnership tiers',
      type: 'array',
      itemSchema: [
        { key: 'name', label: 'Tier name', type: 'text' },
        { key: 'color', label: 'Colour', type: 'color' },
        { key: 'price', label: 'Price', type: 'text', placeholder: 'Free / Negotiable / Annual' },
        { key: 'ideal', label: 'Ideal for', type: 'text' },
        { key: 'perks', label: 'What is included', type: 'stringList', help: 'One item per line.' },
        { key: 'featured', label: 'Mark as the featured tier', type: 'toggle' },
      ],
    },
    {
      key: 'currentPartners',
      label: 'Current partners',
      type: 'array',
      itemSchema: [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'type', label: 'Type', type: 'text', placeholder: 'Community / Government' },
      ],
    },
    {
      key: 'cta',
      label: 'Partnership form',
      type: 'group',
      fields: [
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'description', label: 'Description', type: 'textarea', rows: 2 },
        { key: 'submitButton', label: 'Submit button label', type: 'text', placeholder: 'Send Partnership Enquiry' },
        {
          key: 'form',
          label: 'Form field labels',
          type: 'group',
          fields: [
            { key: 'nameLabel', label: 'Name label', type: 'text', placeholder: 'Name' },
            { key: 'orgLabel', label: 'Organisation label', type: 'text', placeholder: 'Organisation' },
            { key: 'emailLabel', label: 'Email label', type: 'text', placeholder: 'Email' },
            { key: 'typeLabel', label: 'Partnership type label', type: 'text', placeholder: 'Partnership Type' },
            { key: 'messageLabel', label: 'Message label', type: 'text', placeholder: 'Message' },
          ],
        },
      ],
    },
  ],

  // ── Scholarship — /opportunities/scholarship ───────────────────
  scholarship: [
    { key: 'header', label: 'Page header', type: 'group', fields: HEADER_FIELDS },
    {
      key: 'stats',
      label: 'Summary numbers',
      type: 'array',
      help: 'Four numbers on the dark panel under the header.',
      itemSchema: [
        { key: 'value', label: 'Value', type: 'text', placeholder: '6+' },
        { key: 'label', label: 'Caption', type: 'text', placeholder: 'Listed scholarships' },
      ],
    },
    {
      key: 'scholarships',
      label: 'Scholarships',
      type: 'array',
      itemSchema: [
        { key: 'id', label: 'Number', type: 'number', placeholder: '1' },
        { key: 'name', label: 'Scholarship name', type: 'text', placeholder: 'LPDP Scholarship' },
        { key: 'provider', label: 'Provider', type: 'text', placeholder: 'Lembaga Pengelola Dana Pendidikan' },
        {
          key: 'type',
          label: 'Category',
          type: 'select',
          help: 'Drives the filter on the public page.',
          options: [
            { value: 'Indonesian Gov', label: 'Indonesian government' },
            { value: 'NZ Gov', label: 'New Zealand government' },
            { value: 'University', label: 'University' },
          ],
        },
        { key: 'color', label: 'Colour', type: 'color' },
        { key: 'level', label: 'Study levels', type: 'stringList', help: 'e.g. Masters, PhD. One per line.' },
        { key: 'coverage', label: 'What it covers', type: 'stringList', help: 'e.g. Full tuition. One per line.' },
        { key: 'amount', label: 'Amount', type: 'text', placeholder: 'Full funding' },
        { key: 'deadline', label: 'Deadline', type: 'text', placeholder: 'Multiple rounds annually' },
        { key: 'url', label: 'Official link', type: 'url', placeholder: 'https://...' },
        { key: 'desc', label: 'Description', type: 'textarea', rows: 3 },
        { key: 'featured', label: 'Mark as featured', type: 'toggle' },
      ],
    },
    {
      key: 'applicationTips',
      label: 'Application tips',
      type: 'array',
      itemSchema: [
        { key: 'icon', label: 'Icon', type: 'select', options: LUCIDE_ICON_OPTIONS },
        { key: 'color', label: 'Colour', type: 'color' },
        { key: 'title', label: 'Title', type: 'text', placeholder: 'Start early' },
        { key: 'desc', label: 'Description', type: 'textarea', rows: 3 },
      ],
    },
  ],

  // ── Wiki PPIA — /opportunities/wiki-ppia ───────────────────────
  wiki_ppia: [
    { key: 'header', label: 'Page header', type: 'group', fields: HEADER_FIELDS },
    {
      key: 'sections',
      label: 'Wiki sections',
      type: 'array',
      help: 'Each section holds a list of questions and answers.',
      itemSchema: [
        { key: 'id', label: 'Unique code', type: 'text', placeholder: 'pre-departure', help: 'Lowercase, no spaces. Used for direct links.' },
        { key: 'label', label: 'Eyebrow above the heading', type: 'text', placeholder: 'Overview' },
        { key: 'title', label: 'Section heading', type: 'text', placeholder: 'About PPI Auckland' },
        // Both of these were already stored in the content but neither the page
        // nor this form used them, so editors had no way to change them.
        { key: 'icon', label: 'Icon', type: 'select', options: LUCIDE_ICON_OPTIONS, help: 'Shown in the section heading and in the sidebar.' },
        { key: 'color', label: 'Colour', type: 'color', help: 'Tints the section icon and its rule.' },
        {
          key: 'items',
          label: 'Questions & answers',
          type: 'array',
          itemSchema: [
            { key: 'q', label: 'Question', type: 'text', placeholder: 'What is PPI Auckland?' },
            { key: 'a', label: 'Answer', type: 'richtext', rows: 4 },
          ],
        },
      ],
    },
    {
      key: 'meta',
      label: 'Footer note',
      type: 'group',
      fields: [
        { key: 'reviewedLabel', label: 'Caption', type: 'text', placeholder: 'Last reviewed' },
        { key: 'reviewedValue', label: 'When', type: 'text', placeholder: 'Q3 2026' },
        {
          key: 'reviewedNote',
          label: 'Sources note',
          type: 'textarea',
          rows: 2,
          placeholder: 'Checked against Immigration NZ, MPI, and AT.',
        },
        {
          key: 'contactEmail',
          label: 'Corrections email',
          type: 'text',
          placeholder: 'ppiauckland@gmail.com',
          help: 'Where "found something outdated?" sends people.',
        },
        { key: 'contactText', label: 'Corrections link text', type: 'text', placeholder: 'Found something outdated? Tell us.' },
        { key: 'credit', label: 'Credit line', type: 'text', placeholder: 'Built by PPIA Auckland volunteers.' },
      ],
    },
  ],

  // ── Contact — /contact ────────────────────────────────────────
  contact: [
    { key: 'header', label: 'Page header', type: 'group', fields: HEADER_FIELDS },
    {
      key: 'channels',
      label: 'Contact channels',
      type: 'array',
      help: 'Contact cards: email, Instagram, location, opening hours.',
      itemSchema: [
        {
          key: 'iconName',
          label: 'Icon',
          type: 'select',
          options: [
            { value: 'mail', label: 'Email' },
            { value: 'instagram', label: 'Instagram' },
            { value: 'whatsapp', label: 'WhatsApp' },
            { value: 'messageCircle', label: 'Message' },
            { value: 'mapPin', label: 'Location' },
            { value: 'clock', label: 'Hours' },
            { value: 'users', label: 'Users' },
            { value: 'helpCircle', label: 'Help' },
            { value: 'briefcase', label: 'Business' },
            { value: 'send', label: 'Send' },
          ],
        },
        { key: 'color', label: 'Colour', type: 'color' },
        { key: 'label', label: 'Label', type: 'text', placeholder: 'Email Us' },
        { key: 'value', label: 'Body', type: 'text', placeholder: 'ppiauckland@gmail.com' },
        { key: 'sub', label: 'Short caption', type: 'text', placeholder: 'We reply within 1–2 business days' },
        { key: 'href', label: 'Link', type: 'url', placeholder: 'mailto:ppiauckland@gmail.com' },
      ],
    },
    {
      key: 'topics',
      label: 'Form topic options',
      type: 'array',
      help: 'Topics a visitor can pick on the contact form.',
      itemSchema: [
        {
          key: 'iconName',
          label: 'Icon',
          type: 'select',
          options: [
            { value: 'users', label: 'Users' },
            { value: 'helpCircle', label: 'Help' },
            { value: 'messageCircle', label: 'Message' },
            { value: 'mail', label: 'Email' },
            { value: 'clock', label: 'Hours' },
            { value: 'briefcase', label: 'Business' },
            { value: 'send', label: 'Send' },
          ],
        },
        { key: 'label', label: 'Topic name', type: 'text', placeholder: 'Membership & Registration' },
      ],
    },
    {
      key: 'faqs',
      label: 'Frequently asked questions',
      type: 'array',
      itemSchema: [
        { key: 'q', label: 'Question', type: 'text', placeholder: 'How do I become a member?' },
        { key: 'a', label: 'Answer', type: 'richtext', rows: 3 },
      ],
    },
  ],

  // ── Research Corner — /activities/research-corner ──────────────
  research_corner: [
    { key: 'header', label: 'Page header', type: 'group', fields: HEADER_FIELDS },
    {
      key: 'topics',
      label: 'Research categories',
      type: 'array',
      help: 'Categories shown as cards on the Research Corner page.',
      itemSchema: [
        { key: 'icon', label: 'Icon', type: 'select', options: LUCIDE_ICON_OPTIONS },
        { key: 'label', label: 'Category name', type: 'text', placeholder: 'Science & Technology' },
        { key: 'color', label: 'Colour', type: 'color' },
      ],
    },
  ],

  // ── Activity listings — /activities/events, /activities/news-articles
  // The body is pulled automatically from the Events / Articles modules, so the
  // only thing editable here is the page header.
  activity_listing: [
    {
      key: 'header',
      label: 'Page header',
      type: 'group',
      fields: HEADER_FIELDS,
      help: 'The list itself comes from the Events / Articles modules.',
    },
  ],

  // ── Default fallback (no structured schema) ───────────────────
  default: [],
};

// Alias: template identifiers used by the old seed → schemas above.
CONTENT_SCHEMAS.pillar_grid = CONTENT_SCHEMAS.ambition_action;
CONTENT_SCHEMAS.resource_list = CONTENT_SCHEMAS.career_info;
CONTENT_SCHEMAS.accordion_guide = CONTENT_SCHEMAS.wiki_ppia;
CONTENT_SCHEMAS.event_list = CONTENT_SCHEMAS.activity_listing;

// ============================================
// Slug → Template mapping
// ============================================
// Maps each CMS page slug to the content schema key above.
// This is the single source of truth for which schema a page uses.

export const TEMPLATE_FOR_SLUG: Record<string, string> = {
  // About pages
  'about/cabinet': 'division_grid',
  'about/historical-archive': 'timeline',
  'about/ambition-action': 'ambition_action',
  'about/ad-art': 'legal_document',

  // Activities pages
  'activities/events': 'activity_listing',
  'activities/news-articles': 'activity_listing',
  'activities/research-corner': 'research_corner',

  // Opportunities pages
  'opportunities/career-info': 'career_info',
  'opportunities/partnership': 'benefit_grid',
  'opportunities/scholarship': 'scholarship',
  'opportunities/wiki-ppia': 'wiki_ppia',

  // Legal pages
  'legal/terms-of-service': 'legal_simple',
  'legal/privacy-policy': 'legal_simple',

  // Contact page
  'contact': 'contact',
};

/**
 * Get the content schema for a page based on its slug and/or template.
 * Falls back to the template identifier, then to 'default'.
 */
export function getContentSchema(slug: string, template?: string): FieldSchema[] {
  // 1. Try slug-based mapping first (most precise)
  if (slug && TEMPLATE_FOR_SLUG[slug]) {
    return CONTENT_SCHEMAS[TEMPLATE_FOR_SLUG[slug]] ?? CONTENT_SCHEMAS.default;
  }
  // 2. Fall back to template identifier
  if (template && CONTENT_SCHEMAS[template]) {
    return CONTENT_SCHEMAS[template];
  }
  // 3. Default fallback (no structured schema)
  return CONTENT_SCHEMAS.default;
}

/**
 * Check whether a page has a structured content schema.
 * If false, the editor should fall back to JSON mode.
 */
export function hasStructuredSchema(slug: string, template?: string): boolean {
  const schema = getContentSchema(slug, template);
  return schema.length > 0;
}

/**
 * Build an empty content object from a schema, so a page that has never been
 * edited still renders every field in the form editor.
 */
export function emptyContentFromSchema(schema: FieldSchema[]): Record<string, any> {
  const result: Record<string, any> = {};
  for (const field of schema) {
    switch (field.type) {
      case 'group':
        result[field.key] = emptyContentFromSchema(field.fields ?? []);
        break;
      case 'array':
      case 'stringList':
        result[field.key] = [];
        break;
      case 'number':
        result[field.key] = 0;
        break;
      case 'toggle':
        result[field.key] = false;
        break;
      default:
        result[field.key] = '';
    }
  }
  return result;
}
