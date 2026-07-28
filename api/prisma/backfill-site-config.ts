/**
 * Additive backfill for SiteConfig rows.
 *
 *   npx tsx prisma/backfill-site-config.ts
 *
 * Creates configuration rows that the app reads but that were never seeded.
 * Existing rows are left untouched, so this is safe to run repeatedly and will
 * not overwrite a palette someone has already tuned in the CMS.
 */
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const CONFIGS: { key: string; config: Prisma.InputJsonValue; note: string }[] = [
  {
    key: 'colors',
    note: 'theme palette read by use-landing-colors',
    config: {
      primary: '#1A2B4A',
      accent: '#E8231A',
      textAccent: '#E8231A',
      buttonPrimary: '#E8231A',
      buttonSecondary: '#1A2B4A',
    },
  },
];

async function main() {
  for (const entry of CONFIGS) {
    const existing = await prisma.siteConfig.findUnique({ where: { key: entry.key } });
    if (existing) {
      console.log(`- ${entry.key}: already exists — left untouched`);
      continue;
    }
    await prisma.siteConfig.create({ data: { key: entry.key, config: entry.config } });
    console.log(`+ ${entry.key}: created (${entry.note})`);
  }

  const all = await prisma.siteConfig.findMany({ select: { key: true }, orderBy: { key: 'asc' } });
  console.log(`\nSiteConfig keys: ${all.map((c) => c.key).join(', ')}`);
}

main()
  .catch((e) => {
    console.error('\nBackfill failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
