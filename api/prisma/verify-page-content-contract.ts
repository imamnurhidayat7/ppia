/**
 * Guards the contract between seeded `Page.content` and what the public pages
 * read. A mismatch here means an editor can change a field in the CMS and see
 * nothing happen on the site (or vice versa), which is the failure mode this
 * script exists to catch.
 */
import { PAGE_CONTENT } from './page-content';

const templateSlugs = [
  'about/cabinet',
  'about/historical-archive',
  'about/ambition-action',
  'about/ad-art',
  'activities/events',
  'activities/news-articles',
  'activities/research-corner',
  'opportunities/career-info',
  'opportunities/partnership',
  'opportunities/scholarship',
  'opportunities/wiki-ppia',
  'contact',
  'legal/privacy-policy',
  'legal/terms-of-service',
] as const;

for (const slug of templateSlugs) {
  const content = PAGE_CONTENT[slug];
  if (!content || typeof content !== 'object') {
    throw new Error(`Missing seed content for ${slug}`);
  }
  if (!content.header || typeof content.header !== 'object') {
    throw new Error(`Missing header block for ${slug}`);
  }
}

/** Keys each public page reads from `page.content`, beyond `header`. */
const requiredKeys: Record<string, string[]> = {
  'about/cabinet': [
    'stats',
    'leadershipSection',
    'leaders',
    'divisionsSection',
    'divisions',
    'cta',
  ],
  'about/historical-archive': ['timelineSection', 'cta', 'documents', 'milestones'],
  'about/ambition-action': [
    'sectionLabel',
    'sectionTitle',
    'sectionTitleAccent',
    'sectionIntro',
    'pillars',
    'ambitionLabel',
    'ambitionQuote',
    'ambitionQuoteAccent',
    'ctaTitle',
    'ctaDescription',
    'ctaButtonText',
    'ctaButtonUrl',
  ],
  'about/ad-art': ['adArticles'],
  'activities/research-corner': ['topics'],
  'opportunities/career-info': ['stats', 'platforms', 'cvTips', 'workCultureTips'],
  'opportunities/partnership': [
    'benefits',
    'tiers',
    'currentPartners',
    'benefitsSection',
    'tiersSection',
    'cta',
  ],
  'opportunities/scholarship': ['stats', 'scholarships', 'applicationTips'],
  'opportunities/wiki-ppia': ['sections', 'meta'],
  contact: ['channels', 'topics', 'faqs'],
  'legal/privacy-policy': ['sections'],
  'legal/terms-of-service': ['sections'],
};

for (const [slug, keys] of Object.entries(requiredKeys)) {
  const content = PAGE_CONTENT[slug];
  for (const key of keys) {
    if (content[key] === undefined) {
      throw new Error(`${slug} is missing content key "${key}" read by the public page`);
    }
  }
}

/**
 * Cabinet people.
 *
 * `leaders` and `divisions[].members` are rendered by the same card component,
 * which reads `name`, `role` and `photo`. Anything missing `name` renders as an
 * anonymous avatar, so that is the one field worth asserting.
 */
const cabinet = PAGE_CONTENT['about/cabinet'];

for (const key of ['leaders', 'divisions'] as const) {
  if (!Array.isArray(cabinet[key])) {
    throw new Error(`about/cabinet ${key} must be an array`);
  }
}

for (const [index, leader] of cabinet.leaders.entries()) {
  if (typeof leader.name !== 'string' || !leader.name.trim()) {
    throw new Error(`about/cabinet leaders[${index}] needs a name`);
  }
  if (typeof leader.role !== 'string') {
    throw new Error(`about/cabinet leaders[${index}] needs a role string`);
  }
}

/** Exactly one office is rendered as the chair. */
const chairs = cabinet.leaders.filter((l: { tier?: string }) => l.tier === 'chair');
if (chairs.length !== 1) {
  throw new Error(
    `about/cabinet needs exactly one leader with tier "chair", found ${chairs.length}`
  );
}

