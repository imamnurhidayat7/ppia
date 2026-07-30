/**
 * Page content for seeding the CMS database.
 *
 * This file contains the FULL content (header + body) for every static page.
 * Icons are stored as string names (e.g. "Mail") so they can be edited in the
 * page builder without code changes. Each page's front-end maps these strings
 * back to lucide-react components via an ICON_MAP.
 *
 * Used by seed-all-pages.ts to populate the `Page.content` JSON column.
 */

import { wikiPpiaContent } from './wiki-ppia-content';

// ============================================
// about/cabinet (template: division_grid)
// ============================================
export const cabinetContent = {
  header: {
    label: 'About PPIA',
    title: 'Our',
    titleAccent: 'Cabinet',
    description:
      "Meet the dedicated team driving PPIA Auckland's mission — organized across internal and external divisions.",
    breadcrumbs: [{ label: 'About' }, { label: 'Cabinet' }],
  },
  /**
   * The first card on the page is the head count, calculated from `leaders` and
   * the division rosters. Only the three cards after it come from here.
   */
  stats: [
    { valueStatic: '7', valueLabel: 'Divisions' },
    { valueStatic: '2', valueLabel: 'Vice Presidents' },
    { valueStatic: '1', valueLabel: 'Shared Mission' },
  ],
  leadershipSection: {
    label: 'Leadership',
    title: 'Who',
    titleAccent: 'Leads',
    description: 'The office bearers accountable for PPIA Auckland this term.',
  },
  divisionsSection: {
    label: 'Divisions',
    title: 'The',
    titleAccent: 'Divisions',
    description:
      'Each division owns a part of what PPIA Auckland does, from day-to-day administration to outside partnerships.',
  },
  cta: {
    title: 'Want to Join the Team?',
    description:
      "We're always looking for passionate students to contribute. Reach out to learn about open positions.",
    buttonText: 'Get Involved',
    buttonHref: '/contact',
  },
  /**
   * Office bearers.
   *
   * `tier: 'chair'` renders large and on its own; everyone else appears in the
   * executive row below, in array order. Array order is the display order, so
   * the two vice presidents come before the secretaries and treasury to match
   * the organisation chart.
   *
   * `photo` is empty until someone uploads one; the page renders initials.
   */
  leaders: [
    { name: 'John Badawi', role: 'President', tier: 'chair', photo: '', major: '', quote: '', email: '' },
    { name: 'Ilham', role: 'VP Internal', tier: 'executive', photo: '', major: '', quote: '', email: '' },
    { name: 'Bima', role: 'VP External', tier: 'executive', photo: '', major: '', quote: '', email: '' },
  ],
  /**
   * How the divisions are grouped, in render order.
   *
   * Secretariat and Treasury are divisions rather than single office bearers,
   * because both carry their own staff. They sit in their own group instead of
   * under either vice president, matching the reporting lines.
   */
  divisionGroups: [
    {
      key: 'core',
      label: 'Reporting to the President',
      description: 'Divisions that support the organisation as a whole rather than one portfolio.',
    },
    {
      key: 'internal',
      label: 'Under the VP Internal',
      description: 'Divisions focused inward, on members and their experience.',
    },
    {
      key: 'external',
      label: 'Under the VP External',
      description: 'Divisions that deal with partners, audiences and the wider community.',
    },
  ],
  /**
   * Each division has a head and a vice head, plus any further staff in
   * `members`. Those staff lists are intentionally empty — the organisation
   * chart names the leads only, and inventing member names would publish people
   * who do not exist. Fill them in from the CMS.
   */
  divisions: [
    {
      id: 'secretariat',
      name: 'Secretariat',
      group: 'core',
      color: '#0EA5E9',
      desc: 'Keeps records, handles correspondence, and runs the administration behind every activity.',
      // The chart shows two secretaries at the same level rather than a head and
      // a deputy, so both occupy a lead slot and share the same role label.
      head: { name: 'Atika', role: 'Secretary', photo: '' },
      deputy: { name: 'Dhila', role: 'Secretary', photo: '' },
      members: [],
    },
    {
      id: 'treasury',
      name: 'Treasury',
      group: 'core',
      color: '#14B8A6',
      desc: 'Manages the budget, reimbursements, and financial reporting for the committee.',
      head: { name: 'Oktavi Tata', role: 'Treasurer', photo: '' },
      deputy: { name: 'Fajar', role: 'Vice Treasurer', photo: '' },
      members: [],
    },
    {
      id: 'education',
      name: 'Education',
      group: 'internal',
      color: '#3B82F6',
      desc: 'Runs academic programmes, study support, and knowledge sharing between members.',
      head: { name: 'Alifah', role: 'Head of Education', photo: '' },
      deputy: { name: 'Safan', role: 'Vice Division Head', photo: '' },
      members: [],
    },
    {
      id: 'well-being',
      name: 'Well-being',
      group: 'internal',
      color: '#10B981',
      desc: 'Looks after member welfare, pastoral support, and community care.',
      head: { name: 'Rizka', role: 'Head of Well-being', photo: '' },
      deputy: { name: 'Emir', role: 'Vice Division Head', photo: '' },
      members: [],
    },
    {
      id: 'pr-sponsor',
      name: 'PR & Sponsorship',
      group: 'external',
      color: '#F59E0B',
      desc: 'Manages external partnerships, sponsorships, and public communications.',
      head: { name: 'Bagus', role: 'Head of PR & Sponsor', photo: '' },
      deputy: { name: 'Olivia', role: 'Vice Division Head', photo: '' },
      members: [],
    },
    {
      id: 'digicom',
      name: 'Digital Communications',
      group: 'external',
      color: '#8B5CF6',
      desc: 'Produces content and runs PPIA Auckland’s digital channels.',
      head: { name: 'Rimanda', role: 'Head of Digicom', photo: '' },
      deputy: { name: 'Nadela', role: 'Vice Division Head', photo: '' },
      members: [],
    },
    {
      id: 'commdev',
      name: 'Community Development',
      group: 'external',
      color: '#EC4899',
      desc: 'Builds the community through events, outreach, and member engagement.',
      head: { name: 'Aqila', role: 'Head of CommDev', photo: '' },
      deputy: { name: 'Raihan', role: 'Vice Division Head', photo: '' },
      members: [],
    },
  ],
};

