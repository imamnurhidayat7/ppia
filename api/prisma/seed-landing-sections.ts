import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding landing page sections with PPIA Auckland content...\n');

  // ========================================
  // LANDING SECTIONS
  // ========================================

  const sections = [
    {
      key: 'hero',
      // The line break is deliberate — the headline is rendered pre-line.
      title: 'Berlayar\nuntuk Indonesia',
      titleId: 'Berlayar\nuntuk Indonesia',
      subtitle: 'The home of Indonesian students in Auckland. A place to grow, connect, and build the future together.',
      subtitleId: 'Rumah bagi pelajar Indonesia di Auckland. Tempat untuk tumbuh, terhubung, dan membangun masa depan bersama.',
      description: null,
      descriptionId: null,
      enabled: true,
      order: 0,
      config: {
        location: 'Auckland, New Zealand',
        titleHighlight: 'Indonesia',
      },
      blocks: [
        {
          type: 'CTA_BUTTON' as const,
          title: 'Join Our Community',
          subtitle: null,
          content: null,
          linkUrl: '/register',
          linkText: 'Join Our Community',
          linkTextId: 'Bergabung Sekarang',
          imageUrl: null,
          iconName: null,
          // Empty colour means "use the site theme colour".
          color: null,
          order: 0,
          enabled: true,
          config: { variant: 'primary' },
        },
        {
          type: 'CTA_BUTTON' as const,
          title: 'Meet the Team',
          subtitle: null,
          content: null,
          linkUrl: '/about/cabinet',
          linkText: 'Meet the Team',
          linkTextId: 'Tim Kami',
          imageUrl: null,
          iconName: null,
          color: null,
          order: 1,
          enabled: true,
          config: { variant: 'secondary' },
        },
        {
          type: 'STATISTIC' as const,
          title: 'Active Members',
          subtitle: 'and growing',
          subtitleId: 'dan terus bertumbuh',
          content: '500',
          linkUrl: null,
          linkText: null,
          imageUrl: null,
          iconName: 'Users',
          color: '#E8231A',
          order: 2,
          enabled: true,
        },
        {
          type: 'STATISTIC' as const,
          title: 'Events Held',
          subtitle: 'this year',
          subtitleId: 'tahun ini',
          content: '25',
          linkUrl: null,
          linkText: null,
          imageUrl: null,
          iconName: 'Calendar',
          color: '#2563EB',
          order: 3,
          enabled: true,
        },
        {
          type: 'STATISTIC' as const,
          title: 'Articles Published',
          subtitle: 'and counting',
          subtitleId: 'dan terus bertambah',
          content: '100',
          linkUrl: null,
          linkText: null,
          imageUrl: null,
          iconName: 'FileText',
          color: '#8B5CF6',
          order: 4,
          enabled: true,
        },
      ],
    },
    {
      key: 'about',
      title: 'What is PPIA Auckland?',
      titleId: 'Apa itu PPIA Auckland?',
      subtitle: 'Building Bridges, Creating Futures',
      subtitleId: 'Membangun Jembatan, Menciptakan Masa Depan',
      description:
        'PPIA Auckland is the official association for Indonesian students in Auckland, New Zealand. We bring people together, and help every member grow academically, professionally, and personally.',
      descriptionId:
        'PPIA Auckland adalah asosiasi resmi untuk pelajar Indonesia di Auckland, Selandia Baru. Kami mempertemukan orang-orang dan membantu setiap anggota tumbuh secara akademik, profesional, dan pribadi.',
      enabled: true,
      order: 1,
      config: {
        badge: 'About us',
        titleHighlight: 'PPIA Auckland?',
      },
      blocks: [
        {
          type: 'FEATURE' as const,
          title: 'Strong Community',
          titleId: 'Komunitas yang Kuat',
          subtitle: 'Over 500 Indonesian students supporting each other across Auckland.',
          subtitleId: 'Lebih dari 500 pelajar Indonesia yang saling mendukung di seluruh Auckland.',
          content: null,
          linkUrl: null,
          linkText: null,
          imageUrl: null,
          iconName: 'Users',
          color: '#E8231A',
          order: 0,
          enabled: true,
        },
        {
          type: 'FEATURE' as const,
          title: 'Wide Network',
          titleId: 'Jaringan Luas',
          subtitle: 'Connect with Indonesian alumni and professionals throughout New Zealand.',
          subtitleId: 'Terhubung dengan alumni dan profesional Indonesia di seluruh Selandia Baru.',
          content: null,
          linkUrl: null,
          linkText: null,
          imageUrl: null,
          iconName: 'Globe',
          color: '#3B82F6',
          order: 1,
          enabled: true,
        },
        {
          type: 'FEATURE' as const,
          title: 'Quality Events',
          titleId: 'Acara Berkualitas',
          subtitle: 'From academic seminars to cultural celebrations — there\'s always something on.',
          subtitleId: 'Dari seminar akademik hingga perayaan budaya — selalu ada sesuatu yang menarik.',
          content: null,
          linkUrl: null,
          linkText: null,
          imageUrl: null,
          iconName: 'Star',
          color: '#8B5CF6',
          order: 2,
          enabled: true,
        },
        {
          type: 'FEATURE' as const,
          title: 'Helpful Resources',
          titleId: 'Sumber Daya Berguna',
          subtitle: 'Scholarships, career guidance, and support for your academic journey.',
          subtitleId: 'Beasiswa, panduan karir, dan dukungan untuk perjalanan akademikmu.',
          content: null,
          linkUrl: null,
          linkText: null,
          imageUrl: null,
          iconName: 'BookOpen',
          color: '#10B981',
          order: 3,
          enabled: true,
        },
      ],
    },
    {
      key: 'video',
      title: 'Watch Our Story',
      titleId: 'Tonton Cerita Kami',
      subtitle: 'Discover the PPIA Experience',
      subtitleId: 'Temukan Pengalaman PPIA',
      description: null,
      descriptionId: null,
      enabled: true,
      order: 2,
      blocks: [
        {
          type: 'VIDEO' as const,
          title: 'PPIA Auckland 2024 Recap',
          titleId: 'Rangkuman PPIA Auckland 2024',
          subtitle: null,
          subtitleId: null,
          content: null,
          linkUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Placeholder - replace with actual video
          linkText: null,
          linkTextId: null,
          imageUrl: null,
          iconName: null,
          color: '#E8231A',
          order: 0,
          enabled: true,
          config: { thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg' },
        },
      ],
    },
    {
      key: 'events',
      title: 'Upcoming Events',
      titleId: 'Acara Mendatang',
      subtitle: 'Join Our Community Activities',
      subtitleId: 'Ikuti Kegiatan Komunitas Kami',
      description: null,
      descriptionId: null,
      enabled: true,
      order: 3,
      blocks: [],
      // Events are fetched from API, so no blocks needed
    },
    {
      key: 'articles',
      title: 'Latest News',
      titleId: 'Berita Terbaru',
      subtitle: 'Stories from Our Community',
      subtitleId: 'Cerita dari Komunitas Kami',
      description: null,
      descriptionId: null,
      enabled: true,
      order: 4,
      blocks: [],
      // Articles are fetched from API, so no blocks needed
    },
    {
      key: 'membership',
      // The whole heading lives here; `config.titleHighlight` names the run of
      // words inside it that gets the accent gradient.
      title: 'Become part of the PPIA Family',
      titleId: 'Menjadi bagian dari PPIA Family',
      subtitle: null,
      subtitleId: null,
      description: 'Free for all Indonesian students currently studying in Auckland. Register and enjoy every benefit of being a member.',
      descriptionId: 'Gratis untuk semua pelajar Indonesia yang sedang belajar di Auckland. Daftar dan nikmati semua manfaat menjadi anggota.',
      enabled: true,
      order: 5,
      config: {
        badge: 'Membership',
        titleHighlight: 'PPIA Family',
        cardTitle: 'PPIA Auckland',
        cardBadge: 'FREE',
        cardBadgeSubtitle: 'for active students',
      },
      blocks: [
        {
          type: 'CTA_BUTTON' as const,
          title: 'Register Now',
          subtitle: null,
          content: null,
          linkUrl: '/register',
          linkText: 'Register Now',
          linkTextId: 'Daftar Sekarang',
          imageUrl: null,
          iconName: null,
          color: null,
          order: 0,
          enabled: true,
          config: { variant: 'primary' },
        },
        {
          type: 'CTA_BUTTON' as const,
          title: 'Learn More',
          subtitle: null,
          content: null,
          linkUrl: '/about',
          linkText: 'Learn More',
          linkTextId: 'Pelajari Lebih Lanjut',
          imageUrl: null,
          iconName: null,
          color: null,
          order: 1,
          enabled: true,
          config: { variant: 'secondary' },
        },
        // Member benefits — the ticked list beside the membership card.
        { type: 'FEATURE' as const, title: 'Access to all exclusive PPIA events', titleId: 'Akses ke semua acara eksklusif PPIA', subtitle: null, content: null, linkUrl: null, linkText: null, imageUrl: null, iconName: 'Calendar', color: null, order: 2, enabled: true },
        { type: 'FEATURE' as const, title: 'A network of 500+ Indonesian students', titleId: 'Jaringan 500+ pelajar Indonesia', subtitle: null, content: null, linkUrl: null, linkText: null, imageUrl: null, iconName: 'Users', color: null, order: 3, enabled: true },
        { type: 'FEATURE' as const, title: 'Scholarship and job opportunity updates', titleId: 'Info beasiswa & peluang kerja', subtitle: null, content: null, linkUrl: null, linkText: null, imageUrl: null, iconName: 'GraduationCap', color: null, order: 4, enabled: true },
        { type: 'FEATURE' as const, title: 'A living and study guide for Auckland', titleId: 'Panduan tinggal & belajar di Auckland', subtitle: null, content: null, linkUrl: null, linkText: null, imageUrl: null, iconName: 'BookOpen', color: null, order: 5, enabled: true },
      ],
    },
    // ─── New sections (added to enrich the landing page) ────────────
    // No `partners` section is seeded on purpose. A partner logo asserts a
    // relationship with a named third party, so that list has to come from
    // someone who knows which agreements actually exist. Add it from the CMS.
    {
      key: 'testimonials',
      title: 'What Members Say',
      titleId: 'Kata Mereka',
      subtitle: 'Real stories from our community',
      subtitleId: 'Kisah nyata dari komunitas kami',
      description: null,
      descriptionId: null,
      enabled: true,
      order: 7,
      config: { titleHighlight: 'our community' },
      /**
       * No sample quotes are seeded, on purpose.
       *
       * This section previously shipped three testimonials with invented names.
       * A quote attributed to a named person has to come from that person —
       * seeded examples end up published as genuine social proof. Add real ones
       * from the CMS; the section renders nothing while it is empty.
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
      description: null,
      descriptionId: null,
      enabled: true,
      order: 8,
      blocks: [
        { type: 'FAQ' as const, title: 'Is PPIA membership free?', subtitle: null, content: 'Yes — membership is completely free for all Indonesian students currently studying in Auckland, regardless of university or degree level.', linkUrl: null, linkText: null, imageUrl: null, iconName: null, color: null, order: 0, enabled: true },
        { type: 'FAQ' as const, title: 'Do I need to be enrolled at a specific university?', subtitle: null, content: 'No. We welcome students from all Auckland institutions — University of Auckland, AUT, Massey (Albany campus), and any other accredited institution.', linkUrl: null, linkText: null, imageUrl: null, iconName: null, color: null, order: 1, enabled: true },
        { type: 'FAQ' as const, title: 'What kind of events does PPIA organise?', subtitle: null, content: 'Everything from academic workshops and career networking to cultural nights, sports days, and social hangouts. We run 20+ events per year.', linkUrl: null, linkText: null, imageUrl: null, iconName: null, color: null, order: 2, enabled: true },
        { type: 'FAQ' as const, title: 'How do I register?', subtitle: null, content: "Click \"Register\" in the navigation bar, fill in the short form, and you're done. An admin will approve your account within 1-2 business days.", linkUrl: null, linkText: null, imageUrl: null, iconName: null, color: null, order: 3, enabled: true },
      ],
    },
  ];

  // ========================================
  // MENU CONFIGURATION
  // ========================================

  const menuItems = [
    {
      key: 'header_main',
      enabled: true,
      items: {
        en: [
          {
            label: 'About',
            href: '/about',
            children: [
              { label: 'Ambition & Action', href: '/about/ambition-action' },
              { label: 'Cabinet', href: '/about/cabinet' },
              { label: 'Historical Archive', href: '/about/historical-archive' },
            ],
          },
          {
            label: 'Activities',
            href: '/activities',
            children: [
              { label: 'Events', href: '/activities/events' },
              { label: 'News & Articles', href: '/activities/news-articles' },
              { label: 'Research Corner', href: '/activities/research-corner' },
              { label: 'Ad Art', href: '/activities/ad-art' },
            ],
          },
          {
            label: 'Opportunities',
            href: '/opportunities',
            children: [],
          },
          {
            label: 'PEMIRA',
            href: '/pemira',
            children: [],
          },
        ],
        id: [
          {
            label: 'Tentang',
            href: '/about',
            children: [
              { label: 'Ambigr & Aksi', href: '/about/ambition-action' },
              { label: 'Kabinet', href: '/about/cabinet' },
              { label: 'Arsip Sejarah', href: '/about/historical-archive' },
            ],
          },
          {
            label: 'Aktivitas',
            href: '/activities',
            children: [
              { label: 'Acara', href: '/activities/events' },
              { label: 'Berita & Artikel', href: '/activities/news-articles' },
              { label: 'Pojok Riset', href: '/activities/research-corner' },
              { label: 'Ad Art', href: '/activities/ad-art' },
            ],
          },
          {
            label: 'Kesempatan',
            href: '/opportunities',
            children: [],
          },
          {
            label: 'PEMIRA',
            href: '/pemira',
            children: [],
          },
        ],
      },
    },
    {
      key: 'footer_about',
      enabled: true,
      items: {
        en: [
          { label: 'Ambition & Action', href: '/about/ambition-action' },
          { label: 'Cabinet', href: '/about/cabinet' },
          { label: 'Historical Archive', href: '/about/historical-archive' },
        ],
        id: [
          { label: 'Ambigr & Aksi', href: '/about/ambition-action' },
          { label: 'Kabinet', href: '/about/cabinet' },
          { label: 'Arsip Sejarah', href: '/about/historical-archive' },
        ],
      },
    },
    {
      key: 'footer_activities',
      enabled: true,
      items: {
        en: [
          { label: 'Events', href: '/activities/events' },
          { label: 'News & Articles', href: '/activities/news-articles' },
          { label: 'Research Corner', href: '/activities/research-corner' },
        ],
        id: [
          { label: 'Acara', href: '/activities/events' },
          { label: 'Berita & Artikel', href: '/activities/news-articles' },
          { label: 'Pojok Riset', href: '/activities/research-corner' },
        ],
      },
    },
    {
      key: 'footer_quicklinks',
      enabled: true,
      items: {
        en: [
          { label: 'Register', href: '/register' },
          { label: 'Contact Us', href: '/contact' },
          { label: 'FAQ', href: '/faq' },
        ],
        id: [
          { label: 'Daftar', href: '/register' },
          { label: 'Hubungi Kami', href: '/contact' },
          { label: 'FAQ', href: '/faq' },
        ],
      },
    },
  ];

  // ========================================
  // SITE CONFIGURATION
  // ========================================

  const siteConfigs = [
    {
      key: 'header',
      config: {
        logoUrl: '/logo.svg',
        logoAlt: 'PPIA Auckland',
        contactEmail: 'info@ppiaklan.org',
        contactPhone: '+64 21 123 4567',
        showSearch: true,
        showLanguageToggle: true,
      },
    },
    {
      key: 'footer',
      config: {
        logoUrl: '/logo.svg',
        logoAlt: 'PPIA Auckland',
        description: 'The home of Indonesian students in Auckland, New Zealand.',
        descriptionId: 'Rumah bagi pelajar Indonesia di Auckland, Selandia Baru.',
        address: 'Auckland, New Zealand',
        email: 'info@ppiaklan.org',
        phone: '+64 21 123 4567',
        copyrightText: '© {year} PPIA Auckland. All rights reserved.',
      },
    },
    {
      /**
       * Theme colours read by `use-landing-colors`. The hook falls back to the
       * same values when this row is absent, so seeding it changes nothing
       * visually — it exists so the palette is editable in the CMS rather than
       * only in code.
       */
      key: 'colors',
      config: {
        primary: '#1A2B4A',
        accent: '#E8231A',
        textAccent: '#E8231A',
        buttonPrimary: '#E8231A',
        buttonSecondary: '#1A2B4A',
      },
    },
    {
      key: 'social',
      config: {
        instagram: 'https://instagram.com/ppiauckland',
        linkedin: 'https://linkedin.com/company/ppiauckland',
        youtube: 'https://youtube.com/@ppiauckland2025',
        tiktok: 'https://tiktok.com/@ppiauckland',
        facebook: 'https://facebook.com/ppiaklan',
      },
    },
  ];

  // ========================================
  // SEED PROCESS
  // ========================================

  console.log('Seeding landing sections...\n');

  for (const sectionData of sections) {
    const { blocks, ...sectionInfo } = sectionData;

    const section = await prisma.landingSection.upsert({
      where: { key: sectionInfo.key },
      update: sectionInfo,
      create: sectionInfo,
    });

    console.log(`✓ Section: ${section.key}`);

    // Delete existing blocks and recreate
    await prisma.sectionBlock.deleteMany({
      where: { sectionId: section.id },
    });

    for (const blockData of blocks) {
      await prisma.sectionBlock.create({
        data: {
          ...blockData,
          sectionId: section.id,
        },
      });
    }
  }

  console.log('\nSeeding menu items...\n');

  for (const menuData of menuItems) {
    await prisma.menuItem.upsert({
      where: { key: menuData.key },
      update: {
        items: menuData.items,
        enabled: menuData.enabled,
      },
      create: {
        key: menuData.key,
        items: menuData.items,
        enabled: menuData.enabled,
      },
    });
    console.log(`✓ Menu: ${menuData.key}`);
  }

  console.log('\nSeeding site configuration...\n');

  for (const configData of siteConfigs) {
    await prisma.siteConfig.upsert({
      where: { key: configData.key },
      update: {
        config: configData.config,
      },
      create: {
        key: configData.key,
        config: configData.config,
      },
    });
    console.log(`✓ Config: ${configData.key}`);
  }

  console.log('\n✅ Seeding completed successfully!');
  console.log('\nSummary:');
  console.log(`  - ${sections.length} landing sections`);
  console.log(`  - ${sections.reduce((acc, s) => acc + s.blocks.length, 0)} section blocks`);
  console.log(`  - ${menuItems.length} menu configurations`);
  console.log(`  - ${siteConfigs.length} site configurations`);
}

main()
  .catch((e) => {
    console.error('\n❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
