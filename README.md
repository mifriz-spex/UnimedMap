# Peta Kampus Hijau Unimed

Aplikasi web navigasi interaktif untuk mencari gedung, fasilitas, dan ruangan di kawasan **Universitas Negeri Medan (Unimed)** serta menampilkan rute jalan kaki tercepat. Dirancang khusus dengan identitas khas "Kampus Hijau" agar mahasiswa baru, tamu, maupun civitas akademika dapat menemukan lokasi gedung dan ruangan di seluruh Unimed dengan mudah dan presisi.

Jalur terpendek dihitung menggunakan algoritma **Dijkstra** (utama) dan **A\*** (pembanding), serta divalidasi secara otomatis dengan algoritma **Floyd-Warshall**. Seluruh logika graf dan validasi rute diimplementasikan di `src/lib/graph.js` dan `src/lib/routing.js`.

---

## 🌟 Fitur Utama

- **Mode Peta Ganda (OSM & Satelit Google)**: Pengguna dapat dengan mudah beralih antara tampilan peta vektor **OpenStreetMap** dan **Citra Satelit Hybrid Google** (dilengkapi label jalan dan atap bangunan) di bagian kontrol atas peta.
- **Pencarian Pintar & Toleran Kesalahan**: Cari nama gedung, fakultas (FMIPA, FT, FBS, FIS, FIK, FE, FIP, FK), atau ruangan (mis. "Dekan", "TU", "Lab Komputer", "Toilet", "Musholla", "Digital Library"). Dikelola dengan saran pengetikan ("Maksud kamu ...?") dan sistem sinonim.
- **Penentuan Titik Awal Fleksibel**:
  - Lokasi saya secara langsung via **GPS** (Real-time).
  - Cari nama gedung/ruangan awal.
  - Ketuk langsung titik gedung pada peta (*interactive pin selection*).
- **Rute Presisi & Detail Interaktif**:
  - Perkiraan jarak (meter) dan waktu tempuh jalan kaki.
  - Pintu masuk gedung yang disarankan.
  - Langkah petunjuk navigasi antar lantai dan koneksi antar gedung.
  - Penyesuaian rute otomatis jika ada pintu gedung yang ditutup sementara.
- **Foto Visual Gedung (WebP)**: Foto fisik gedung dan fasilitas kampus pada rincian gedung dan kartu rute hasil pencarian untuk memudahkan pengenalan visual saat tiba di lokasi.
- **Identitas Kampus Hijau (Emerald Theme)**: Antarmuka berbasis warna *Emerald*, *Teal*, dan *Lime* yang sejuk, kontras tinggi (WCAG AA), dan mempertahankan warna khas fakultas pada penanda peta (PKKMB color code).
- **Bagikan Rute**: Salin tautan rute langsung untuk dibagikan ke teman; membuka tautan akan langsung menampilkan jalur rute di peta.
- **Desain Responsif & Ramah Aksesibilitas**: Responsif penuh di smartphone (bottom sheet drawer bergeser) dan PC/Desktop, mendukung navigasi keyboard dan *screen reader*.

---

## 💻 Menjalankan di Lokal

Pastikan Node.js (v18+) sudah terpasang di komputer kamu:

```bash
npm install
npm run dev        # Jalankan server lokal (http://localhost:5173)
npm test           # Pengujian otomatis: data graf, algoritma rute, foto, pencarian
npm run lint       # Cek standar penulisan kode
npm run build      # Hasil build statis siap deploy di folder /dist
```

> **Catatan Fitur GPS**: Fitur lokasi GPS memerlukan koneksi **HTTPS** saat di-deploy di web server publik (atau berjalan di `localhost` saat tahap pengembangan).

---

## 🛠️ Cara Deploy ke GitHub Pages

Aplikasi ini bersifat **statis 100%** dan dapat di-host secara gratis via GitHub Pages:

1. **Jalankan build dan deploy via terminal:**
   ```bash
   npm run build
   npx gh-pages -d dist
   ```
2. **Atur di Repository GitHub:**
   - Buka **Settings** $\rightarrow$ **Pages**.
   - Pada bagian **Build and deployment $\rightarrow$ Branch**, pilih **`gh-pages`** dengan folder **`/ (root)`**, lalu simpan.

---

## 📁 Struktur Direktori & Berkas

