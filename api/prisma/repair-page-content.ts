/**
 * Targeted repairs to stored page content.
 *
 *   npx tsx prisma/repair-page-content.ts          # report what would change
 *   npx tsx prisma/repair-page-content.ts --apply  # write the changes
 *
 * Unlike `backfill-page-content-keys.ts`, which only adds keys that are missing
 * entirely, these repairs correct the *contents* of keys that already exist.
 * Each one is idempotent and reports what it touched, so running twice is safe.
 *
 * Repairs
 * -------
 * 1. contact — `icon` → `iconName`, camelCased.
 *
 *    The contact page resolves icons through a map keyed in camelCase (`mail`,
 *    `mapPin`, `helpCircle`). The stored rows used the key `icon` with
 *    capitalised values (`Mail`, `MapPin`), which matched nothing and fell
 *    through to the default envelope. Three of the four contact cards were
 *    showing the wrong icon on the live site. The source of truth in
 *    `page-content.ts` was fixed earlier, but a full re-seed would have
 *    discarded editor changes, so the stored rows were never corrected.
 *
 * 2. about/ambition-action — drop `sectionSubtitle`.
 *
 *    An earlier seed wrote the intro paragraph to `sectionSubtitle` while the
 *    page reads `sectionIntro`. `sectionIntro` is now populated, leaving
 *    `sectionSubtitle` as a dead key that nothing renders — confusing for the
 *    next person who opens the JSON.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Icon names the contact page can actually resolve (see its ICON_MAP). */
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

/** `MapPin` → `mapPin`, `Mail` → `mail`. */
function toCamel(name: string): string {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

interface Repair {
  slug: string;
  describe: string;
  /** Mutates a copy and returns notes, or an empty array when nothing changed. */
  run: (content: Record<string, any>) => string[];
}

const REPAIRS: Repair[] = [
  {
    slug: 'contact',
    describe: 'move channel/topic `icon` to `iconName` in camelCase',
    run: (content) => {
      const notes: string[] = [];
      for (const group of ['channels', 'topics'] as const) {
        const items = content[group];
        if (!Array.isArray(items)) continue;

        items.forEach((item: Record<string, any>, index: number) => {
          // Already correct and resolvable — leave it alone.
          if (item.iconName && CONTACT_ICONS.has(item.iconName)) {
            if ('icon' in item) {
              delete item.icon;
              notes.push(`${group}[${index}]: removed leftover \`icon\``);
            }
            return;
          }

          const raw =
            (typeof item.iconName === 'string' && item.iconName) ||
            (typeof item.icon === 'string' && item.icon) ||
            '';
          if (!raw) {
            notes.push(`${group}[${index}]: no icon at all — needs setting in the CMS`);
            return;
          }

          const camel = toCamel(raw);
          if (!CONTACT_ICONS.has(camel)) {
            notes.push(`${group}[${index}]: "${raw}" is not a known icon — left as is`);
            return;
          }

          item.iconName = camel;
          delete item.icon;
          notes.push(`${group}[${index}]: "${raw}" → "${camel}"`);
        });
      }
      return notes;
    },
  },
  {
    slug: 'about/ambition-action',
    describe: 'drop the dead `sectionSubtitle` key',
    run: (content) => {
      if (!('sectionSubtitle' in content)) return [];
      // Only safe to drop once the field the page actually reads is populated.
      if (!content.sectionIntro) {
        return ['sectionIntro is empty — keeping sectionSubtitle so no text is lost'];
      }
      delete content.sectionSubtitle;
      return ['removed sectionSubtitle (sectionIntro holds this text)'];
    },
  },
];

async function main() {
  const apply = process.argv.includes('--apply');
  let changed = 0;

  for (const repair of REPAIRS) {
    const page = await prisma.page.findUnique({ where: { slug: repair.slug } });
    if (!page) {
      console.log(`- ${repair.slug}: no page row, skipped`);
      continue;
    }

    // Deep clone so a repair that bails out cannot leave partial edits behind.
    const content = JSON.parse(JSON.stringify(page.content ?? {}));
    const notes = repair.run(content);

    if (notes.length === 0) {
      console.log(`· ${repair.slug}: nothing to do (${repair.describe})`);
      continue;
    }

    console.log(`${apply ? '+' : '·'} ${repair.slug}: ${repair.describe}`);
    for (const note of notes) console.log(`    ${note}`);
    changed++;

    if (apply) {
      await prisma.page.update({ where: { id: page.id }, data: { content } });
    }
  }

  if (changed === 0) {
    console.log('\nNothing needed repairing.');
  } else if (!apply) {
    console.log(`\n${changed} page(s) would change. Re-run with --apply to write.`);
  } else {
    console.log(`\n${changed} page(s) repaired.`);
  }
}

main()
  .catch((e) => {
    console.error('\nRepair failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
