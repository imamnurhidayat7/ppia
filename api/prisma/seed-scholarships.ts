/**
 * One-time import of the legacy CMS scholarships into the Scholarship table.
 *
 * Scholarship data used to live in the `opportunities/scholarship` page-content
 * array (SUPER_ADMIN-only, edited through the page builder). It now lives in
 * its own table so members can propose entries and the board can review them.
 *
 * Idempotent: matches on slug, so re-running only fills rows that are still
 * missing. Imported rows are PUBLISHED so the public page keeps showing the
 * same list. The CMS array stays as a read-only fallback and is NOT deleted.
 *
 * Usage:
 *   cd api && npx tsx prisma/seed-scholarships.ts
 */

import '../src/lib/data-source';
import { PrismaClient } from '@prisma/client';
import { scholarshipContent } from './page-content';

const prisma = new PrismaClient();

const TYPE_MAP: Record<string, 'INDONESIAN_GOV' | 'NZ_GOV' | 'UNIVERSITY'> = {
  'Indonesian Gov': 'INDONESIAN_GOV',
  'NZ Gov': 'NZ_GOV',
  University: 'UNIVERSITY',
};

function slugify(name: string): string {
  return (name || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toStringArray(raw: unknown): string[] {
  if (!raw) return [];
  if (typeof raw === 'string') return raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object' && 'value' in item) return String((item as { value: unknown }).value).trim();
      return '';
    })
    .filter(Boolean);
}

async function main(): Promise<void> {
  const rows = Array.isArray((scholarshipContent as any)?.scholarships)
    ? (scholarshipContent as any).scholarships
    : [];
  if (rows.length === 0) {
    console.log('No CMS scholarships to import.');
    return;
  }

  const submitter = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  let created = 0;
  let skipped = 0;
  for (const row of rows) {
    if (!row || typeof row !== 'object' || typeof row.name !== 'string' || !row.name) {
      skipped += 1;
      continue;
    }
    const slug = slugify(row.name) || `scholarship-${created + 1}`;
    const existing = await prisma.scholarship.findUnique({ where: { slug } });
    if (existing) {
      skipped += 1;
      continue;
    }
    await prisma.scholarship.create({
      data: {
        slug,
        name: row.name,
        provider: typeof row.provider === 'string' ? row.provider : '',
        type: TYPE_MAP[row.type] ?? 'UNIVERSITY',
        color: typeof row.color === 'string' && row.color ? row.color : '#3B82F6',
        level: toStringArray(row.level),
        coverage: toStringArray(row.coverage),
        amount: typeof row.amount === 'string' ? row.amount : '',
        deadline: typeof row.deadline === 'string' ? row.deadline : '',
        url: typeof row.url === 'string' ? row.url : '',
        desc: typeof row.desc === 'string' ? row.desc : '',
        featured: !!row.featured,
        status: 'PUBLISHED',
        published: true,
        submittedById: submitter?.id ?? null,
        reviewedBy: submitter?.id ?? null,
        reviewedAt: submitter ? new Date() : null,
      },
    });
    created += 1;
  }

  console.log(`Scholarship import done: ${created} created, ${skipped} skipped.`);
}

main()
  .catch((error) => {
    console.error('Scholarship import failed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
