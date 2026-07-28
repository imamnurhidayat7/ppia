/**
 * Fill in landing section fields the editor form exposes but no row ever set.
 *
 *   npx tsx prisma/repair-landing-sections.ts          # report
 *   npx tsx prisma/repair-landing-sections.ts --apply  # write
 *
 * `about` and `membership` both had `config: null`, so "Eyebrow text" and
 * "Words to highlight" appeared empty in the CMS and the accent gradient never
 * rendered on the public page — the components fell back to defaults that did
 * not match the stored headings.
 *
 * Only empty values are written. Anything already set, including text an editor
 * has changed, is left alone, so this is safe to run repeatedly.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SectionFix {
  key: string;
  /** Set only when the column is currently empty. */
  fields?: Record<string, string>;
  /** Set only when the config key is currently empty. */
  config?: Record<string, string>;
  /**
   * The highlight has to appear inside the heading verbatim or no accent is
   * applied. Checked after the fixes so a mismatch is reported, not hidden.
   */
  expectHighlightIn?: 'title' | 'subtitle';
}

const FIXES: SectionFix[] = [
  {
    key: 'about',
    // Stored heading is "About PPIA Auckland", so this run is present.
    config: { badge: 'About us', titleHighlight: 'PPIA Auckland' },
    expectHighlightIn: 'title',
  },
  {
    key: 'membership',
    config: {
      badge: 'Membership',
      // The stored heading is "Join Our Community". Highlighting a word that is
      // actually in it beats rewriting copy an editor chose — they can change
      // both in the CMS if they want the "PPIA Family" wording back.
      titleHighlight: 'Community',
      cardTitle: 'PPIA Auckland',
      cardBadge: 'FREE',
      cardBadgeSubtitle: 'for active students',
    },
    expectHighlightIn: 'title',
  },
  {
    key: 'hero',
    config: { titleHighlight: 'Indonesia', location: 'Auckland, New Zealand' },
    expectHighlightIn: 'title',
  },
];

async function main() {
  const apply = process.argv.includes('--apply');
  let changed = 0;

  for (const fix of FIXES) {
    const section = await prisma.landingSection.findUnique({ where: { key: fix.key } });
    if (!section) {
      console.log(`- ${fix.key}: no section row, skipped`);
      continue;
    }

    const notes: string[] = [];
    const data: Record<string, unknown> = {};
    const config: Record<string, unknown> = { ...((section.config as object) ?? {}) };

    for (const [field, value] of Object.entries(fix.fields ?? {})) {
      const current = (section as unknown as Record<string, unknown>)[field];
      if (typeof current === 'string' && current.trim()) continue;
      data[field] = value;
      notes.push(`${field} = "${value}"`);
    }

    for (const [key, value] of Object.entries(fix.config ?? {})) {
      const current = config[key];
      if (typeof current === 'string' && current.trim()) continue;
      config[key] = value;
      notes.push(`config.${key} = "${value}"`);
    }

    if (notes.length > 0) {
      console.log(`${apply ? '+' : '·'} ${fix.key}`);
      for (const note of notes) console.log(`    ${note}`);
      changed++;
      if (apply) {
        await prisma.landingSection.update({
          where: { id: section.id },
          data: { ...data, config },
        });
      }
    } else {
      console.log(`· ${fix.key}: already set`);
    }

    // Report whether the accent will actually apply.
    if (fix.expectHighlightIn) {
      const heading =
        (data[fix.expectHighlightIn] as string | undefined) ??
        ((section as unknown as Record<string, unknown>)[fix.expectHighlightIn] as string) ??
        '';
      const highlight = String(config.titleHighlight ?? '');
      if (highlight && !heading.includes(highlight)) {
        console.log(
          `    ⚠ "${highlight}" is not inside the heading "${heading}" — the accent gradient will not render. Adjust one of them in the CMS.`
        );
      }
    }
  }

  if (changed === 0) {
    console.log('\nNothing needed filling in.');
  } else if (!apply) {
    console.log(`\n${changed} section(s) would change. Re-run with --apply to write.`);
  } else {
    console.log(`\n${changed} section(s) updated.`);
  }
}

main()
  .catch((e) => {
    console.error('\nRepair failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
