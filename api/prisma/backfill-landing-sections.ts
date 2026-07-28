/**
 * Additive backfill for landing sections.
 *
 * Unlike `seed-landing-sections.ts` — which deletes and recreates every block,
 * discarding anything edited through the CMS — this script only creates rows
 * that do not exist yet. Existing sections and their blocks are left untouched.
 *
 * Why it is needed: the public section components fall back to built-in default
 * content when their CMS row is missing. That makes the homepage look complete
 * while the editor shows nothing to edit, because there is no record to select.
 *
 * Safe to run repeatedly.
 *
 *   npx tsx prisma/backfill-landing-sections.ts
 */
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

type BlockSeed = Omit<Prisma.SectionBlockCreateManyInput, 'sectionId'>;

interface SectionSeed {
  key: string;
  title: string | null;
  titleId?: string | null;
  subtitle?: string | null;
  subtitleId?: string | null;
  description?: string | null;
  descriptionId?: string | null;
  order: number;
  config?: Prisma.InputJsonValue;
  blocks: BlockSeed[];
}

/**
 * Order values match the order the sections appear in `web/src/app/page.tsx`.
 * Sections already in the database keep their current order — this only sets
 * the order of newly created rows.
 */
const SECTIONS: SectionSeed[] = [
  // `partners` is intentionally absent — see the note in seed-landing-sections.ts.
  {
    key: 'testimonials',
    // `title` is the eyebrow, `subtitle` is the heading.
    title: 'What members say',
    titleId: 'Kata mereka',
    subtitle: 'Real stories from our community',
    subtitleId: 'Kisah nyata dari komunitas kami',
    order: 7,
    config: { titleHighlight: 'our community' },
    /**
     * No sample quotes are seeded, on purpose — see the note in
     * seed-landing-sections.ts. A quote attributed to a named person has to come
     * from that person.
     *
     * For QUOTE blocks: title = name, subtitle = role, content = the quote.
     */
    blocks: [],
  },
  {
    key: 'faq',
    title: 'Got questions?',
    titleId: 'Punya pertanyaan?',
    subtitle: 'Here are the answers to the things people ask most before joining.',
    subtitleId: 'Berikut jawaban atas hal-hal yang paling sering ditanyakan sebelum bergabung.',
    order: 8,
    // For FAQ blocks: title = question, content = answer.
    blocks: [
      {
        type: 'FAQ',
        title: 'Is PPIA membership free?',
        content:
          'Yes — membership is completely free for all Indonesian students currently studying in Auckland, regardless of university or degree level.',
        order: 0,
        enabled: true,
      },
      {
        type: 'FAQ',
        title: 'Do I need to be enrolled at a specific university?',
        content:
          'No. We welcome students from all Auckland institutions — University of Auckland, AUT, Massey (Albany campus), and any other accredited institution.',
        order: 1,
        enabled: true,
      },
      {
        type: 'FAQ',
        title: 'What kind of events does PPIA organise?',
        content:
          'Everything from academic workshops and career networking to cultural nights, sports days, and social hangouts. We run 20+ events per year.',
        order: 2,
        enabled: true,
      },
      {
        type: 'FAQ',
        title: 'How do I register?',
        content:
          "Click \"Register\" in the navigation bar, fill in the short form, and you're done. An admin will approve your account within 1-2 business days.",
        order: 3,
        enabled: true,
      },
    ],
  },
];

async function main() {
  let created = 0;
  let skipped = 0;

  for (const seed of SECTIONS) {
    const existing = await prisma.landingSection.findUnique({
      where: { key: seed.key },
      include: { blocks: true },
    });

    if (existing) {
      console.log(`- ${seed.key}: already exists (${existing.blocks.length} blocks) — left untouched`);
      skipped++;
      continue;
    }

    const { blocks, ...sectionData } = seed;
    const section = await prisma.landingSection.create({
      data: { ...sectionData, enabled: true },
    });

    if (blocks.length > 0) {
      await prisma.sectionBlock.createMany({
        data: blocks.map((b) => ({ ...b, sectionId: section.id })),
      });
    }

    console.log(`+ ${seed.key}: created with ${blocks.length} blocks`);
    created++;
  }

  console.log(`\nDone. Created ${created}, skipped ${skipped}.`);
}

main()
  .catch((e) => {
    console.error('\nBackfill failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
