# Ngab Dracin - Platform Streaming Drama China Web

Platform web streaming responsif dan PWA untuk menonton serial **Drama China (Dracin)**, **Shorts Drama (Reels/TikTok format)**, dan konten **Sulih Suara Bahasa Indonesia (DubIndo)**. 

Proyek ini terintegrasi dengan ekosistem API resmi Dramabuzz multi-platform (DramaBox, ShortMax, NetShort, Melolo) dan didesain modern berbasis **Next.js 16 (App Router)**.

---

## 🚀 Fitur Utama

1. **Beranda & Rekomendasi Pintar (`/`)**:
   - Hero banner carousel dengan efek sinematik dan sinopsis interaktif.
   - Kategori cepat: Trending, Dubbing Indonesia, Shorts, VIP, Romantis, CEO, Balas Dendam.
   - Paginasi horisontal responsif untuk smartphone dan desktop.

2. **Shorts Drama Vertikal (`/shorts`)**:
   - Tampilan layar penuh 9:16 ala TikTok/Instagram Reels.
   - Auto-play video, kontrol swipe vertikal, dan tombol keyboard panah atas/bawah.
   - Tautan langsung ke seluruh episode drama.

3. **Sulih Suara Indonesia / DubIndo (`/dubindo`)**:
   - Halaman khusus drama dengan audio bahasa Indonesia tanpa perlu lelah membaca subtitle.

4. **Pemutar Video Canggih & Lancar (`/watch/[source]/[id]/[episode]`)**:
   - Player modern berbasis HTML5 Video & HLS.
   - Direct Akamai CDN Streaming (bebas buffering tanpa stalling).
   - Pemilih resolusi/kualitas (480p, 540p, 720p, 1080p).
   - Pengatur kecepatan putar (0.75x, 1x, 1.25x, 1.5x, 2x).
   - Otomatis melanjutkan episode berikutnya (*Auto Next Episode*).
   - Sidebar/drawer pemilihan episode langsung di samping player.
   - **Fitur Unduh Episode**: Tombol unduh langsung untuk mendownload file `.mp4` episode yang sedang diputar.

5. **Pencarian Cepat & Riwayat (`/search`)**:
   - Real-time search dengan kata kunci populer dan riwayat pencarian lokal.

6. **Perpustakaan & Riwayat Tontonan (`/library`)**:
   - Menyimpan bookmark drama favorit.
   - Riwayat tontonan tersimpan otomatis di browser (localStorage) lengkap dengan progres detik terakhir tanpa mewajibkan pengguna login.

7. **Edge Video Streaming Proxy (`/api/proxy/video`)**:
   - Bypass validasi CORS & `Referer` CDN upstream.
   - Mendukung HTTP 206 (*Range Requests*) untuk *seeking/scrubbing* lancar.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack, React 19)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Video Engine**: HTML5 Native Video + [Hls.js](https://github.com/video-dev/hls.js/)
- **Deployment**: [Cloudflare Pages / Workers](https://pages.cloudflare.com/)

---

## 🔑 Konfigurasi Lingkungan (.env)

Buat file `.env.local` atau atur Environment Variables di Cloudflare / hosting Anda:
```env
DRAMABUZZ_KEY=B6860FC6979E745EF0C85B5E3496B5D2
NEXT_PUBLIC_DRAMABUZZ_KEY=B6860FC6979E745EF0C85B5E3496B5D2
```

---

## ⚡ Memulai Pengembangan

### 1. Jalankan Dev Server
```bash
npm run dev
```
Buka browser di `http://localhost:3000`.

### 2. Build untuk Produksi
```bash
npm run build
npm run start
```

---

## 📄 Dokumen Perencanaan (PRD)
Spesifikasi lengkap dan arsitektur migrasi dapat dilihat pada dokumen [PRD.md](./PRD.md).
