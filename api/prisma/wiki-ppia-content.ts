// ============================================
// opportunities/wiki-ppia (template: accordion_guide)
// ============================================
export const wikiPpiaContent = {
  header: {
    label: "Opportunities",
    title: "Wiki",
    titleAccent: "PPIA",
    description: "Your complete guide to life as an Indonesian student in Auckland — from visa prep to daily living.",
    breadcrumbs: [
      { label: "Opportunities" },
      { label: "Wiki PPIA" },
    ],
  },
  /**
   * Footer note. These lines used to be hard-coded in the page component, which
   * meant "last reviewed" quietly went stale and nobody could correct the
   * contact address without a deploy.
   */
  meta: {
    reviewedLabel: "Last reviewed",
    reviewedValue: "Q3 2026",
    reviewedNote: "Checked against Immigration NZ, MPI, and AT. Sources on request.",
    contactEmail: "ppiauckland@gmail.com",
    contactText: "Found something outdated? Tell us.",
    credit: "Built by PPIA Auckland volunteers. All information verified before publish.",
  },
  sections: [
    {
      id: "about",
      icon: "BookOpen",
      color: "#E8231A",
      label: "Tentang PPIA",
      title: "Tentang PPI Auckland",
      items: [
        {
          q: "Apa itu PPI Auckland (PPIA)?",
          a: "PPI Auckland, atau yang sering dikenal sebagai PPIA, adalah Perhimpunan Pelajar Indonesia di Auckland, Selandia Baru. Organisasi ini berperan sebagai wadah bagi para pelajar di Auckland melalui berbagai kegiatan bermanfaat yang dirancang sesuai dengan kebutuhan dan aspirasi pelajar.",
        },
        {
          q: "Bagaimana cara menjadi anggota PPIA?",
          a: "PPIA terbuka untuk seluruh pelajar yang telah menjadi pelajar aktif di berbagai sekolah menengah dan universitas di kota Auckland, Selandia Baru. Pelajar yang akan atau baru datang dapat mengisi form registrasi Pendataan Pelajar Indonesia di Auckland untuk mendapatkan tautan group Whatsapp PPIA.",
        },
        {
          q: "Apa keuntungan menjadi anggota PPIA?",
          a: "Setelah follow Instagram, bergabung dalam group Whatsapp, atau berlangganan newsletter PPIA, kalian bisa mendapatkan informasi berbagai kegiatan yang diselenggarakan PPIA mulai dari akademik, olahraga, seni budaya, networking, dan lain-lain. Kalian cukup mengisi RSVP atau datang langsung ke acara tersebut untuk bisa berkenalan dan seru-seruan bersama teman-teman anggota PPIA lainnya.",
        },
        {
          q: "Siapa yang dapat saya hubungi bila memiliki pertanyaan?",
          a: "Kami memiliki program student representatives yang dapat menjawab berbagai pertanyaan terkait kehidupan di Auckland. Silakan hubungi student representatives yang ditunjuk oleh PPIA.",
        },
      ],
    },
    {
      id: "airlines",
      icon: "Plane",
      color: "#3B82F6",
      label: "Maskapai",
      title: "Hal-hal yang perlu diperhatikan terkait maskapai penerbangan",
      items: [
        {
          q: "Aturan terkait maskapai penerbangan",
          a: "<ul><li>Pilih maskapai dengan rute langsung atau transit minimal.</li><li>Cek kebijakan bagasi (berat maksimum, ukuran, dan jumlah koper). Setiap maskapai memiliki aturan berbeda seperti Garuda, Singapore Airlines, Qantas, Jetstar.</li><li>Untuk umat muslim, pastikan sudah meminta makanan halal saat booking.</li></ul>",
        },
      ],
    },
    {
      id: "entry",
      icon: "MapPin",
      color: "#F59E0B",
      label: "Masuk NZ",
      title: "Aturan masuk ke Selandia Baru",
      items: [
        {
          q: "Bagaimana aturan biosecurity di bandara Selandia Baru?",
          a: "Bandara di Selandia Baru terkenal akan biosecurity yang sangat ketat. Petugas akan memeriksa koper menggunakan mesin x-ray, anjing pelacak, maupun secara manual. Pemeriksaan ini cukup memakan waktu karena sebagian besar akan diminta membuka koper untuk diperiksa.",
        },
        {
          q: "Apa yang harus diisi sebelum masuk ke Selandia Baru?",
          a: "Pastikan sudah mengisi New Zealand Travel Declaration (NZTD) yang dapat dilakukan H-1 sebelum keberangkatan secara online melalui website resmi, aplikasi NZTD, atau on-the-spot di pesawat.",
        },
      ],
    },
    {
      id: "customs",
      icon: "FileText",
      color: "#10B981",
      label: "Customs",
      title: "Tips melalui custom clearance",
      items: [
        {
          q: "Tips apa saja yang perlu diperhatikan saat custom clearance?",
          a: "<ol><li>Cek barang yang boleh dan tidak boleh dibawa di mpi.govt.nz.</li><li>Selalu declare, terutama ketika tidak yakin. Denda NZD 400 jika melanggar aturan deklarasi.</li><li>Tempatkan barang yang harus di-declare di satu koper.</li><li>Siapkan daftar nama barang bawaan, termasuk bahan produk makanan.</li><li>Untuk peralatan olahraga seperti sepatu hiking, bawalah dalam keadaan bersih.</li><li>Pastikan semua barang memenuhi aturan NZ Customs Service.</li><li>Untuk barang yang butuh izin seperti drone atau barang antik, sertakan dokumen pendukung.</li><li>Transit? Alokasikan 2-3 jam untuk biosecurity check dan pindah terminal domestik.</li></ol>",
        },
      ],
    },
    {
      id: "transport",
      icon: "Car",
      color: "#8B5CF6",
      label: "Transportasi",
      title: "Transportasi dari Bandara Auckland ke Akomodasi",
      items: [
        {
          q: "Bagaimana cara menuju akomodasi dari Bandara Auckland?",
          a: "<ul><li>Meminta tolong dijemput teman atau kerabat.</li><li>Menggunakan fasilitas jemputan kampus (UoA, Massey, AUT biasanya menyediakan layanan ini).</li><li>Transportasi umum: Uber, Shuttle (Supershuttle), AT Bus dan/atau kereta, sewa kendaraan.</li></ul>",
        },
      ],
    },
    {
      id: "pre-departure",
      icon: "ShoppingBag",
      color: "#EC4899",
      label: "Persiapan",
      title: "Persiapan Keberangkatan",
      items: [
        {
          q: "Bagaimana cara mengurus visa pelajar Selandia Baru?",
          a: "Informasi pengurusan visa (durasi, syarat, biaya) dapat diakses di website Immigration New Zealand. Per Agustus 2024, 80% pengurusan selesai dalam waktu 7 minggu. Tersedia jalur: pertama kali, perpanjangan, partner atau child visitor (khusus master/doctoral), dan partner atau child work visa (khusus master/doctoral). Aplikasi dapat dilakukan secara mandiri atau melalui agen.",
        },
        {
          q: "Apa saja jenis-jenis akomodasi yang tersedia di Auckland?",
          a: "<ul><li>Shared flat atau apartment (patungan).</li><li>Flat atau apartemen (sendiri atau keluarga).</li><li>Boarding house (seperti kos).</li><li>Studio room (1 kamar dengan dapur kecil).</li><li>Campus accommodation (asrama mahasiswa).</li></ul>",
        },
        {
          q: "Bagaimana cara mencari dan apply akomodasi?",
          a: "Cari via website universitas, TradeMe, Homes, Facebook Marketplace. Langkah: kontak agen atau pengiklan, jadwalkan viewing, ajukan aplikasi, tanda tangan kontrak, bayar deposit (umumnya 4x sewa mingguan), ambil kunci, dan minta proof of address. Bayar sewa mingguan. Deposit dikembalikan 100% jika akomodasi bersih dan tidak ada kerusakan.",
        },
        {
          q: "Bagaimana cara memilih provider air, listrik, dan internet?",
          a: "Cek apakah sewa sudah termasuk semuanya. Air dikelola local council. Listrik: bandingkan tarif di Powerswitch. Internet: bandingkan di Glimp. Pastikan provider tersedia di akomodasi dan pilih sesuai kebutuhan (fiber atau modem).",
        },
        {
          q: "Bagaimana jika belum mendapatkan akomodasi saat kedatangan?",
          a: "Hubungi teman atau kerabat di Auckland untuk menumpang sementara, sewa AirBnB, atau hotel. Hubungi student representative PPIA untuk bantuan.",
        },
        {
          q: "Bank apa saja yang tersedia di Auckland?",
          a: "Bank besar: ANZ, BNZ, ASB, Westpac, Kiwibank. Beberapa memfasilitasi pembukaan rekening online dari Indonesia, tetapi umumnya tetap memerlukan proof of address di Selandia Baru.",
        },
        {
          q: "Dokumen yang diperlukan untuk membuka rekening?",
          a: "Umumnya: passport, visa, NPWP (jika ada), proof of address, IRD number (opsional), slip gaji atau LOG atau statement (jika diminta). Proses 3-14 hari kerja.",
        },
        {
          q: "Bagaimana cara transfer uang dari atau ke Selandia Baru?",
          a: "Gunakan aplikasi Bank Indonesia, Wise atau OrbitRemit, atau transfer bersama teman. Wise cocok untuk nominal kecil; Bank Indonesia lebih hemat untuk nominal besar. ATM Bank Indonesia di Bank NZ mengenakan fee 2-3,5%.",
        },
        {
          q: "Dokumen apa saja yang wajib dibawa?",
          a: "Paspor, visa NZ, visa transit (jika transit di Australia lebih dari 8 jam), dokumen studi (LOA/LOG), kartu vaksin anak/terjemahan, SIM Indonesia/Internasional/terjemahan. SIM Indonesia berlaku 12 bulan, setelahnya perlu dikonversi ke SIM NZ melalui AA.",
        },
        {
          q: "Barang apa saja yang sebaiknya dibawa dari Indonesia?",
          a: "Bidet portable, adaptor colokan type I, obat pribadi dengan resep, thermal underwear, jaket, uang tunai NZD 350-500 (maks NZD 10.000), baju batik, mie instan/bumbu. Pastikan produk Indonesia memiliki label lengkap.",
        },
        {
          q: "Barang apa saja yang tidak boleh dibawa?",
          a: "Olahan daging (termasuk abon) dan produk mengandung madu. Cek mpi.govt.nz untuk daftar lengkap. Denda NZD 400 untuk barang restricted atau prohibited yang tidak di-declare.",
        },
      ],
    },
    {
      id: "arrival",
      icon: "Sun",
      color: "#06B6D4",
      label: "Sampai di Auckland",
      title: "Sampai di Auckland",
      items: [
        {
          q: "Apa yang harus dilakukan setelah sampai Bandara?",
          a: "Tunggu di titik penjemputan sesuai kesepakatan, atau menuju lokasi transportasi umum. Beli SIM card di counter atau convenience store (Spark, 2degrees, One NZ). Jika dijemput kampus, biasanya mendapat SIM card. Tidak wajib beli di bandara.",
        },
        {
          q: "Apa yang harus dilakukan setelah sampai Akomodasi?",
          a: "<ul><li>Serah terima kunci dan administrasi. Pastikan mendapat copy tenancy agreement dan proof of address.</li><li>Lapor diri WNI di Peduli WNI Kemlu.</li><li>Bagi penerima beasiswa, lapor ke beasiswa.</li><li>Beli kartu AT Hop di convenience store, install aplikasi AT, registrasi, apply tertiary student concession.</li><li>Buka rekening Bank jika belum, atau ambil kartu ATM jika sudah daftar online.</li><li>Beli SIM card Selandia Baru jika belum.</li></ul>",
        },
        {
          q: "Apa yang harus dilakukan terkait proses studi?",
          a: "Ambil Student Card, pastikan enrollment dan tuition fee selesai, daftar akses gedung dan prayer room, update personal details, daftar tes DELNA, daftar kegiatan orientasi. Informasi lebih lanjut ada di website kampus masing-masing.",
        },
      ],
    },
    {
      id: "living",
      icon: "Users",
      color: "#F97316",
      label: "Kehidupan di Auckland",
      title: "Kehidupan di Auckland",
      items: [
        {
          q: "Life hack hidup hemat di Auckland?",
          a: "Masak sendiri dan cari diskon. Cek tips lengkap di sub-bagian To-do list di bawah.",
        },
        {
          q: "Tempat belanja bulanan di sekitar Auckland?",
          a: "Lihat detail di sub-bagian To-do list di bawah.",
        },
        {
          q: "Asuransi kesehatan dan cara periksa ke dokter?",
          a: "Lihat detail di sub-bagian To-do list di bawah.",
        },
        {
          q: "Beribadah di Auckland?",
          a: "Setiap universitas biasanya memiliki prayer room. Daftar akses prayer room. Tempat ibadah di Auckland antara lain: Islam (AUT Masjid, Clock Tower UoA, Ponsonby Masjid, Masjid Utsman bin Affan, ACIC, Auckland City Hospital, Starship), Kristen (St. Andrew Presbyterian Church dengan ibadah Bahasa Indonesia, IFGF, Every Nation, LIFE), Katolik (St. Michaels, St John The Baptist Parnell, St Patrick's Cathedral, St Benedicts dengan misa Bahasa Indonesia bulanan), Hindu (Shri Ram Mandir), Budha (Fo Guang Shan).",
        },
        {
          q: "Restoran Indonesia dan restoran halal di Auckland?",
          a: "Lihat daftar di sub-bagian To-do list di bawah.",
        },
        {
          q: "Daging halal di Auckland?",
          a: "Lihat daftar di sub-bagian To-do list di bawah.",
        },
        {
          q: "Komunitas Indonesia lain selain PPIA?",
          a: "LPDP Awardee NZ, Manaaki Awardee NZ, IPGC-NZ, HUMIA, KKIA.",
        },
        {
          q: "Cara mengurus New Zealand Driver License?",
          a: "Lihat detail di sub-bagian To-do list di bawah.",
        },
        {
          q: "Cara menyewa kendaraan di Auckland?",
          a: "Lihat detail di sub-bagian To-do list di bawah.",
        },
        {
          q: "Info membeli kendaraan di Auckland?",
          a: "Lihat detail di sub-bagian To-do list di bawah.",
        },
        {
          q: "To-do list — Life hack hidup hemat",
          a: "Masak sendiri, beli saat diskon (Mother's/Father's Day, Black Friday, Boxing Day), pertimbangkan barang second-hand. Opsi: op shop (Red Cross K-Road, Salvation Army), Facebook Marketplace, TradeMe, Temu, Amazon Australia, eBay Australia, Alibaba, Two Dollar Things. Teliti sebelum membeli, terutama di Facebook.",
        },
        {
          q: "To-do list — Tempat belanja bulanan di Auckland Central",
          a: "<strong>Perabotan rumah tangga</strong>: The Warehouse, K-Mart, Briscoes. <strong>Kebutuhan sehari-hari</strong>: PaknSave (paling murah), Woolworths/Countdown, New World. <strong>Toko Asia</strong>: Furein, Lim Chour, Soung Yueen, Tofu Shop, New Save Asian Supermarket. <strong>Pasar</strong>: Avondale Sunday Market, Parnell Saturday Market.",
        },
        {
          q: "To-do list — Asuransi kesehatan dan periksa dokter",
          a: "<strong>Asuransi</strong>: Mahasiswa wajib membayar asuransi (biasanya termasuk tuition fee). Untuk keluarga, opsional. <strong>Periksa dokter</strong>: Setiap kampus punya medical center. Cek kampus masing-masing untuk info lebih lanjut. Untuk keluarga, daftar ke clinic terdekat via healthpoint.co.nz atau govt.nz.",
        },
        {
          q: "To-do list — Restoran Indonesia dan halal",
          a: "<strong>Restoran Indonesia</strong>: Raos, Java, Bali Nights, Makassar Corner, Bandung. <strong>Restoran Halal</strong>: Avachi Fried Chicken, Sensational Chicken, Lanzou, dan lain-lain. Daftar lengkap di NZ Halal Guide. Jangan ragu bertanya kepada penjual.",
        },
        {
          q: "To-do list — Daging halal di Auckland",
          a: "Halal butcher di Sandringham Road atau Dominion Road: Auckland Halal Meat, Khan Halal Meat, Quandahari Bazaar. PaknSave Mt. Albert punya bagian daging halal. Cek fianz.com untuk perusahaan tersertifikasi halal, mpi.govt.nz untuk Approved Halal Organisation, atau newzealand.com untuk halal guide.",
        },
        {
          q: "To-do list — Mengurus SIM Selandia Baru",
          a: "Kunjungi kantor AA (Automobile Association). Dokumen: paspor, bank statement, SIM Indonesia dan terjemahan, formulir. Lulus tes teori (mendapat Restricted), lulus tes praktik (mendapat Full licence). Informasi lebih lanjut di aa.co.nz.",
        },
        {
          q: "To-do list — Menyewa kendaraan",
          a: "Rental di Auckland: Ezi, Hertz, Go Rental, Omega. Pilih sesuai jumlah seat, driver punya IDP, daftarkan semua driver sebagai Authorized Driver, pilih asuransi sesuai kebutuhan (full coverage disarankan), dan konfirmasi aturan after-hours.",
        },
        {
          q: "To-do list — Membeli kendaraan",
          a: "Beli di TradeMe, Facebook Marketplace, dealer second-hand. Negosiasi via email, cek history di carjam.co.nz, beli mechanical warranty untuk mobil tua/hybrid. Mobil Jepang resale value lebih baik. Cek body, oli rem, engine bay, wiper, REGO. Parkir di Wilson (NZD 250-450/bulan) atau street parking gratis 6 sore-8 pagi. Diskon pelajar Wilson hingga 50%.",
        },
      ],
    },
  ],
};