// ============================================
// about/historical-archive (template: timeline)
// ============================================
export const historicalArchiveContent = {
  header: {
    label: 'About PPIA',
    title: 'Historical',
    titleAccent: 'Archive',
    description:
      'Journey through the milestones that shaped PPIA Auckland into what it is today.',
    breadcrumbs: [{ label: 'About' }, { label: 'Historical Archive' }],
  },
  timelineSection: {
    label: 'Our Journey',
    title: 'Milestones Through',
    titleAccent: 'the Years',
    description:
      'From humble beginnings to a thriving community — every milestone tells a story of growth and connection.',
  },
  cta: {
    title: 'Part of Our Story?',
    description:
      'If you have photos, stories, or milestones to share, we would love to hear from you.',
    buttonText: 'Share Your Story',
    buttonHref: '/contact',
  },
  documents: [
    {
      icon: 'BookOpen',
      label: 'Grand Design',
      title: 'Grand Design PPIA Auckland 2024',
      sub: 'Strategic direction document',
      color: '#E8231A',
      href: '/Grand-Design-PPI-Auckland-2024.pdf',
      target: '_blank',
    },
    {
      icon: 'Archive',
      label: 'Archive',
      title: 'PPIA Auckland AD & ART',
      sub: 'Governance and constitution',
      color: '#3B82F6',
      href: '/about/ad-art',
    },
    {
      icon: 'Calendar',
      label: 'History',
      title: 'Cabinet History',
      sub: 'Past cabinet structures',
      color: '#10B981',
      href: '/about/cabinet',
    },
  ],
  milestones: [
    {
      year: '2019',
      title: 'The Beginning',
      desc: 'PPIA Auckland was founded by a small group of passionate Indonesian students.',
      color: '#E8231A',
    },
    {
      year: '2020',
      title: 'Going Digital',
      desc: 'Adapted to virtual events and expanded online presence during global changes.',
      color: '#3B82F6',
    },
    {
      year: '2021',
      title: 'Community Growth',
      desc: 'Launched new programs and welcomed a record number of new members.',
      color: '#10B981',
    },
    {
      year: '2022',
      title: 'Cultural Renaissance',
      desc: 'Hosted the largest Indonesian cultural showcase in Auckland to date.',
      color: '#F59E0B',
    },
    {
      year: '2023',
      title: 'Community Milestone',
      desc: 'Reached 500+ active members across Auckland universities, marking a new chapter of growth.',
      color: '#06B6D4',
    },
    {
      year: '2024',
      title: 'Grand Design 2024',
      desc: 'Released the organizational Grand Design document outlining strategic direction for the year.',
      color: '#EC4899',
    },
    {
      year: '2025',
      title: 'New Era',
      desc: 'Launched new initiatives focused on digital transformation and member engagement.',
      color: '#8B5CF6',
    },
  ],
};

// ============================================
// about/ambition-action (template: ambition_action)
// ============================================
export const ambitionActionContent = {
  header: {
    label: 'About PPIA',
    title: 'Ambition &',
    titleAccent: 'Action',
    description:
      'Our philosophy, direction, and commitment to every Indonesian student in Auckland.',
    breadcrumbs: [{ label: 'About' }, { label: 'Ambition & Action' }],
  },
  sectionLabel: 'Our Philosophy',
  // The public page reads `sectionTitle` + `sectionTitleAccent` + `sectionIntro`.
  // This used to seed `sectionSubtitle`, which the page never reads, so the
  // intro paragraph rendered empty.
  sectionTitle: 'Trías',
  sectionTitleAccent: 'Harmonía',
  sectionIntro:
    'PPIA Auckland operates under a three-pillar integration model — a harmony of Education, Entrepreneurship, and Well-being. Each pillar supports the others, creating a balanced foundation for students to flourish both academically and personally.',
  pillars: [
    {
      icon: 'Lightbulb',
      title: 'Education',
      color: '#3B82F6',
      desc: 'Empowering students through academic support, peer mentoring, and knowledge-sharing initiatives.',
    },
    {
      icon: 'Target',
      title: 'Entrepreneurship',
      color: '#E8231A',
      desc: 'Fostering innovation and enterprise — connecting students with opportunities to build and create.',
    },
    {
      icon: 'Heart',
      title: 'Well-being',
      color: '#10B981',
      desc: 'Supporting mental, social, and physical health through community events and wellness programs.',
    },
  ],
  ambitionLabel: 'Our Ambition',
  ambitionQuote:
    'Creating an open and supportive environment between students to build a harmonious PPIA Auckland that has a positive impact on society.',
  ambitionQuoteAccent: 'positive impact on society.',
  ctaTitle: "Don't Be Alone in Auckland!",
  ctaDescription: "Join our community — it's free for all Indonesian students.",
  ctaButtonText: 'Join PPIA',
  ctaButtonUrl: '/register',
};

