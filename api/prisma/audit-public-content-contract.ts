import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PAGE_CONTENT } from './page-content';

const routes = [
  ['about/cabinet', 'page-content'],
  ['about/historical-archive', 'page-content'],
  ['about/ambition-action', 'page-content'],
  ['about/ad-art', 'page-content'],
  // Listings come from their modules, but the page header is CMS-managed and
  // therefore needs a Page.content record of its own.
  ['activities/events', 'page-content'],
  ['activities/news-articles', 'page-content'],
  ['activities/research-corner', 'page-content'],
  ['opportunities/career-info', 'page-content'],
  ['opportunities/partnership', 'page-content'],
  ['opportunities/scholarship', 'page-content'],
  ['opportunities/wiki-ppia', 'page-content'],
  ['contact', 'page-content'],
  ['legal/privacy-policy', 'page-content'],
  ['legal/terms-of-service', 'page-content'],
  ['/', 'landing-section'],
  ['/pemira', 'module-api'],
] as const;

const fallbackFiles = [
  'about/cabinet', 'about/historical-archive', 'about/ambition-action', 'about/ad-art',
  'opportunities/career-info', 'opportunities/partnership', 'opportunities/wiki-ppia', 'contact',
];

for (const [slug, source] of routes) {
  if (source === 'page-content' && (!PAGE_CONTENT[slug] || typeof PAGE_CONTENT[slug] !== 'object')) {
    throw new Error(`Missing Page.content seed for ${slug}`);
  }
}

const publicRoot = join(process.cwd(), '..', 'web', 'src', 'app');
const fallbackHits = fallbackFiles.filter((slug) => {
  const file = join(publicRoot, ...slug.split('/'), 'page.tsx');
  return readFileSync(file, 'utf8').includes('DEFAULT_CONTENT');
});
if (fallbackHits.length) {
  throw new Error(`User-content fallbacks remain: ${fallbackHits.join(', ')}`);
}

console.log(`Verified ${routes.length} public route ownership contracts.`);
