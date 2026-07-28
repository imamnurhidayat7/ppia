/**
 * Delete landing sections by key, along with their blocks.
 *
 *   npx tsx prisma/delete-landing-sections.ts partners
 *   npx tsx prisma/delete-landing-sections.ts partners testimonials
 *
 * Prints what it is about to remove before removing it. Keys that do not exist
 * are reported and skipped rather than failing the run.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const keys = process.argv.slice(2).filter(Boolean);

  if (keys.length === 0) {
    console.error('Usage: npx tsx prisma/delete-landing-sections.ts <key> [key...]');
    process.exit(1);
  }

  for (const key of keys) {
    const section = await prisma.landingSection.findUnique({
      where: { key },
      include: { blocks: true },
    });

    if (!section) {
      console.log(`- ${key}: no such section, skipped`);
      continue;
    }

    console.log(`- ${key}: removing section and ${section.blocks.length} block(s)`);
    await prisma.sectionBlock.deleteMany({ where: { sectionId: section.id } });
    await prisma.landingSection.delete({ where: { id: section.id } });
    console.log(`  done`);
  }

  const remaining = await prisma.landingSection.findMany({
    orderBy: { order: 'asc' },
    select: { key: true },
  });
  console.log(`\nRemaining sections: ${remaining.map((s) => s.key).join(', ')}`);
}

main()
  .catch((e) => {
    console.error('\nDelete failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