// ============================================
// about/ad-art (template: legal_document)
// ============================================
export const adArtContent = {
  header: {
    label: 'About PPIA',
    title: 'AD /',
    titleAccent: 'ART',
    description:
      'Anggaran Dasar dan Anggaran Rumah Tangga — the governing constitution of PPIA Auckland.',
    breadcrumbs: [{ label: 'About' }, { label: 'AD/ART' }],
  },
  preamble:
    'Dalam rangka membangun dan mempererat kebersamaan antarpelajar Indonesia yang belajar di kota Auckland, kami segenap pelajar secara bersama-sama membuat suatu himpunan pelajar. Himpunan ini dibuat dengan berasaskan Pancasila dan berlandaskan Undang-Undang Dasar Negara Republik Indonesia tahun 1945 yang untuk selanjutnya pada dokumen ini disebut dengan Perhimpunan Pelajar Indonesia di Auckland atau PPI Auckland. Pendirian dan pelaksanaan PPI Auckland sebagai suatu badan organisasi, diatur dalam Anggaran Dasar dan Anggaran Rumah Tangga (AD-ART) organisasi PPI Auckland sebagaimana diatur dalam dokumen ini. Tujuan pendirian dan pelaksanaan himpunan pelajar PPI Auckland adalah untuk menjadi wadah berkumpul dan penyaluran aspirasi pelajar, memberikan manfaat kepada pelajar Indonesia di Auckland secara khusus, dan juga masyarakat Indonesia di Auckland secara umum, serta memperkuat relasi antara Indonesia dan Selandia baru.',
  adArticles: [
    {
      id: 'bab-1',
      chapter: 'BAB I',
      title: 'Nama dan Tempat Kedudukan',
      articles: [
        {
          num: 'Pasal 1',
          title: 'Nama',
          content: 'Organisasi ini bernama Perhimpunan Pelajar Indonesia di Auckland atau yang disingkat dengan nama PPI Auckland, atau dalam bahasa Inggris disebut Auckland Indonesia Student Association atau disingkat AISA.',
        },
        {
          num: 'Pasal 2',
          title: 'Bentuk dan Sifat',
          content: 'PPI Auckland berbentuk organisasi Perhimpunan Pelajar Indonesia di kota Auckland, Selandia Baru.\nPPI Auckland merupakan organisasi nirlaba yang bersifat independen, terbuka, akademis, demokratis, tidak terafiliasi organisasi politik atau organisasi keagamaan manapun, dan menjunjung tinggi nilai kekeluargaan sesuai dengan nilai-nilai Pancasila dan Undang-Undang Dasar Negara Republik Indonesia tahun 1945.\nPPI Auckland merupakan anggota konfederasi dari Perhimpunan Pelajar Indonesia Selandia Baru atau yang disingkat dengan nama PPI Selandia baru, yang merupakan anggota dari Perhimpunan Pelajar Indonesia Dunia yang disingkat PPI Dunia. PPI Dunia disahkan dan terdaftar sebagai organisasi berdasarkan Akta Pendirian Badan Hukum Nomor 2 tanggal 4 Juli 2020.\nPPI Auckland merupakan salah satu mitra kerja Kedutaan Besar Republik Indonesia untuk Selandia Baru di Wellington.',
        },
        {
          num: 'Pasal 3',
          title: 'Kedudukan',
          content: 'PPI Auckland berkedudukan di kota Auckland, Selandia Baru.',
        },
        {
          num: 'Pasal 4',
          title: 'Kedaulatan',
          content: 'Kedaulatan PPI Auckland ada di tangan anggota dan dilaksanakan oleh alat kelengkapan organisasi sesuai dengan ketentuan Anggaran Dasar dan Anggaran Rumah Tangga (untuk selanjutnya disebut dengan AD-ART).',
        },
        {
          num: 'Pasal 5',
          title: 'Waktu',
          content: 'PPI Auckland diresmikan melalui AD-ART pada tanggal 28 Oktober 2018 di Auckland, Selandia Baru, untuk jangka waktu yang tidak ditentukan.',
        },
        {
          num: 'Pasal 6',
          title: 'Lambang',
          content: 'Lambang organisasi PPI Auckland adalah sebagai berikut:\n2. Arti dan makna lambang:\nLayar kapal sebagai penanda Auckland sebagai “city of sails”.\nMotif batik di atas layar kapal sebagai penggambaran budaya Indonesia yang mengarungi kota Auckland.\nWarna merah dan putih melambangkan warna bendera Indonesia.',
        },
      ],
    },
    {
      id: 'bab-2',
      chapter: 'BAB II',
      title: 'Asas dan Tujuan',
      articles: [
        {
          num: 'Pasal 7',
          title: 'Asas',
          content: 'PPI Auckland berlandaskan Pancasila dan UUD 1945.',
        },
        {
          num: 'Pasal 8',
          title: 'Tujuan',
          content: 'Menjadi wadah komunikasi dan informasi bagi seluruh anggotanya.\nMemupuk rasa persatuan, kesatuan, setia kawan dalam suasana kekeluargaan.\nMembina hubungan baik dengan masyarakat internasional pada umumnya dan masyarakat Auckland pada khususnya.\nMengembangkan dan mengenalkan ilmu pengetahuan terkini untuk kepentingan bersama, khususnya untuk masyarakat Indonesia.\nMemperkenalkan dan mempromosikan budaya nasional Indonesia.\nMenjaga nama baik bangsa dan membina rasa cinta tanah air.\nMenjadi media penghubung dengan pelajar Indonesia di luar Auckland secara khusus dan Selandia Baru secara umum.',
        },
      ],
    },
    {
      id: 'bab-3',
      chapter: 'BAB III',
      title: 'Perangkat Organisasi',
      articles: [
        {
          num: 'Pasal 9',
          title: 'Alat Kelengkapan Organisasi',
          content: 'Alat kelengkapan organisasi PPI Auckland terdiri dari:\nKetua Umum dan Badan Eksekutif;\nBadan Pelaksana Harian PPI Auckland; dan\nDewan Pengawas.\n2. Alat kelengkapan organisasi bersifat saling mendukung kelengkapan organisasi yang berjalan sesuai dengan AD-ART.\n3. Pengaturan lebih lanjut tentang alat kelengkapan organisasi sebagaimana dimaksud pada ayat (1) diatur dalam Anggaran Rumah Tangga.',
        },
        {
          num: 'Pasal 10',
          title: 'Hierarki Keputusan',
          content: 'Hierarki keputusan yang berlaku untuk alat kelengkapan organisasi PPI Auckland adalah sebagai berikut (mulai dari yang tertinggi):\nAD-ART\nKetetapan Kongres PPI Auckland\nKeputusan Ketua Umum PPI Auckland',
        },
      ],
    },
    {
      id: 'bab-4',
      chapter: 'BAB IV',
      title: 'Keanggotaan',
      articles: [
        {
          num: 'Pasal 11',
          title: 'Definisi Anggota',
          content: 'Anggota PPI Auckland adalah pelajar Indonesia di Auckland yang telah terdaftar melalui form keanggotaan yang disebarkan oleh pengurus PPI Auckland.\nPelajar yang dimaksud pada ayat (1) adalah Warga Negara Indonesia atau keturunan Indonesia hingga 2 (dua) generasi, yang terdaftar sebagai pelajar pada salah satu lembaga Sekolah Menengah Atas atau setara, perguruan tinggi, dan/atau institusi pendidikan atau pengajaran yang setara dan bertempat tinggal di Kota Auckland.',
        },
        {
          num: 'Pasal 12',
          title: 'Kewajiban Anggota',
          content: 'Setiap anggota PPI Auckland mempunyai kewajiban:\nMenjunjung tinggi dan menjaga nama baik PPI Auckland;\nBerusaha mencapai tujuan PPI Auckland;\nMenaati dan melaksanakan seluruh peraturan yang berlaku dalam PPI Auckland; dan\nAnggota PPI Auckland dilarang membawa nama PPI Auckland dalam kegiatan organisasi politik dan/atau afiliasi partai politik maupun organisasi keagamaan untuk kepentingan pribadi, maupun kelompok yang bertentangan dengan peraturan perundang-undangan Republik Indonesia.',
        },
        {
          num: 'Pasal 13',
          title: 'Hak Anggota',
          content: 'Setiap anggota PPI Auckland mempunyai hak:\nMendapatkan informasi mengenai kegiatan PPI Auckland;\nTerlibat dalam penyusunan dan/atau pelaksanaan kegiatan PPI Auckland;\nMenghadiri, menyatakan pendapat, dan memberikan suara secara bebas dalam kegiatan PPI Auckland;\nMendapatkan surat keterangan keanggotaan PPI Auckland apabila diperlukan;\nMendaftarkan diri untuk berpartisipasi dalam kepengurusan PPI Auckland.',
        },
      ],
    },
    {
      id: 'bab-5',
      chapter: 'BAB V',
      title: 'Permusyawarahan Organisasi',
      articles: [
        {
          num: 'Pasal 14',
          title: 'Musyawarah Organisasi',
          content: 'Jenis dan susunan musyawarah organisasi PPI Auckland terdiri dari:\nKongres PPI Auckland;\nRapat Anggota PPI Auckland; dan\nKongres Luar Biasa.\nDefinisi jenis musyawarah organisasi diatur dalam Anggaran Rumah Tangga Bab V (lima)\nKongres PPI Auckland dianggap sah apabila dihadiri oleh kuorum yang terdiri dari sekurangkurangnya 80% perwakilan setiap jenjang pendidikan yang terdaftar sebagai anggota PPI Auckland dan telah melakukan registrasi kehadiran Kongres, serta seluruh Badan Pelaksana Harian PPI Auckland masa berjalan.\nKehadiran sebagaimana dimaksud pada ayat (3) dapat dilakukan melalui kehadiran langsung maupun daring.\nMusyawarah dalam hal pengambilan keputusan terkait kongres yang berjalan, sekurang- kurangnya disetujui oleh 2/3 (dua per tiga) kuorum sebagaimana dimaksud pada ayat (3)\nApabila dalam pengambilan keputusan kuorum tidak terpenuhi, maka musyawarah ditunda sampai waktu yang ditentukan oleh alat kelengkapan PPI Auckland.\nMusyawarah lanjutan yang diadakan karena kuorum pada musyawarah sebelumnya tidak terpenuhi, sesuai ayat (6) di atas, maka musyawarah lanjutan tidak memiliki kuorum.\nPengambilan keputusan dalam musyawarah lanjutan dilaksanakan dengan sistem pemufakatan seluruh anggota yang hadir. Namun, apabila mufakat tidak tercapai, keputusan diambil berdasarkan sistem pengambilan suara terbanyak dari anggota musyawarah lanjutan yang hadir (voting).',
        },
      ],
    },
    {
      id: 'bab-6',
      chapter: 'BAB VI',
      title: 'Keuangan',
      articles: [
        {
          num: 'Pasal 15',
          title: 'Asas Dasar Keuangan',
          content: 'Asas dasar keuangan memperhatikan peraturan perundang-undangan Republik Indonesia maupun peraturan negara dan/atau wilayah di Selandia Baru.\nKeuangan PPI Auckland diperoleh dari sumbangan-sumbangan yang tidak mengikat atau usaha-usaha lain yang sah dan tidak bertentangan dengan asas dan tujuan PPI Auckland.\nKeuangan PPI Auckland wajib dikelola secara transparan dan akuntabel melalui laporan pertanggung jawaban saat Kongres PPI Auckland sebagaimana diatur dalam Anggaran Rumah Tangga.',
        },
        {
          num: 'Pasal 16',
          title: 'Pertanggungjawaban',
          content: 'Segala macam bentuk pengelolaan dan penggunaan keuangan wajib dipertanggungjawabkan kepada anggota melalui mekanisme yang ditentukan dalam Anggaran Rumah Tangga.\nApabila dalam proses pengelolaan dan penggunaan kekayaan terjadi kerugian/kepailitan maka perlu dilaksanakan Kongres Luar Biasa untuk mengidentifikasi penyebab kerugian/kepailitan dan menentukan konsekuensi atas kerugian/kepailitan tersebut.\nKerugian/kepailitan yang terbukti disebabkan oleh kelalaian kepengurusan, kerugian/kepailitan tersebut menjadi tanggung jawab alat kelengkapan organisasi PPI Auckland yang bersangkutan.\nKerugian/kepailitan yang terbukti tidak disebabkan oleh kelalaian kepengurusan, namun disebabkan oleh keadaan tertentu di luar kesengajaan (force majeur), kerugian/kepailitan tersebut menjadi tanggung jawab PPI Auckland secara kolektif (mencakup alat kelengkapan dan anggota) yang diputuskan secara musyawarah.\nApabila terindikasi adanya penyalahgunaan kekuasaan oleh alat kelengkapan PPI Auckland masa berjalan, maka perlu dilaksanakan Kongres Luar Biasa untuk melakukan klarifikasi atas tindakan yang dilakukan serta menentukan konsekuensi atas penyalahgunaan kekuasaan tersebut.',
        },
      ],
    },
    {
      id: 'bab-7',
      chapter: 'BAB VII',
      title: 'Perubahan dan Pembubaran',
      articles: [
        {
          num: 'Pasal 17',
          title: 'Perubahan AD-ART',
          content: 'AD-ART hanya dapat diubah oleh Kongres PPI Auckland dan disepakati oleh sekurang-kurangnya 2/3 (dua per tiga) dari jumlah kuorum yang hadir.\nPerubahan AD-ART dilakukan apabila memenuhi satu alasan dan/atau memenuhi seluruh alasan:\nTerdapat ketentuan AD-ART yang secara nyata dapat menimbulkan kerugian terhadap satu atau lebih anggota;\nPerlunya penambahan klausul pada ketentuan AD-ART untuk menyelesaikan suatu masalah organisasi;\nTerdapat hasil rekomendasi dari Rapat Anggota PPI Auckland;\nTerdapat perubahan keadaan-keadaan di luar organisasi yang berdampak pada ketentuan yang tidak relevan dalam AD-ART.',
        },
        {
          num: 'Pasal 18',
          title: 'Mekanisme Pembubaran',
          content: 'Organisasi PPI Auckland dibentuk dengan lingkup waktu yang tidak ada batasnya. Namun, apabila ada hal-hal yang membuat PPI Auckland perlu dibubarkan, pembubaran hanya bisa terjadi apabila memenuhi persyaratan sebagai berikut:\nPembubaran PPI Auckland hanya dapat dilakukan berdasarkan ketetapan Kongres PPI Auckland atau Kongres Luar Biasa yang dipimpin oleh perwakilan alat kelengkapan PPI Auckland.\nPembubaran PPI Auckland hanya dapat dilaksanakan setelah seluruh masalah administrasi dan utang piutang yang dibuat untuk dan atas nama PPI Auckland telah diselesaikan.\nDalam hal pembubaran PPI Auckland, seluruh aset organisasi akan diserahkan kepada badan/lembaga yang ditetapkan oleh musyawarah pada saat pembubaran tersebut.',
        },
        {
          num: 'Pasal 19',
          title: 'Pengambilan Keputusan Pembubaran',
          content: 'Keputusan pembubaran PPI Auckland oleh musyawarah organisasi diambil secara mufakat. Apabila mufakat tidak tercapai maka keputusan harus disetujui oleh sekurang-kurangnya 2/3 (dua per tiga) dari kuorum yang hadir melalui mekanisme voting.',
        },
      ],
    },
    {
      id: 'bab-8',
      chapter: 'BAB VIII',
      title: 'Umum',
      articles: [
        {
          num: 'Pasal 20',
          title: 'Mekanisme Pemilihan Umum',
          content: 'Pengurus masa berjalan membentuk komite pemilihan independen untuk menyelenggarakan Pemilihan Umum.\nKomite independen yang dimaksud pada ayat (1) tidak mencakup Ketua Umum PPI Auckland masa berjalan dan tidak terdaftar sebagai anggota maupun pengurus organisasi politik dan organisasi kejahatan yang bertentangan dengan peraturan perundang-undangan Republik Indonesia.\nMekanisme Pemilihan Umum akan diatur lebih lanjut oleh komite independen mengacu kepada Anggaran Rumah Tangga.\nPemilihan Ketua Umum PPI Auckland dilaksanakan melalui voting yang diikuti oleh anggota yang termasuk dalam Daftar Pemilih Tetap.\nDaftar Pemilih Tetap yang dimaksud pada ayat (4) terdiri atas anggota PPI Auckland yang mendaftarkan diri melalui form pendaftaran yang disebarkan oleh komite independen.',
        },
      ],
    },
    {
      id: 'bab-9',
      chapter: 'BAB IX',
      title: 'Penutup',
      articles: [
        {
          num: 'Pasal 21',
          title: 'Aturan Peralihan dan Tambahan',
          content: 'Anggaran Dasar ini berlaku sejak tanggal disahkan.\nSegala ketentuan produk hukum di bawah Anggaran Dasar tetap berlaku sebelum dilakukan perubahan atau tidak bertentangan dengan Anggaran Dasar.\nDengan diberlakukannya Anggaran Dasar ini, Anggaran Dasar sebelumnya dan ketentuan lain yang bertentangan dinyatakan tidak berlaku lagi.',
        },
      ],
    },
  ],
  artArticles: [
    {
      id: 'art-bab-1',
      chapter: 'BAB I',
      title: 'Ketua Umum',
      articles: [
        {
          num: 'Pasal 1',
          title: 'Definisi Ketua Umum PPI Auckland',
          content: 'Ketua Umum PPI Auckland adalah alat kelengkapan organisasi PPI Auckland yang bertugas memimpin Badan Pelaksana Harian PPI Auckland dalam menyelenggarakan program kerja PPI Auckland.Ketua Umum PPI Auckland bertugas dan berwenang:Memimpin Kongres PPI Auckland dan Rapat Anggota PPI Auckland, serta menyimpulkan hasil untuk pengambilan keputusan;Menyusun rencana dan program kerja PPI Auckland.Menyusun dan memimpin Badan Pelaksana Harian PPI Auckland;Melakukan koordinasi dengan PPI Selandia Baru dan/atau PPI pada wilayah lain di Selandia Baru; danMenyampaikan laporan kinerja PPI Auckland di akhir kepengurusan.',
        },
        {
          num: 'Pasal 2',
          title: 'Syarat Ketua Umum PPI Auckland',
          content: 'Ketua Umum PPI Auckland dipilih dari perseorangan yang mengajukan diri atau diajukan oleh anggota PPI Auckland yang ditentukan berdasarkan sistem pemungutan suara dan disahkan di dalam Kongres PPI Auckland secara musyawarah mufakat.Syarat menjadi Ketua Umum PPI Auckland adalah sebagai berikut:Anggota PPI Auckland yang masih berstatus sebagai mahasiswa aktifTidak terdaftar sebagai anggota maupun pengurus organisasi politik dan/atau organisasi kejahatan yang bertentangan dengan peraturan perundang-undangan Republik IndonesiaWajib memiliki pengalaman organisasi yang dapat ditunjukkan dengan pengalaman menjadi kepala divisi atau setingkat/lebih tinggi pada tingkat pelajar, mahasiswa, organisasi kemasyarakatan, keilmuan ataupun lembaga lain setidaknya 1 (satu) tahunMemenuhi persyaratan lanjutan dan/atau administratif serta mengikuti rangkaian acara yang diadakan oleh panitia Pemilihan Umum PPI Auckland3. Ketua Umum PPI Auckland dapat diberhentikan apabila:Tidak lagi memenuhi ketentuan ayat (2) huruf a sampai c;Tidak dapat melaksanakan tugas secara berkelanjutan atau berhalangan sebagai Ketua Umum PPI Auckland selama 3 (tiga) bulan berturut-turut tanpa keterangan apapun; dan/atauMelakukan pelanggaran yang berpotensi mengganggu ketertiban masyarakat. Pemberhentian Ketua Umum PPI Auckland sebagaimana (3), dapat dilakukan melalui:Penyerahan surat pengunduran diri kepada Badan Pelaksana HarianDiputuskan melalui musyawarah dalam Kongres PPI Auckland, Rapat Anggota atau Kongres Luar Biasa yang dibuktikan melalui berita acara hasil musyawarahDalam hal Ketua Umum PPI Auckland berhenti dari jabatannya, tugas dan fungsi dilaksanakan oleh Badan Pelaksana Harian yang berada di bawah Ketua Umum PPI Auckland secara langsung hingga dipilihnya Ketua Umum PPI Auckland yang definitif melalui Kongres Luar Biasa.Masa jabatan Ketua Umum PPI Auckland yang dipilih melalui Kongres Luar Biasa sebagaimana dimaksud pada ayat (5) hanya berlangsung mengikuti periode kerja Ketua Umum PPI Auckland yang digantikan.',
        },
      ],
    },
    {
      id: 'art-bab-2',
      chapter: 'BAB II',
      title: 'Badan Eksekutif dan Pelaksana Harian',
      articles: [
        {
          num: 'Pasal 3',
          title: 'Badan Eksekutif PPI Auckland',
          content: 'Badan Eksekutif dibentuk oleh Ketua Umum PPI Auckland dan merupakan alat kelengkapan organisasi PPI Auckland yang bertugas untuk membantu pelaksanaan tugas dan fungsi Ketua Umum PPI Auckland.Badan Eksekutif dipilih oleh dan bertanggung jawab kepada Ketua Umum PPI Auckland sesuai dengan rancangan susunan program kerja setiap 1 (satu) periode kerja.Ketua Umum PPI Auckland menetapkan susunan Badan Eksekutif pada masa permulaan periode kerja, selambat-lambatnya 30 hari setelah Ketua Umum PPI Auckland terpilih.Perangkat organisasi Badan Eksekutif mencakup:Wakil Ketua Bidang yang bertugas membantu Ketua Umum PPI Auckland dalam melaksanakan program kerja spesifik terhadap bidang yang menjadi naungannya. Bidang – bidang yang menjadi fokus kepengurusan dapat ditentukan sesuai dengan perkembangan organisasiSekretaris Umum yang bertugas menangani hal administrasi dan kesekretariatan.Bendahara Umum yang bertugas menangani hal tata kelola keuangan dan pembukuan.',
        },
        {
          num: 'Pasal 4',
          title: 'Badan Pelaksana Harian PPI Auckland',
          content: 'Badan Pelaksana Harian merupakan alat kelengkapan organisasi PPI Auckland yang terdiri atas:Ketua Umum;Badan Eksekutif;Kepala Divisi. Kepala Divisi sebagaimana dalam ayat (1) dipilih oleh dan bertanggung jawab kepada Ketua Umum PPI Auckland sesuai dengan rancangan susunan program kerja setiap 1 (satu) periode kerja.Ketua Umum PPI Auckland menetapkan susunan Badan Pelaksana Harian pada masa permulaan periode kerja, selambat-lambatnya 30 hari setelah Ketua Umum PPI Auckland terpilih.Perangkat organisasi Badan Pelaksana Harian mempertimbangkan bidang yang sesuai dengan tujuan dan perkembangan organisasi PPI Auckland.Ketua Umum PPI Auckland dapat menambahkan dan/atau memberhentikan Badan Pelaksana Harian dengan mempertimbangkan kinerja maupun kebutuhan organisasi.\nBab 2 | Dewan Pengawas',
        },
      ],
    },
    {
      id: 'art-bab-3',
      chapter: 'BAB III',
      title: 'Dewan Pengawas',
      articles: [
        {
          num: 'Pasal 5',
          title: 'Definisi Dewan Pengawas',
          content: 'Dewan Pengawas adalah alat kelengkapan organisasi PPI Auckland yang memiliki fungsi pengawasan pelaksanaan organisasi oleh alat kelengkapan.Dewan Pengawas dipilih melalui keputusan Rapat Anggota PPI Auckland setelah pelaksanaan Kongres PPI Auckland.Dewan Pengawas memiliki tugas dan wewenang:Mengajukan dan memimpin Kongres Luar biasaMengawasi dan memberikan nasihat kepada alat kelengkapan organisasi PPI Auckland dalam menjalankan seluruh kegiatannyaMemberi peringatan dan teguran kepada alat kelengkapan organisasi PPI Auckland;Menerima laporan/aduan dari anggota PPI Auckland atas kinerja alat kelengkapan organisasi PPI Auckland dalam menjalankan program dan kebijakan strategis PPI Auckland.Alat kelengkapan organisasi PPI Auckland yang dimaksud dalam ayat ini adalah seluruh alat kelengkapan organisasi PPI Auckland kecuali Dewan Pengawas.4. Dewan Pengawas berjumlah paling sedikit 1 (satu) orang dan paling banyak 3 (tiga) orang, yang sebaiknya merepresentasikan jenjang studi dan institusi yang berbeda di Auckland.',
        },
        {
          num: 'Pasal 6',
          title: 'Syarat Dewan Pengawas',
          content: 'Syarat menjadi anggota Dewan Pengawas adalah sebagai berikut:Anggota PPI Auckland;Merupakan mahasiswa/pelajar aktif dari salah satu anggota PPI Wilayah yang memiliki masa studi minimal 1 (satu) tahun. Dewan pengawas dapat memiliki masa studi kurang dari 1 (satu) tahun dengan syarat berdomisili di Selandia Baru minimal (satu) tahun sejak terpilih sebagai anggota serta memiliki masa studi minimal 6 (enam) bulan; danTidak boleh merangkap jabatan dengan alat kelengkapan PPI Auckland yang lain.Dalam hal menjaga keseimbangan dan keberlanjutan organisasi, Dewan Pengawas wajib memiliki pengalaman organisasi yang dapat ditunjukkan dengan pengalaman menjadi kepala divisi atau setingkat/lebih tinggi pada tingkat pelajar, mahasiswa, organisasi kemasyarakatan, keilmuan ataupun lembaga lain setidaknya 1 (satu) tahun.2. Anggota Dewan Pengawas dapat diberhentikan apabila:Tidak lagi memenuhi syarat anggota Dewan Pengawas sebagaimana dimaksud dalam ayat (1);Tidak dapat melaksanakan tugas secara berkelanjutan atau berhalangan tetap sebagai Dewan Pengawas selama 3 (tiga) bulan berturut-turut tanpa keterangan apapun; atauAnggota Dewan Pengawas melakukan pelanggaran AD-ART berdasarkan laporan dari alat kelengkapan organisasi dan/atau anggota PPI Auckland.3. Pemberhentian anggota Dewan Pengawas dapat dilakukan melalui musyawarah pada Kongres PPI Auckland, Rapat Anggota, atau Kongres Luar Biasa yang dibuktikan melalui berita acara hasil musyawarah.\nBab 3 | Musyawarah Organisasi',
        },
      ],
    },
    {
      id: 'art-bab-4',
      chapter: 'BAB IV',
      title: 'Permusyawaratan Organisasi',
      articles: [
        {
          num: 'Pasal 7',
          title: 'Kongres PPI Auckland',
          content: 'Kongres PPI Auckland dibentuk secara musyawarah untuk mencapai mufakat dan dilaksanakan paling sedikit 1 (satu) tahun sekali baik secara langsung maupun daring di akhir kepengurusan.Kongres PPI Auckland dipimpin oleh Ketua Umum PPI Auckland dan dihadiri oleh alat kelengkapan organisasi PPI Auckland, anggota PPI Auckland, serta tamu undangan lain yang ditetapkan oleh panitia Kongres PPI Auckland.Kewenangan Kongres PPI Auckland meliputi:Memilih dan menetapkan Ketua Umum PPI Auckland;Mengesahkan Ketua Umum PPI Auckland;Meminta laporan pertanggungjawaban alat kelengkapan organisasi PPI Auckland dalam bentuk dokumen sebagai pedoman alat kelengkapan organisasi PPI Auckland periode selanjutnya;Membahas rencana kerja alat kelengkapan organisasi PPI Auckland untuk 1 (satu) tahun ke depan;Membahas, mengubah, dan menetapkan AD/ART PPI Auckland;Menerima dan menolak pertanggungjawaban alat kelengkapan PPI Auckland;Membuat dan menetapkan Keputusan dan ketetapan yang dianggap perlu; danMengusulkan dan menetapkan pembubaran PPI Auckland.4. Setiap Anggota PPI Auckland memiliki 1 (satu) hak suara dan hak bicara mewakili institusinya masing-masing, sedangkan tamu undangan lain hanya memiliki hak bicara.5. Kongres PPI Auckland dianggap sah apabila dihadiri oleh kuorum yang terdiri dari sekurangkurangnya 80% perwakilan setiap jenjang pendidikan yang terdaftar sebagai anggota PPI Auckland dan telah melakukan registrasi kedatangan Kongres, serta seluruh Badan Pelaksana Harian PPI Auckland masa berjalan.6. Apabila dalam pengambilan keputusan kuorum tidak terpenuhi, maka musyawarah ditunda sampai waktu yang ditentukan oleh alat kelengkapan PPI Auckland.7. Musyawarah yang diadakan karena kuorum pada musyawarah sebelumnya tidak terpenuhi, sesuai ayat (6) di atas, maka musyawarah tidak memiliki kuorum.',
        },
        {
          num: 'Pasal 8',
          title: 'Rapat Anggota PPI Auckland',
          content: 'Rapat Anggota PPI Auckland adalah musyawarah anggota PPI Auckland yang dapat dilakukan oleh setiap anggota PPI Auckland dan/atau alat kelengkapan PPI Auckland lainnya.Rapat Anggota PPI Auckland bertujuan untuk pengesahan Badan Pelaksana Harian, mempererat silaturahmi antaralat kelengkapan organisasi PPI Auckland, maupun membahas keperluan tertentu alat kelengkapan PPI Auckland.Rapat Anggota PPI Auckland dapat dilaksanakan sewaktu-waktu sesuai dengan keperluan masingmasing anggota dan/atau alat kelengkapan PPI Auckland lainnya.',
        },
        {
          num: 'Pasal 9',
          title: 'Kongres Luar Biasa',
          content: 'Kongres Luar Biasa adalah kongres PPI Auckland yang diselenggarakan pada keadaan mendesak dan penting untuk menyelesaikan permasalahan organisasi yang tidak dapat diselesaikan dalam forum/permusyawaratan lain.Kewenangan Kongres Luar Biasa adalah memeriksa dan memutus usulan dan/atau permohonan yang menjadi agenda Kongres Luar Biasa.Kongres Luar Biasa diselenggarakan atas permintaan sekurangnya 50% (lima puluh persen) ditambah 1 (satu) dari jumlah anggota aktif PPI Auckland yang disampaikan kepada Dewan Pengawas.Kongres Luar Biasa wajib dilaksanakan paling lambat sebulan setelah permintaan pada ayat (3) terpenuhi.Kongres Luar Biasa dipimpin oleh Dewan Pengawas.Agenda Kongres Luar Biasa ditetapkan oleh Dewan Pengawas berdasarkan usulan anggota PPI Auckland.Setiap anggota PPI Auckland memiliki 1 (satu) hak suara dan hak bicara dalam Kongres Luar Biasa.Keputusan Kongres Luar Biasa setara dengan Keputusan Kongres PPI Auckland.\nBab 4 | Penutup',
        },
      ],
    },
    {
      id: 'art-bab-5',
      chapter: 'BAB V',
      title: 'Aturan Peralihan dan Tambahan',
      articles: [
        {
          num: 'Pasal 10',
          title: 'Aturan Peralihan dan Tambahan',
          content: 'Anggaran Rumah Tangga ini berlaku sejak tanggal disahkan.Segala ketentuan produk hukum di bawah Anggaran Rumah Tangga tetap berlaku sebelum dilakukan perubahan atau tidak bertentangan dengan Anggaran Rumah Tangga.Hal-hal yang belum diatur dalam AD-ART akan diatur lebih lanjut dalam bentuk pedoman pelaksanaan organisasi yang akan dituangkan dalam bentuk keputusan Ketua Umum PPI Auckland.AD-ART ini berlaku sejak tanggal ditetapkan dan bersifat mengikat bagi seluruh anggota PPI Auckland.\n\nAuckland, 10 Oktober 2025\nKetua Umum PPI Auckland 2025/2026\nPrasetyo Eka Putra',
        },
      ],
    },
  ],
};

