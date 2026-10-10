/**
 * One-off normalisation: rewrite stored absolute file URLs into stable keys.
 *
 * Moving file storage (Supabase → Hostinger VPS, a CDN, …) is a config change
 * only when rows hold object KEYS. Rows written before the key-based upload
 * response hold absolute URLs, so run this once per move:
 *
 *   cd api
 *   npx tsx scripts/normalize-storage-keys.ts        # dry run, prints counts
 *   npx tsx scripts/normalize-storage-keys.ts --apply  # actually write
 *
 * Two modes, because the two value shapes resolve differently:
 *   scalar URL columns (avatar, imageUrl, …) → stripped to the bare key.
 *     Readers resolve keys at display time via PUBLIC_FILES_BASE_URL /
 *     NEXT_PUBLIC_FILES_BASE_URL, so no further rewrite is ever needed.
 *   rich-text columns (PageBlock/SectionBlock HTML) → REBASED onto the current
 *     PUBLIC_FILES_BASE_URL. Raw HTML has no resolver pass, so it must keep a
 *     working absolute URL; re-running this script re-points it at the new host.
 *
 * Only values starting with a known storage prefix are touched
 * (PUBLIC_FILES_BASE_URL, the Supabase public base, ${API_URL}/uploads, plus
 * comma-separated LEGACY_PUBLIC_BASES). External links, pasted URLs and site
 * assets like `/logo.svg` are never modified. Idempotent: re-running changes
 * nothing once values are keys.
 */
import '../src/lib/data-source';
import { PrismaClient } from '@prisma/client';
import { legacyPublicBases, PUBLIC_FILES_BASE_URL, storedKeyForValue } from '../src/lib/storage';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

interface ScalarTarget {
  kind: 'scalar';
  model: 'user' | 'article' | 'candidate' | 'event' | 'page' | 'pageBlock' | 'sectionBlock' | 'media';
  field: string;
}

interface HtmlTarget {
  kind: 'html';
  model: 'pageBlock' | 'sectionBlock';
  field: string;
}

const SCALARS: ScalarTarget[] = [
  { kind: 'scalar', model: 'user', field: 'avatar' },
  { kind: 'scalar', model: 'user', field: 'memberCardUrl' },
  { kind: 'scalar', model: 'article', field: 'imageUrl' },
  { kind: 'scalar', model: 'candidate', field: 'posterUrl' },
  { kind: 'scalar', model: 'event', field: 'imageUrl' },
  { kind: 'scalar', model: 'page', field: 'featuredImage' },
  { kind: 'scalar', model: 'pageBlock', field: 'imageUrl' },
  { kind: 'scalar', model: 'sectionBlock', field: 'imageUrl' },
  { kind: 'scalar', model: 'media', field: 'url' },
];

const HTMLS: HtmlTarget[] = [
  { kind: 'html', model: 'pageBlock', field: 'content' },
  { kind: 'html', model: 'pageBlock', field: 'contentId' },
  { kind: 'html', model: 'sectionBlock', field: 'content' },
  { kind: 'html', model: 'sectionBlock', field: 'contentId' },
];

async function main(): Promise<void> {
  const prefixes = legacyPublicBases();
  console.log(`Public files base: ${PUBLIC_FILES_BASE_URL}`);
  console.log(`Known prefixes (${prefixes.length}):`);
  for (const p of prefixes) console.log(`  - ${p}`);
  console.log(APPLY ? 'Mode: APPLY (writing)' : 'Mode: dry run (no writes — pass --apply to write)');

  let scalarChanged = 0;
  for (const target of SCALARS) {
    const delegate = (prisma as unknown as Record<string, {
      findMany: (args: unknown) => Promise<Array<{ id: string } & Record<string, unknown>>>;
      update: (args: unknown) => Promise<unknown>;
    }>)[target.model];
    const rows = await delegate.findMany({
      where: { [target.field]: { not: null } },
      select: { id: true, [target.field]: true },
    });
    let touched = 0;
    for (const row of rows) {
      const value = row[target.field] as string | null;
      if (typeof value !== 'string') continue;
      const key = storedKeyForValue(value, prefixes);
      // Only rewrite when the value was an absolute URL of ours collapsing to
      // a DIFFERENT (shorter) key. Bare keys and foreign URLs yield either
      // themselves or null and are left alone.
      if (key !== null && key !== value && value.startsWith('http')) {
        touched += 1;
        if (APPLY) {
          await delegate.update({ where: { id: row.id }, data: { [target.field]: key } });
        }
      }
    }
    console.log(`${target.model}.${target.field}: ${touched} row(s) to normalise`);
    scalarChanged += touched;
  }

  let htmlChanged = 0;
  for (const target of HTMLS) {
    const delegate = (prisma as unknown as Record<string, {
      findMany: (args: unknown) => Promise<Array<{ id: string } & Record<string, unknown>>>;
      update: (args: unknown) => Promise<unknown>;
    }>)[target.model];
    const rows = await delegate.findMany({
      where: { [target.field]: { not: null } },
      select: { id: true, [target.field]: true },
    });
    let touched = 0;
    for (const row of rows) {
      const value = row[target.field] as string | null;
      if (typeof value !== 'string' || !value.includes('http')) continue;
      let next = value;
      for (const prefix of prefixes) {
        if (prefix === PUBLIC_FILES_BASE_URL) continue;
        next = next.split(`${prefix}/`).join(`${PUBLIC_FILES_BASE_URL}/`);
      }
      if (next !== value) {
        touched += 1;
        if (APPLY) {
          await delegate.update({ where: { id: row.id }, data: { [target.field]: next } });
        }
      }
    }
    console.log(`${target.model}.${target.field}: ${touched} row(s) to rebase`);
    htmlChanged += touched;
  }

  console.log(
    APPLY
      ? `Done. Normalised ${scalarChanged} value(s), rebased ${htmlChanged} HTML field(s).`
      : `Dry run complete. Would normalise ${scalarChanged} value(s) and rebase ${htmlChanged} HTML field(s).`
  );
}

main()
  .catch((error) => {
    console.error('normalise-storage-keys failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
