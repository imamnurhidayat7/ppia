/**
 * Seed CMS pages for all static pages.
 *
 * Creates Page records for all 10 static pages so their content can be
 * managed from the CMS admin panel at /dashboard/admin/pages.
 *
 * Each page gets:
 *   - A unique slug matching its route
 *   - A title
 *   - A template identifier
 *   - A header object (label, title, description, breadcrumbs)
 *   - Content initially set to null (pages fall back to hardcoded data)
 *
 * When an admin edits a page via the Page Builder and saves content,
 * that saved content will override the hardcoded defaults.
 *
 * Usage:
 *   cd api && npx tsx prisma/seed-all-pages.ts
 */

import { PrismaClient } from '@prisma/client';
import { PAGE_CONTENT } from './page-content';

const prisma = new PrismaClient();

interface PageSeed {
  slug: string;
  title: string;
  template: string;
  header: {
    label: string;
    title: string;
    titleAccent?: string;
    description: string;
    breadcrumbs?: { label: string }[];
  };
  excerpt?: string;
  metaTitle?: string;
  metaDescription?: string;
}

const pages: PageSeed[] = [
  // ─── Sprint 1: About Pages ──────────────────────────────────────────
  {
    slug: 'about/cabinet',
    title: 'Cabinet',
    template: 'division_grid',
    header: {
      label: 'About PPIA',
      title: 'Our',
      titleAccent: 'Cabinet',
      description: 'Meet the dedicated team leading PPIA Auckland — our cabinet members who work tirelessly to serve the Indonesian student community.',
      breadcrumbs: [{ label: 'Home' }, { label: 'About' }, { label: 'Cabinet' }],
    },
    excerpt: 'Meet the PPIA Auckland cabinet — the team leading our organization.',
    metaTitle: 'Cabinet — PPIA Auckland',
    metaDescription: 'Meet the dedicated team leading PPIA Auckland — our cabinet members who work tirelessly to serve the Indonesian student community.',
  },
  {
    slug: 'about/historical-archive',
    title: 'Historical Archive',
    template: 'timeline',
    header: {
      label: 'About PPIA',
      title: 'Historical',
      titleAccent: 'Archive',
      description: 'The journey of PPIA Auckland — milestones, achievements, and moments that shaped our community.',
      breadcrumbs: [{ label: 'Home' }, { label: 'About' }, { label: 'Historical Archive' }],
    },
    excerpt: 'The journey of PPIA Auckland — milestones and achievements.',
    metaTitle: 'Historical Archive — PPIA Auckland',
    metaDescription: 'The journey of PPIA Auckland — milestones, achievements, and moments that shaped our community.',
  },
  {
    slug: 'about/ambition-action',
    title: 'Ambition & Action',
    template: 'pillar_grid',
    header: {
      label: 'About PPIA',
      title: 'Ambition &',
      titleAccent: 'Action',
      description: 'Our philosophy, direction, and commitment to every Indonesian student in Auckland.',
      breadcrumbs: [{ label: 'Home' }, { label: 'About' }, { label: 'Ambition & Action' }],
    },
    excerpt: 'Our philosophy, direction, and commitment to every Indonesian student in Auckland.',
    metaTitle: 'Ambition & Action — PPIA Auckland',
    metaDescription: 'Our philosophy, direction, and commitment to every Indonesian student in Auckland.',
  },
  {
    slug: 'about/ad-art',
    title: 'AD/ART',
    template: 'legal_document',
    header: {
      label: 'About PPIA',
      title: 'AD/',
      titleAccent: 'ART',
      description: 'Anggaran Dasar dan Rumah Tangga — the foundational governing documents of PPIA Auckland.',
      breadcrumbs: [{ label: 'Home' }, { label: 'About' }, { label: 'AD/ART' }],
    },
    excerpt: 'Anggaran Dasar dan Rumah Tangga — PPIA Auckland foundational governing documents.',
    metaTitle: 'AD/ART — PPIA Auckland',
    metaDescription: 'Anggaran Dasar dan Rumah Tangga — the foundational governing documents of PPIA Auckland.',
  },

  // ─── Activities Pages ───────────────────────────────────────────────
  // The listings themselves come from the Events / Articles / Research
  // modules, but the page header is CMS-managed. These Page records were
  // missing, so /activities/* headers could not be edited at all.
  {
    slug: 'activities/events',
    title: 'Events',
    template: 'activity_listing',
    header: {
      label: 'Activities',
      title: 'Our',
      titleAccent: 'Events',
      description: 'Workshops, cultural nights, sports, and networking sessions organised by PPIA Auckland.',
      breadcrumbs: [{ label: 'Home' }, { label: 'Activities' }, { label: 'Events' }],
    },
    excerpt: 'Events organised by PPIA Auckland.',
    metaTitle: 'Events — PPIA Auckland',
    metaDescription: 'Workshops, cultural nights, sports, and networking sessions organised by PPIA Auckland.',
  },
  {
    slug: 'activities/news-articles',
    title: 'News & Articles',
    template: 'activity_listing',
    header: {
      label: 'Activities',
      title: 'News &',
      titleAccent: 'Articles',
      description: 'Stories, announcements, and reflections from the Indonesian student community in Auckland.',
      breadcrumbs: [{ label: 'Home' }, { label: 'Activities' }, { label: 'News & Articles' }],
    },
    excerpt: 'News and articles from the PPIA Auckland community.',
    metaTitle: 'News & Articles — PPIA Auckland',
    metaDescription: 'Stories, announcements, and reflections from the Indonesian student community in Auckland.',
  },
  {
    slug: 'activities/research-corner',
    title: 'Research Corner',
    template: 'research_corner',
    header: {
      label: 'Activities',
      title: 'Research',
      titleAccent: 'Corner',
      description: 'A space for PPIA Auckland members to share academic research, insights, and intellectual contributions.',
      breadcrumbs: [{ label: 'Home' }, { label: 'Activities' }, { label: 'Research Corner' }],
    },
    excerpt: 'Academic research and insights from PPIA Auckland members.',
    metaTitle: 'Research Corner — PPIA Auckland',
    metaDescription: 'A space for PPIA Auckland members to share academic research, insights, and intellectual contributions.',
  },

  // ─── Sprint 2: Opportunities Pages ──────────────────────────────────
  {
    slug: 'opportunities/career-info',
    title: 'Career Info',
    template: 'resource_list',
    header: {
      label: 'Opportunities',
      title: 'Career',
      titleAccent: 'Info',
      description: 'Your gateway to career resources, job platforms, and professional development tips for studying and working in New Zealand.',
      breadcrumbs: [{ label: 'Home' }, { label: 'Opportunities' }, { label: 'Career Info' }],
    },
    excerpt: 'Career resources, job platforms, and professional development tips.',
    metaTitle: 'Career Info — PPIA Auckland',
    metaDescription: 'Your gateway to career resources, job platforms, and professional development tips for studying and working in New Zealand.',
  },
  {
    slug: 'opportunities/partnership',
    title: 'Partnership',
    template: 'benefit_grid',
    header: {
      label: 'Opportunities',
      title: 'Partnership &',
      titleAccent: 'Sponsorship',
      description: 'Partner with PPIA Auckland to reach 500+ Indonesian students across Auckland universities. Build meaningful connections with our vibrant community.',
      breadcrumbs: [{ label: 'Home' }, { label: 'Opportunities' }, { label: 'Partnership' }],
    },
    excerpt: 'Partner with PPIA Auckland to reach 500+ Indonesian students.',
    metaTitle: 'Partnership & Sponsorship — PPIA Auckland',
    metaDescription: 'Partner with PPIA Auckland to reach 500+ Indonesian students across Auckland universities. Build meaningful connections with our vibrant community.',
  },
  {
    slug: 'opportunities/scholarship',
    title: 'Scholarship',
    template: 'card_list',
    header: {
      label: 'Opportunities',
      title: 'Scholarship',
      titleAccent: 'Opportunities',
      description: 'A curated list of scholarships available to Indonesian students studying in New Zealand — from government programs to university-specific awards.',
      breadcrumbs: [{ label: 'Home' }, { label: 'Opportunities' }, { label: 'Scholarship' }],
    },
    excerpt: 'Scholarships available to Indonesian students studying in New Zealand.',
    metaTitle: 'Scholarship Opportunities — PPIA Auckland',
    metaDescription: 'A curated list of scholarships available to Indonesian students studying in New Zealand — from government programs to university-specific awards.',
  },
  {
    slug: 'opportunities/wiki-ppia',
    title: 'Wiki PPIA',
    template: 'accordion_guide',
    header: {
      label: 'Opportunities',
      title: 'Wiki',
      titleAccent: 'PPIA',
      description: 'Your survival guide to living and studying in Auckland — everything from visas and housing to food and transport.',
      breadcrumbs: [{ label: 'Home' }, { label: 'Opportunities' }, { label: 'Wiki PPIA' }],
    },
    excerpt: 'Your survival guide to living and studying in Auckland.',
    metaTitle: 'Wiki PPIA — PPIA Auckland',
    metaDescription: 'Your survival guide to living and studying in Auckland — everything from visas and housing to food and transport.',
  },

  // ─── Sprint 3: Contact & Legal Pages ────────────────────────────────
  {
    slug: 'contact',
    title: 'Contact',
    template: 'contact',
    header: {
      label: 'Get in Touch',
      title: 'Contact',
      titleAccent: 'Us',
      description: "Have a question or want to get involved? We'd love to hear from you. Reach out through any of these channels.",
      breadcrumbs: [{ label: 'Home' }, { label: 'Contact' }],
    },
    excerpt: 'Contact PPIA Auckland — get in touch with our team.',
    metaTitle: 'Contact — PPIA Auckland',
    metaDescription: "Have a question or want to get involved? We'd love to hear from you. Reach out through any of these channels.",
  },
  {
    slug: 'legal/privacy-policy',
    title: 'Privacy Policy',
    template: 'legal_document',
    header: {
      label: 'Legal',
      title: 'Privacy',
      titleAccent: 'Policy',
      description: 'How we handle your data and protect your privacy.',
      breadcrumbs: [{ label: 'Home' }, { label: 'Legal' }, { label: 'Privacy Policy' }],
    },
    excerpt: 'PPIA Auckland privacy policy and data handling practices.',
    metaTitle: 'Privacy Policy — PPIA Auckland',
    metaDescription: 'PPIA Auckland privacy policy and data handling practices.',
  },
  {
    slug: 'legal/terms-of-service',
    title: 'Terms of Service',
    template: 'legal_document',
    header: {
      label: 'Legal',
      title: 'Terms of',
      titleAccent: 'Service',
      description: 'Community guidelines and terms of service for using the PPIA Auckland platform.',
      breadcrumbs: [{ label: 'Home' }, { label: 'Legal' }, { label: 'Terms of Service' }],
    },
    excerpt: 'PPIA Auckland terms of service and community guidelines.',
    metaTitle: 'Terms of Service — PPIA Auckland',
    metaDescription: 'Community guidelines and terms of service for using the PPIA Auckland platform.',
  },
];