// ============================================
// opportunities/career-info (template: career_info)
// ============================================
export const careerInfoContent = {
  header: {
    label: 'Opportunities',
    title: 'Career',
    titleAccent: 'Info',
    description:
      'Job listings, internship opportunities, and career resources curated for Indonesian students in Auckland.',
    breadcrumbs: [{ label: 'Opportunities' }, { label: 'Career Info' }],
  },
  stats: [
    { value: '20h', label: 'Max work hours/week (study visa)' },
    { value: 'NZD 23.15', label: 'Minimum wage/hour (2025)' },
    { value: '6', label: 'Top job platforms in NZ' },
    { value: 'Free', label: 'Career resources from PPIA' },
  ],
  platforms: [
    { name: 'TradeMe Jobs', url: 'trademe.co.nz/jobs', desc: "New Zealand's local marketplace with a strong jobs section", color: '#F59E0B' },
    { name: 'LinkedIn', url: 'linkedin.com', desc: 'Professional network — great for internships and grad roles', color: '#0077B5' },
    { name: 'GradNZ', url: 'gradnz.co.nz', desc: 'Graduate-specific listings for NZ students and new graduates', color: '#10B981' },
    { name: 'Seek NZ', url: 'seek.co.nz', desc: 'Large job board with thousands of NZ listings', color: '#3B82F6' },
    { name: 'University Careers', url: 'auckland.ac.nz/careers', desc: 'Your university career services portal', color: '#8B5CF6' },
  ],
  cvTips: [
    { title: 'Work Rights as a Student', desc: 'On a student visa, you can work up to 20 hours per week during semester and full-time during scheduled holidays. Confirm your specific conditions in your visa approval letter.', highlight: true, color: '#E8231A' },
    { title: 'Get an IRD Number First', desc: 'Before starting any job, obtain an IRD (tax) number at ird.govt.nz — every employee in NZ needs one.', color: '#3B82F6' },
    { title: 'Tailor Your CV for NZ', desc: 'NZ-style CVs are typically 2-3 pages, with a personal profile, work history, and education. Avoid photos and personal details like age/marital status.', color: '#10B981' },
    { title: 'Know Your Rights', desc: 'Minimum wage, leave entitlements, and workplace protections are outlined at employment.govt.nz.', color: '#06B6D4' },
  ],
  workCultureTips: [
    { title: 'Flat Hierarchy', desc: 'NZ workplaces tend to be informal. Don\'t be surprised if you call your manager by their first name.', color: '#3B82F6' },
    { title: 'Punctuality Matters', desc: "Being on time is taken seriously. If you're running late, always let your employer know in advance.", color: '#8B5CF6' },
    { title: 'Direct Communication', desc: "Kiwis value directness and honesty. It's normal to respectfully push back on ideas or say 'no' when needed.", color: '#F59E0B' },
    { title: 'Work-Life Balance', desc: 'NZ values personal time. Avoid sending work emails late at night or on weekends unless urgent.', color: '#E8231A' },
  ],
};

