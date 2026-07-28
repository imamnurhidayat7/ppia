# Panduan Mengedit Konten Website PPIA Auckland

Panduan untuk pengurus PPIA yang ingin mengubah teks, gambar, atau daftar isi di
website **tanpa menyentuh kode**.

> Antarmuka dashboard berbahasa Inggris. Panduan ini memakai Bahasa Indonesia
> dan menyebutkan label aslinya dalam tanda kutip, misalnya **"Save"** (Simpan).

---

## Ringkasnya

Hanya ada **satu editor** untuk semua isi halaman. Kamu melihat halaman, mengubah
isinya, lalu menekan **"Save"**.

| Yang ingin kamu ubah | Ke mana |
|---|---|
| Teks & gambar beranda | Admin Dashboard → **Homepage** |
| Halaman About, Contact, Scholarship, Wiki, dll. | Admin Dashboard → **Pages** → pilih halaman → **Edit** |
| Menu navigasi, footer, media sosial, warna | Admin Dashboard → **Menus & Settings** |
| Acara, Artikel, Riset | Menu masing-masing di bagian *Management* |

**Satu bahasa.** Konten yang kamu tulis adalah konten yang dilihat pengunjung.
Tidak ada lagi versi terpisah EN/ID — dulu ada tombol pergantian bahasa yang
membuat bingung karena hanya bisa diakses dari dashboard dan tidak mengubah isi
yang kamu tulis.

---

## 1. Masuk ke Dashboard

1. Buka `/login` dan masuk dengan akun admin.
2. Klik **"Admin View"** di kanan atas.
3. Bagian paling atas, **"Website content"**, berisi tiga pintu masuk di tabel di atas.

---

## 2. Mengedit halaman (About, Contact, Scholarship, dan lainnya)

1. Admin Dashboard → **Pages** → klik **Edit** pada halaman yang dituju.
2. Editor terbuka dengan tiga area:

**Kiri — daftar isi halaman.** Berisi **"Page content"**: nama setiap bagian yang
bisa diedit. Klik salah satunya untuk langsung melompat ke kolomnya di panel
kanan. Di bawahnya ada **"Extra blocks"** untuk bagian tambahan (biasanya kosong
dan memang tidak diperlukan).

**Tengah — pratinjau halaman.** Menampilkan halaman aslinya. Isinya belum bisa
diklik untuk diedit langsung, karena tampilan halaman ini dibuat khusus lewat
kode. Pratinjau akan menyegarkan diri setiap kali kamu menyimpan. Tombol
**Desktop / Tablet / Mobile** di atas mengubah lebar pratinjau.

**Kanan — panel editor**, dengan empat tab:

- **"Content"** — di sinilah kamu mengedit. Semua daftar dan teks halaman ada di
  sini: daftar divisi, daftar beasiswa, pertanyaan FAQ, tonggak sejarah, dan
  seterusnya.
- **"SEO"** — judul dan deskripsi untuk Google, lengkap dengan pratinjau hasil
  pencarian.
- **"Publish"** — judul halaman, sakelar **"Live on the public site"** (tayang),
  alamat halaman, ringkasan singkat, dan gambar utama.
- **"Advanced"** — mode teknis (JSON). Hanya muncul untuk Super Admin dan tidak
  diperlukan untuk pengeditan sehari-hari.

3. Klik **"Save"** di kanan atas, atau tekan `Ctrl+S` / `Cmd+S`. Semua perubahan
   (Content, SEO, Publish) tersimpan bersamaan.

Halaman yang isinya dibangun dari blok (bukan dari kolom terstruktur) tampil
berbeda: kanvas tengahnya berisi blok yang bisa diklik dan digeser langsung.

---

## 3. Mengedit beranda

Admin Dashboard → **Homepage**.

1. Panel kiri berisi daftar **"Sections"** (Hero, About, Video, Events, Articles,
   Membership). Klik salah satu untuk memilihnya.
2. Kanvas tengah menampilkan beranda seperti aslinya. **Klik teks mana pun untuk
   mengubahnya**; arahkan kursor ke gambar atau video untuk menggantinya.
3. Simpan lewat **"Save"** di kanan atas.
4. Untuk pengaturan lebih detail — menambah item, mengubah urutan, menyalakan
   atau mematikan bagian — gunakan panel **"Section details"** di kanan. Panel ini
   punya tombol **"Simpan"** sendiri.
5. **"Add"** di panel kiri untuk menambah bagian, ikon tempat sampah untuk
   menghapus.

---

## 4. Jenis kolom yang akan kamu temui