async function main() {
  console.log('🌱 Seeding all CMS pages...\n');

  // Find an admin user to set as author
  const adminUser = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
    select: { id: true, email: true, role: true },
  });

  let authorId: string;

  if (!adminUser) {
    const anyUser = await prisma.user.findFirst({ select: { id: true, email: true, role: true } });
    if (!anyUser) {
      throw new Error('No users found in the database. Create an admin user first.');
    }
    console.log(`⚠️  No admin user found. Using user ${anyUser.email} (${anyUser.role}) as author.\n`);
    authorId = anyUser.id;
  } else {
    console.log(`Using admin user ${adminUser.email} (${adminUser.role}) as author.\n`);
    authorId = adminUser.id;
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const page of pages) {
    const existing = await prisma.page.findUnique({
      where: { slug: page.slug },
      select: { id: true, content: true },
    });

    if (existing) {
      // Update header and metadata, and merge full content from PAGE_CONTENT.
      // If admin has already edited content blocks, preserve those edits;
      // otherwise populate from the seed defaults so content shows in the page builder.
      const existingContent = (existing.content as Record<string, any>) || {};
      const seedContent = PAGE_CONTENT[page.slug] || {};
      const seedSections = (seedContent as any).sections;
      const existingSections = existingContent.sections;
      const nextSections = seedSections
        ? (existingSections && typeof existingSections === "object" && (existingSections.internal || existingSections.external)
            ? existingSections
            : seedSections)
        : existingSections;
      const updatedContent = {
        ...seedContent,
        header: page.header,
        ...existingContent,
        ...(nextSections ? { sections: nextSections } : {}),
      };

      await prisma.page.update({
        where: { slug: page.slug },
        data: {
          title: page.title,
          template: page.template,
          content: updatedContent as any,
          excerpt: page.excerpt,
          metaTitle: page.metaTitle,
          metaDescription: page.metaDescription,
        },
      });
      console.log(`  ✏️  Updated: ${page.slug}`);
      updated++;
      continue;
    }

    // Create new page with FULL content from page-content.ts
    // (content body is populated from PAGE_CONTENT so it shows in the page builder)
    const fullContent = PAGE_CONTENT[page.slug] || {};
    await prisma.page.create({
      data: {
        title: page.title,
        slug: page.slug,
        template: page.template,
        content: { header: page.header, ...fullContent } as any,
        excerpt: page.excerpt,
        metaTitle: page.metaTitle,
        metaDescription: page.metaDescription,
        published: true,
        authorId,
      },
    });
    console.log(`  ✅ Created: ${page.slug}`);
    created++;
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total pages: ${pages.length}`);
  console.log('\n✅ Done! All CMS pages are now manageable from /dashboard/admin/pages');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