// ============================================
// opportunities/scholarship (template: scholarship)
// ============================================
export const scholarshipContent = {
  header: {
    label: 'Opportunities',
    title: 'Scholar',
    titleAccent: 'ships',
    description: 'Curated funding opportunities for Indonesian students studying in Auckland and New Zealand.',
    breadcrumbs: [{ label: 'Opportunities' }, { label: 'Scholarship' }],
  },
  stats: [
    { value: '6+', label: 'Listed scholarships' },
    { value: '3', label: 'Scholarship types' },
    { value: 'Full', label: 'LPDP & Manaaki coverage' },
    { value: 'Free', label: 'To apply' },
  ],
  scholarships: [
    { id: 1, name: 'LPDP Scholarship', provider: 'Lembaga Pengelola Dana Pendidikan, Indonesia', type: 'Indonesian Gov', color: '#E8231A', level: ['Masters', 'PhD'], coverage: ['Full tuition', 'Living allowance', 'Book allowance', 'Travel costs', 'Research funding'], amount: 'Full funding', deadline: 'Multiple rounds annually', url: 'https://www.lpdp.kemenkeu.go.id', desc: 'The flagship Indonesian government scholarship for postgraduate study abroad.', featured: true },
    { id: 2, name: 'Manaaki New Zealand Scholarship', provider: 'New Zealand Government', type: 'NZ Gov', color: '#3B82F6', level: ['Bachelors', 'Masters', 'PhD'], coverage: ['Full tuition', 'Living allowance', 'Travel', 'Insurance'], amount: 'Full funding', deadline: 'Annual (usually March)', url: 'https://www.mfat.govt.nz/manaaki', desc: 'NZ government scholarship for students from selected countries including Indonesia.' },
    { id: 3, name: 'University of Auckland International Scholarship', provider: 'University of Auckland', type: 'University', color: '#10B981', level: ['Bachelors', 'Masters'], coverage: ['Partial tuition'], amount: 'NZ$10,000–20,000', deadline: 'Semester-based', url: 'https://www.auckland.ac.nz/scholarships', desc: 'Tuition support for high-achieving international students at UoA.' },
    { id: 4, name: 'AUT International Student Scholarship', provider: 'Auckland University of Technology', type: 'University', color: '#8B5CF6', level: ['Bachelors', 'Masters'], coverage: ['Partial tuition'], amount: 'NZ$5,000–7,000', deadline: 'Semester-based', url: 'https://www.aut.ac.nz/scholarships', desc: 'Financial support for international students at AUT.' },
    { id: 5, name: 'NZ Excellence Awards', provider: 'Education New Zealand', type: 'NZ Gov', color: '#F59E0B', level: ['Masters', 'PhD'], coverage: ['Partial tuition'], amount: 'NZ$10,000', deadline: 'Annual', url: 'https://enz.govt.nz', desc: 'Awards for Indonesian students pursuing postgraduate study in NZ.' },
    { id: 6, name: 'New Colombo Plan', provider: 'Australian Government (DFAT)', type: 'NZ Gov', color: '#06B6D4', level: ['Bachelors'], coverage: ['Travel', 'Living stipend'], amount: 'Variable', deadline: 'Annual', url: 'https://www.dfat.gov.au/new-colombo-plan', desc: 'While primarily for Australian students, this creates exchange opportunities — increasing international student diversity at NZ institutions.' },
  ],
  applicationTips: [
    { icon: 'Star', color: '#E8231A', title: 'Start early', desc: 'LPDP and Manaaki applications open months before deadlines. Begin your preparation at least 6 months in advance.' },
    { icon: 'BookOpen', color: '#3B82F6', title: 'Secure your offer first', desc: 'Most scholarships require a confirmed university offer. Apply for admission well in advance.' },
    { icon: 'Globe', color: '#10B981', title: 'Prepare your documents', desc: 'Academic transcripts, recommendation letters, and a strong personal statement are essential.' },
    { icon: 'DollarSign', color: '#F59E0B', title: 'Ask the scholarship office', desc: 'Your university scholarship office can help identify funding you might not find online. Always ask.' },
  ],
};

