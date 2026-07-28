import prisma from '../src/lib/prisma';

const apply = process.argv.includes('--apply');

async function main() {
  const pages = await prisma.page.findMany({
    where: {
      pageType: { not: 'custom' },
      blocks: { some: {} },
    },
    select: {
      slug: true,
      _count: { select: { blocks: true } },
    },
    orderBy: { slug: 'asc' },
  });

  const total = pages.reduce((sum, page) => sum + page._count.blocks, 0);
  for (const page of pages) console.log(`${page.slug}: ${page._count.blocks}`);
  console.log(`Template pages: ${pages.length}; blocks: ${total}`);

  if (!apply) {
    console.log('No data changed. Re-run with --apply to delete.');
    return;
  }

  const [result] = await prisma.$transaction([
    prisma.pageBlock.deleteMany({
      where: { page: { pageType: { not: 'custom' } } },
    }),
  ]);
  console.log(`Deleted ${result.count} template-page blocks.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