/** Divisions may point at a group, and the group must exist. */
const groupKeys = new Set(
  (Array.isArray(cabinet.divisionGroups) ? cabinet.divisionGroups : []).map(
    (g: { key: string }) => g.key
  )
);

for (const [index, division] of cabinet.divisions.entries()) {
  if (!division.id) {
    throw new Error(`about/cabinet divisions[${index}] needs an id`);
  }
  if (division.group && !groupKeys.has(division.group)) {
    throw new Error(
      `about/cabinet divisions[${index}] points at unknown group "${division.group}"`
    );
  }
  if (!Array.isArray(division.members)) {
    throw new Error(`about/cabinet divisions[${index}].members must be an array`);
  }
  for (const [m, member] of division.members.entries()) {
    if (typeof member.name !== 'string' || !member.name.trim()) {
      throw new Error(`about/cabinet divisions[${index}].members[${m}] needs a name`);
    }
  }
}

/** Division ids address the DOM and must not collide. */
const divisionIds = cabinet.divisions.map((d: { id: string }) => d.id);
if (new Set(divisionIds).size !== divisionIds.length) {
  throw new Error('about/cabinet division ids must be unique');
}

/** Contact icons resolve through a lowercase map keyed on `iconName`. */
const CONTACT_ICONS = new Set([
  'mail',
  'instagram',
  'whatsapp',
  'messageCircle',
  'mapPin',
  'users',
  'helpCircle',
  'clock',
  'briefcase',
  'send',
]);
for (const group of ['channels', 'topics'] as const) {
  for (const [index, item] of PAGE_CONTENT.contact[group].entries()) {
    if (!item.iconName) {
      throw new Error(`contact ${group}[${index}] must use "iconName" (not "icon")`);
    }
    if (!CONTACT_ICONS.has(item.iconName)) {
      throw new Error(`contact ${group}[${index}] has unknown iconName "${item.iconName}"`);
    }
  }
}

/**
 * Wiki sections resolve their icon through a name → component map, so a typo
 * would silently fall back to the default icon rather than fail visibly.
 */
const WIKI_ICONS = new Set([
  'BookOpen',
  'Plane',
  'MapPin',
  'FileText',
  'Car',
  'ShoppingBag',
  'Sun',
  'Users',
  'Home',
  'Landmark',
  'HeartPulse',
  'Heart',
  'Globe',
]);
const wikiSections = PAGE_CONTENT['opportunities/wiki-ppia'].sections;
const wikiIds = new Set<string>();
for (const [index, section] of wikiSections.entries()) {
  if (!section.id) {
    throw new Error(`wiki-ppia sections[${index}] needs an id — it is used as a link target`);
  }
  if (wikiIds.has(section.id)) {
    throw new Error(`wiki-ppia has a duplicate section id "${section.id}"`);
  }
  wikiIds.add(section.id);
  if (section.icon && !WIKI_ICONS.has(section.icon)) {
    throw new Error(`wiki-ppia sections[${index}] has unknown icon "${section.icon}"`);
  }
  if (!Array.isArray(section.items)) {
    throw new Error(`wiki-ppia sections[${index}].items must be an array`);
  }
}

/** Scholarship level/coverage must be plain string arrays. */
const scholarships = PAGE_CONTENT['opportunities/scholarship']?.scholarships;
if (!Array.isArray(scholarships)) throw new Error('Scholarship content must be an array');
for (const [index, scholarship] of scholarships.entries()) {
  for (const field of ['level', 'coverage'] as const) {
    const values = scholarship[field];
    if (!Array.isArray(values) || values.some((value: unknown) => typeof value !== 'string')) {
      throw new Error(`Scholarship ${index}.${field} must be string[]`);
    }
  }
}

/** Partnership tier perks must be plain string arrays too. */
for (const [index, tier] of PAGE_CONTENT['opportunities/partnership'].tiers.entries()) {
  if (!Array.isArray(tier.perks) || tier.perks.some((p: unknown) => typeof p !== 'string')) {
    throw new Error(`Partnership tier ${index}.perks must be string[]`);
  }
}

console.log(
  `Verified ${templateSlugs.length} template content contracts and ${scholarships.length} scholarships.`
);