// ============================================
// opportunities/partnership (template: benefit_grid)
// ============================================
export const partnershipContent = {
  header: {
    label: 'Opportunities',
    title: 'Partner',
    titleAccent: 'with Us',
    description: 'Interested in collaborating with PPIA Auckland? We partner with organisations that support and empower Indonesian students.',
    breadcrumbs: [{ label: 'Opportunities' }, { label: 'Partnership' }],
  },
  benefits: [
    { icon: 'Users', color: '#E8231A', title: 'Direct Student Reach', desc: 'Access a focused community of 500+ active Indonesian students across Auckland universities.' },
    { icon: 'Megaphone', color: '#3B82F6', title: 'Brand Visibility', desc: 'Showcase your brand at events, on our website, and across our social media channels.' },
    { icon: 'Globe', color: '#10B981', title: 'Cultural Exchange', desc: 'Support cross-cultural understanding between Indonesian and Kiwi communities.' },
    { icon: 'Heart', color: '#F59E0B', title: 'Meaningful Impact', desc: 'Help shape the next generation of Indonesian leaders in New Zealand.' },
  ],
  tiers: [
    { name: 'Community Supporter', color: '#10B981', price: 'Free', ideal: 'Local businesses, community groups', perks: ['Logo on our website', 'Social media mention', 'Community event promotion', 'WhatsApp group shoutout'] },
    { name: 'Event Sponsor', color: '#3B82F6', price: 'Negotiable', ideal: 'Businesses, recruitment agencies, service providers', perks: ['Logo on event materials', 'On-stage recognition', 'Table/booth at events', 'Instagram post feature', 'Newsletter placement'], featured: true },
    { name: 'Strategic Partner', color: '#E8231A', price: 'Annual', ideal: 'Corporates, universities, government agencies', perks: ['All Event Sponsor perks', 'Co-branded programs', 'Dedicated career fair presence', 'Priority job postings to members', 'Executive introductions', 'Annual impact report'] },
  ],
  currentPartners: [
    { name: 'New Zealand Indonesia Association', type: 'Community' },
    { name: 'Indonesian Consulate General Auckland', type: 'Government' },
  ],
  benefitsSection: {
    label: 'Why Partner',
    title: 'Reach Indonesia',
    titleAccent: "s Best & Brightest",
    description: 'PPIA Auckland is the trusted hub for Indonesian students in Auckland. Partnering with us means building a meaningful connection with a motivated, engaged, and growing community.',
  },
  tiersSection: {
    label: 'Options',
    title: 'Partnership',
    titleAccent: 'Tiers',
    description: 'We offer flexible partnership models — from grassroots community support to full strategic alliances.',
  },
  cta: {
    title: 'Get in Touch',
    description: 'Have a question or want to discuss a partnership? Drop us a message and we will get back to you soon.',
    submitButton: 'Send Partnership Enquiry',
    form: {
      typeLabel: 'Partnership Type',
      nameLabel: 'Name',
      orgLabel: 'Organisation',
      emailLabel: 'Email',
      messageLabel: 'Message',
    },
  },
};