| Kolom | Cara pakai |
|---|---|
| Teks satu baris | Judul, label |
| Teks panjang | Deskripsi beberapa baris |
| Teks berformat | Ada tombol tebal, miring, daftar, tautan |
| Gambar | Klik area unggah, pilih berkas dari komputer |
| Tautan | Alamat tujuan, misalnya `/contact` atau `https://...` |
| Warna | Pemilih warna |
| Sakelar | Nyala/mati, misalnya **"Mark as featured"** |
| Daftar item | Kumpulan kartu. **"Add"** untuk menambah, ikon tempat sampah untuk menghapus, klik judul untuk buka/tutup |
| Daftar teks | Daftar sederhana satu baris per item, misalnya jenjang beasiswa |

Beberapa kolom perlu penjelasan:

- **"Title"** dan **"Highlighted word"** digabung menjadi satu judul.
  Contoh: Title `Our` + Highlighted word `Cabinet` → **Our Cabinet**.
- **"Eyebrow above the heading"** adalah label kecil di atas judul besar.
- **"Unique code"** dipakai sistem, tidak tampil di halaman. Isi huruf kecil
  tanpa spasi.
- **"Highlighted part of the quote"** (halaman Ambition & Action) harus berupa
  potongan kata yang persis ada di dalam kutipannya.

---

## 5. Hal yang perlu diingat

- **Perubahan tersimpan setelah menekan "Save".** Selama masih ada perubahan,
  penanda **"Unsaved changes"** muncul di bar atas, dan browser akan bertanya
  kalau kamu menutup tab. Setelah tersimpan muncul **"Saved"**.
- **Halaman baru dimulai sebagai draf.** Nyalakan **"Live on the public site"** di
  tab **"Publish"** ketika sudah siap.
- **Alamat halaman tidak bisa diubah dari editor**, supaya tautan yang sudah
  tersebar tidak rusak. Hubungi developer bila alamat memang harus berubah.
- **Belum ada riwayat versi.** Untuk perubahan besar, salin dulu teks lamanya
  sebagai cadangan.
- Kalau perubahan belum terlihat, muat ulang dengan `Cmd+Shift+R` /
  `Ctrl+Shift+R`, atau klik ikon segarkan di atas pratinjau.

---

## 6. Pertanyaan umum

**Kanvas tengahnya tidak bisa saya klik untuk mengedit.**
Berarti halaman itu memakai kolom terstruktur. Editnya di tab **"Content"** di
panel kanan; kanvas hanya menampilkan hasilnya.

**Kolom yang saya butuhkan tidak ada di tab "Content".**
Halaman itu belum punya kolom tersebut. Hubungi developer untuk menambahkannya —
jangan memakai tab **"Advanced"** kecuali kamu paham JSON.

**Di mana tombol ganti bahasa?**
Sudah dihapus. Website memakai satu set konten: apa yang kamu tulis, itu yang
tampil.

**Saya tidak sengaja menghapus sesuatu.**
Selama belum menekan **"Save"**, tekan `Ctrl+Z` atau tutup tab tanpa menyimpan.

**Saya lupa password.**
Hubungi Super Admin.

---

## Bantuan

Email: ppiauckland@gmail.com

---

## Referensi teknis (untuk developer)

| Berkas | Peran |
|---|---|
| `web/src/lib/content-schemas.ts` | Kontrak kolom per template. Setiap kunci di sini harus dibaca halaman publiknya. |
| `web/src/components/admin/EditorShell.tsx` | Chrome editor: bar atas, panel, mode kanvas (`frame` / `preview` / `document`) |
| `web/src/app/dashboard/admin/canvas/[...slug]/page.tsx` | Editor halaman |
| `web/src/app/dashboard/admin/canvas/page.tsx` | Editor beranda |
| `web/src/components/admin/CanvasInspector.tsx` | Panel Content / SEO / Publish / Advanced |
| `web/src/components/admin/ContentFormEditor.tsx` | Generator form dari schema |
| `web/src/lib/page-editor.ts` | Satu titik penentu rute editor |
| `web/src/lib/utils.ts` → `pickText` | Fallback dari kolom `*Id` lama ke kolom utama |
| `api/prisma/page-content.ts` | Data awal `Page.content` |
| `api/prisma/verify-page-content-contract.ts` | Menjaga schema CMS tetap cocok dengan yang dibaca halaman publik. Jalankan `npm run db:verify-content-contract` di `api/`. |

`/dashboard/admin/page-builder/[id]` hanya mengalihkan ke canvas demi tautan lama.
Rute `/dashboard/admin/canvas/*` sengaja melewati `DashboardChrome` agar editor
mendapat lebar penuh.
