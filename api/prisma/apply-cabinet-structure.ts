/**
 * Write the canonical about/cabinet structure from `page-content.ts` into the
 * database.
 *
 *   npx tsx prisma/apply-cabinet-structure.ts          # show the diff
 *   npx tsx prisma/apply-cabinet-structure.ts --apply  # write it
 *
 * This REPLACES the page's content object. Any cabinet edits made through the
 * CMS — uploaded photos included — are overwritten, which is why the default is
 * a dry run that prints what would change.
 *
 * Use it when the committee structure itself changes shape (new offices, new
 * division grouping). For routine changes — adding a member, uploading a photo —
 * use the CMS instead.
 */
import { PrismaClient } from '@prisma/client';
import { PAGE_CONTENT } from './page-content';

const prisma = new PrismaClient();

const SLUG = 'about/cabinet';

interface Person {
  name?: string;
  role?: string;
  photo?: string;
}

interface Division {
  id?: string;
  name?: string;
  group?: string;
  head?: Person;
  deputy?: Person;
  members?: Person[];
}

/** Count everyone the page would render, so the before/after is comparable. */
function headCount(content: Record<string, any>): number {
  const leaders = Array.isArray(content.leaders) ? content.leaders.length : 0;
  const divisions: Division[] = Array.isArray(content.divisions)
    ? content.divisions
    : [
        ...(content.internalDepartments ?? []),
        ...(content.externalDepartments ?? []),
      ];
  const inDivisions = divisions.reduce((sum, d) => {
    const leads = [d.head, d.deputy].filter((p) => p?.name).length;
    return sum + leads + (d.members?.length ?? 0);
  }, 0);
  return leaders + inDivisions;
}

/** Warn about photos that would be lost, since those are real uploaded work. */
function collectPhotos(content: Record<string, any>): string[] {
  const photos: string[] = [];
  const push = (p?: Person) => {
    if (p?.photo) photos.push(`${p.name ?? '?'} → ${p.photo}`);
  };
  for (const leader of content.leaders ?? []) push(leader);
  const divisions: Division[] = Array.isArray(content.divisions) ? content.divisions : [];
  for (const division of divisions) {
    push(division.head);
    push(division.deputy);
    for (const member of division.members ?? []) push(member);
  }
  return photos;
}

async function main() {
  const apply = process.argv.includes('--apply');

  const page = await prisma.page.findUnique({ where: { slug: SLUG } });
  if (!page) {
    console.error(`No page found for slug "${SLUG}".`);
    process.exit(1);
  }

  const current = (page.content ?? {}) as Record<string, any>;
  const next = PAGE_CONTENT[SLUG];

  console.log(`Current: ${headCount(current)} people`);
  console.log(`New:     ${headCount(next)} people\n`);

  console.log('New structure:');
  for (const leader of next.leaders) {
    console.log(`  ${leader.tier === 'chair' ? '◆' : '·'} ${leader.name} — ${leader.role}`);
  }
  for (const group of next.divisionGroups ?? []) {
    console.log(`\n  ${group.label}`);
    for (const division of next.divisions.filter((d: Division) => d.group === group.key)) {
      const extra = division.members?.length ?? 0;
      console.log(
        `    · ${division.name}: ${division.head?.name} (head), ${division.deputy?.name} (vice)` +
          (extra > 0 ? `, +${extra} member(s)` : ', no other members yet')
      );
    }
  }

  const existingPhotos = collectPhotos(current);
  if (existingPhotos.length > 0) {
    console.log(`\n⚠ ${existingPhotos.length} uploaded photo(s) would be cleared:`);
    for (const photo of existingPhotos) console.log(`    ${photo}`);
  }

  if (!apply) {
    console.log('\nDry run. Re-run with --apply to write this.');
    return;
  }

  await prisma.page.update({ where: { id: page.id }, data: { content: next } });
  console.log('\nWritten.');
}

main()
  .catch((e) => {
    console.error('\nFailed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