// ============================================
// contact (template: contact)
// ============================================
export const contactContent = {
  header: {
    label: 'PPIA Auckland',
    title: 'Get in',
    titleAccent: 'Touch',
    description: "Have a question, idea, or just want to say hello? We'd love to hear from you.",
    breadcrumbs: [{ label: 'Contact' }],
  },
  // NOTE: the public page resolves icons through a lowercase ICON_MAP
  // (mail, instagram, whatsapp, messageCircle, mapPin, clock, users, helpCircle)
  // and reads the key `iconName`. Capitalised names or the key `icon` silently
  // fall back to the mail icon.
  channels: [
    { iconName: 'mail', color: '#E8231A', label: 'Email Us', value: 'ppiauckland@gmail.com', sub: 'We reply within 1–2 business days', href: 'mailto:ppiauckland@gmail.com' },
    { iconName: 'instagram', color: '#C13584', label: 'Instagram', value: '@ppiauckland', sub: 'DM us for quick questions', href: 'https://instagram.com/ppiauckland' },
    { iconName: 'mapPin', color: '#3B82F6', label: 'Location', value: 'Auckland, New Zealand', sub: 'University of Auckland & AUT', href: '#' },
    { iconName: 'clock', color: '#10B981', label: 'Office Hours', value: 'Mon – Fri', sub: '9:00 AM – 5:00 PM NZST', href: '#' },
  ],
  topics: [
    { iconName: 'users', label: 'Membership & Registration' },
    { iconName: 'helpCircle', label: 'New Student Questions' },
    { iconName: 'messageCircle', label: 'Partnership / Sponsorship' },
    { iconName: 'clock', label: 'Volunteer Opportunities' },
    { iconName: 'mail', label: 'Other' },
  ],
  faqs: [
    { q: 'How do I become a member of PPIA Auckland?', a: 'Simply register on our website at /register. Membership is free and open to all Indonesian students in Auckland.' },
    { q: 'Do I need to be a student at University of Auckland?', a: 'No — we welcome students from all Auckland institutions including UoA, AUT, Massey Albany, and others.' },
    { q: 'Are PPIA events only for Indonesian students?', a: 'Most events are open to everyone, though some are specifically for our Indonesian community members.' },
    { q: 'How can I get involved as a volunteer?', a: "Contact us via email or the form above expressing your interest. We're always looking for passionate volunteers." },
  ],
};

