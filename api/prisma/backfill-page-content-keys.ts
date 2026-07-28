/**
 * Add missing top-level content keys to pages that already exist.
 *
 *   npx tsx prisma/backfill-page-content-keys.ts                    # report
 *   npx tsx prisma/backfill-page-content-keys.ts --apply            # write
 *   npx tsx prisma/backfill-page-content-keys.ts --apply <slug>     # one page
 *
 * When a page component grows a new content section, the canonical shape in
 * `page-content.ts` gains a key that live rows do not have. Re-running the full
 * seed would fix that, but it also overwrites everything an editor has typed.
 *
 * This copies across only keys that are absent from the stored content. Keys
 * that already exist — including ones an editor has changed — are never touched,
 * so it is safe to run repeatedly.
 */
import { PrismaClient } from '@prisma/client';
import { PAGE_CONTENT } from './page-content';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const onlySlug = args.find((a) => !a.startsWith('--'));

  const slugs = onlySlug ? [onlySlug] : Object.keys(PAGE_CONTENT);
  let changed = 0;

  for (const slug of slugs) {
    const canonical = PAGE_CONTENT[slug];
    if (!canonical) {
      console.log(`- ${slug}: no canonical content defined, skipped`);
      continue;
    }

    const page = await prisma.page.findUnique({ where: { slug } });
    if (!page) {
      console.log(`- ${slug}: no page row, skipped`);
      continue;
    }

    const current = (page.content ?? {}) as Record<string, unknown>;
    const missing = Object.keys(canonical).filter((key) => current[key] === undefined);

    if (missing.length === 0) continue;

    console.log(`${apply ? '+' : '·'} ${slug}: adding ${missing.join(', ')}`);
    changed++;

    if (!apply) continue;

    const next = { ...current };
    for (const key of missing) next[key] = canonical[key];
    await prisma.page.update({ where: { id: page.id }, data: { content: next } });
  }

  if (changed === 0) {
    console.log('Every page already has all of its content keys.');
  } else if (!apply) {
    console.log(`\n${changed} page(s) would change. Re-run with --apply to write.`);
  } else {
    console.log(`\n${changed} page(s) updated.`);
  }
}

main()
  .catch((e) => {
    console.error('\nBackfill failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