| Folder / Berkas | Deskripsi & Fungsi |
|---|---|
| `src/data/koordinat_unimed.geojson` | Simpul titik jaringan jalan pejalan kaki (pintu masuk & persimpangan jalur) |
| `src/data/edges_unimed.geojson` | Ruas jalur jalan kaki pejalan kaki (digambar via QGIS) |
| `src/data/gedung_unimed.geojson` | Poligon bentuk gedung untuk render visual di peta |
| `src/data/tempat.json` | **Sumber data utama** gedung: nama, kelompok, fakultas, kode gedung, titik jaringan, dan koordinat |
| `src/data/rooms.json` | Data ruangan bawaan kampus Unimed |
| `src/data/aturanJalur.json` | Konfigurasi aturan jalur penyesuaian (pintu tertutup, titik transit khusus) |
| `src/assets/foto/` | Koleksi foto visual gedung & fasilitas kampus dalam format WebP terkompresi |
| `src/components/MapView.jsx` | Komponen utama peta Leaflet (Layer OSM, Satelit Google, poligon, label anti-tumpuk) |
| `src/components/KartuRute.jsx` | Tampilan hasil rute, petunjuk navigasi lantai, dan pembandingan algoritma |
| `src/lib/graph.js` | Implementasi Algoritma Dijkstra, A\*, dan Floyd-Warshall |
| `src/lib/routing.js` | Logika navigasi rute antar tempat, penghitungan jarak, dan petunjuk langkah |
| `scripts/bangun-jaringan.mjs` | Skrip noding & pembangun topologi jaringan jalan dari data mentah QGIS |
| `scripts/kecilkan-foto.mjs` | Skrip kompresi & optimasi foto gedung ke format WebP (maks 1280px, hapus EXIF) |
| `supabase/schema.sql` | Skema database PostgreSQL / Supabase untuk manajemen data ruangan (opsional) |

---

## 🔄 Mengembangkan & Mengubah Data Peta

### 1. Menambah / Mengubah Gedung
1. Gambar poligon gedung di `gedung_unimed.geojson`.
2. Hubungkan simpul pintu dan jalur jalan kaki di `koordinat_unimed.geojson` & `edges_unimed.geojson`.
3. Tambahkan objek gedung baru di `src/data/tempat.json` dengan menyamakan nomor `"titik"` dan `"id"`.
4. Jalankan `npm test` untuk memverifikasi integritas topologi graf dan pemetaan foto.

### 2. Regenerasi Topologi Jaringan Jalan (QGIS Export)
Jika mengekspor jalur pejalan kaki baru dari QGIS ke `scripts/data-mentah/edges_raw.geojson`:
```bash
node scripts/bangun-jaringan.mjs          # Mode Dry-run (Uji validasi topologi)
node scripts/bangun-jaringan.mjs --tulis  # Mode Tulis (Memperbarui data di src/data/)
```

### 3. Menambah Foto Gedung Baru
Simpan foto gedung di folder `src/assets/foto/` dengan nama file sesuai `"id"` tempat (contoh: `digital-library.webp`, `auditorium-unimed.webp`). Pastikan rasio foto **4:3** dan berformat `.webp`.

---

## 🗄️ Layanan Data Ruangan (Supabase - Opsional)

Untuk pengelolaan data ruangan secara dinamis melalui antarmuka Admin (`#/admin`):
1. Buat proyek di [Supabase](https://supabase.com) dan jalankan berkas `supabase/schema.sql` pada SQL Editor.
2. Buat akun Admin pada menu **Authentication**.
3. Duplikat file `.env.example` menjadi `.env`, lalu masukkan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`.
4. Akses halaman `#/admin` di aplikasi web untuk mulai melengkapi atau mengedit data ruangan kampus.

---

## 📊 Pengujian Sistem (`npm test`)

Rangkaian pengujian mencakup:
- **Integritas Graf**: ID simpul unik, konektivitas seluruh jaringan jalur pejalan kaki, serta kesesuaian koordinat.
- **Algoritma Navigasi**: Verifikasi keakuratan jarak minimum Dijkstra = A\* = Floyd-Warshall pada seluruh pasangan titik kampus.
- **Pencarian**: Uji akurasi penanganan kesalahan ketik, alias sinonim, serta urutan prioritas tempat terdekat.
- **Kelengkapan Aset**: Pemetaan berkas foto WebP untuk setiap entri gedung di `tempat.json`.