// ============================================
// legal/privacy-policy (template: legal_simple)
// ============================================
export const privacyPolicyContent = {
  header: {
    label: 'Legal',
    title: 'Privacy',
    titleAccent: 'Policy',
    description: 'How we handle your data',
    breadcrumbs: [{ label: 'Home' }, { label: 'Legal' }, { label: 'Privacy Policy' }],
  },
  sections: [
    { id: 1, title: 'Information We Collect', body: 'When you register for PPIA Auckland, we collect information you provide directly, such as your name, email address, university affiliation, and student ID.' },
    { id: 2, title: 'How We Use Your Information', body: 'We use your information to manage your membership, communicate about events, and improve our community services.' },
    { id: 3, title: 'Data Security', body: 'We take reasonable measures to protect your personal information from unauthorized access, alteration, or disclosure.' },
    { id: 4, title: 'Your Rights', body: 'You can request access to, correction of, or deletion of your personal data at any time by contacting us.' },
    { id: 5, title: 'Contact Us', body: 'If you have questions about this privacy policy, please contact us at ppiauckland@gmail.com.' },
  ],
};

// ============================================
// legal/terms-of-service (template: legal_simple)
// ============================================
export const termsOfServiceContent = {
  header: {
    label: 'Legal',
    title: 'Terms of',
    titleAccent: 'Service',
    description: 'Community guidelines and terms',
    breadcrumbs: [{ label: 'Home' }, { label: 'Legal' }, { label: 'Terms of Service' }],
  },
  sections: [
    { id: 1, title: 'Membership', body: 'Membership in PPIA Auckland is open to Indonesian students and affiliates in the Auckland region. You agree to provide accurate registration information and keep your account details current.' },
    { id: 2, title: 'Code of Conduct', body: 'All members are expected to maintain respectful, inclusive, and professional conduct at all PPIA events and on our digital platforms.' },
    { id: 3, title: 'Events and Activities', body: 'Participation in PPIA events is at your own risk. We are not liable for any injury, loss, or damage during events.' },
    { id: 4, title: 'Intellectual Property', body: 'Content created by PPIA Auckland, including logos and event materials, is the property of the organization. Members may not use it without permission.' },
    { id: 5, title: 'Changes to Terms', body: 'We reserve the right to update these terms at any time. Continued membership after changes constitutes acceptance of the new terms.' },
  ],
};

// ============================================
// activities/research-corner (template: research_corner)
// ============================================
export const researchCornerContent = {
  header: {
    label: 'Activities',
    title: 'Research',
    titleAccent: 'Corner',
    description:
      'A space for PPIA Auckland members to share academic research, insights, and intellectual contributions with the community.',
    breadcrumbs: [{ label: 'Activities' }, { label: 'Research Corner' }],
  },
  topics: [
    { icon: 'FlaskConical', label: 'Science & Technology', color: '#3B82F6' },
    { icon: 'TrendingUp', label: 'Economics & Business', color: '#F59E0B' },
    { icon: 'Globe', label: 'Social & Culture', color: '#10B981' },
    { icon: 'Lightbulb', label: 'Education & Policy', color: '#8B5CF6' },
    { icon: 'BookOpen', label: 'Arts & Humanities', color: '#E8231A' },
    { icon: 'Users', label: 'Public Health', color: '#06B6D4' },
  ],
};

// ============================================
// activities/events (template: activity_listing)
// ============================================
// The event list itself comes from the Events module; only the page header is
// CMS-managed. Without a Page record the public page fell back to hardcoded
// text that no admin could reach.
export const eventsListingContent = {
  header: {
    label: 'Activities',
    title: 'Our',
    titleAccent: 'Events',
    description:
      'Workshops, cultural nights, sports, and networking sessions organised by PPIA Auckland.',
    breadcrumbs: [{ label: 'Activities' }, { label: 'Events' }],
  },
};

// ============================================
// activities/news-articles (template: activity_listing)
// ============================================
export const newsArticlesListingContent = {
  header: {
    label: 'Activities',
    title: 'News &',
    titleAccent: 'Articles',
    description:
      'Stories, announcements, and reflections from the Indonesian student community in Auckland.',
    breadcrumbs: [{ label: 'Activities' }, { label: 'News & Articles' }],
  },
};

// ============================================
// Master export: slug → content
// ============================================
export const PAGE_CONTENT: Record<string, Record<string, any>> = {
  'about/cabinet': cabinetContent,
  'about/historical-archive': historicalArchiveContent,
  'about/ambition-action': ambitionActionContent,
  'about/ad-art': adArtContent,
  'activities/events': eventsListingContent,
  'activities/news-articles': newsArticlesListingContent,
  'activities/research-corner': researchCornerContent,
  'opportunities/career-info': careerInfoContent,
  'opportunities/scholarship': scholarshipContent,
  'opportunities/partnership': partnershipContent,
  'opportunities/wiki-ppia': wikiPpiaContent,
  'contact': contactContent,
  'legal/privacy-policy': privacyPolicyContent,
  'legal/terms-of-service': termsOfServiceContent,
};
