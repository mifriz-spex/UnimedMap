# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Mahasiswa (baru & tingkat akhir):** mencari ruang kuliah lintas fakultas, laboratorium, perpustakaan, dan fasilitas umum melalui ponsel saat berjalan di area kampus Universitas Negeri Medan (Unimed).
- **Dosen, staf, & tamu/pengunjung:** mencari gedung dekanat, biro rektorat, atau fasilitas kampus dari gerbang/area parkir tanpa perlu login.

## Product Purpose

**UnimedMap** (*Peta Kampus Unimed*) adalah aplikasi web peta interaktif dan navigasi pejalan kaki untuk seluruh fakultas dan fasilitas umum di Universitas Negeri Medan, dilengkapi panduan navigasi lantai detail untuk gedung-gedung FMIPA (kode `001`–`012`).

## Positioning

Navigasi jalan kaki di browser tanpa layanan routing eksternal: menggabungkan algoritma *shortest path* (**Dijkstra** utama, **A\*** pembanding, **Floyd-Warshall** validasi) di atas jaringan trotoar GeoJSON kampus dengan lapisan navigasi lantai terpisah (tangga, lift per lantai yang dilayani, dan koneksi antar-gedung `009`–`010`–`011`), langsung dapat digunakan tanpa login.

## Operating Context

- **Lingkungan penggunaan utama:** layar ponsel di luar ruangan di bawah sinar matahari sambil berjalan kaki (*mobile-first*).
- **Alur utama:** pencarian gedung/ruangan instan, pemilihan titik awal via GPS atau ketuk peta, pratinjau rute jalan kaki dengan estimasi jarak/waktu, instruksi pindah lantai, dan berbagi tautan rute.
- **Mode peta:** *dual-mode* OpenStreetMap dan Citra Satelit Hybrid Google.
- **Pengelolaan data opsional:** antarmuka Admin (`#/admin`) berbasis Supabase untuk pengelolaan data ruangan.

## Capabilities and Constraints

- **Batasan teknis ketat:** logika instans peta Leaflet, binding layer GeoJSON, state routing Dijkstra, serta struktur data di `src/data/` tidak boleh diubah; penyempurnaan UI hanya menyentuh komponen antarmuka, jarak tata letak (*layout spacing*), tipografi, dan hierarki visual.
- **Aturan navigasi & data:** lapisan navigasi lantai terpisah dari graf routing outdoor; dilarang mengarang geometri indoor, koordinat, lantai, koneksi, jarak, atau fasilitas; GPS tidak boleh menebak lantai pengguna.
- **Aturan bahasa & terminologi:** seluruh UI menggunakan **Bahasa Indonesia** yang mudah dipahami pengguna umum. Hindari istilah teknis graf (`node`, `edge`, `vertex`) dan kata `pintu`; gunakan istilah `gedung`, `ruangan`, `lantai`, `tangga`, `lift`, dan `jalur`.

## Brand Commitments

- **Nama produk:** UnimedMap / Peta Kampus Unimed.
- **Komitmen visual mengikat:** palet utama Deep Forest Green (`#064E3B` / `#047857`) dipadukan aksen Charcoal/Black (`#0F172A` / `#111827`) serta permukaan terang berkontras tinggi untuk keterbacaan di luar ruangan; estetika presisi kartografis yang bersih dan utilitarian (tanpa elemen dekoratif berlebih, rasio peta terhadap UI tinggi).

## Evidence on Hand

- Data spasial & gedung: `src/data/` (`tempat.json`, `rooms.json`, `fasilitasGedung.js`, `aturanJalur.json`, `edges_fmipa.geojson`, `koordinat_fmipa.geojson`, `gedung_fmipa.geojson`).
- Foto fisik gedung & fasilitas (WebP): `src/assets/foto/`.
- Logika graf, routing, lantai, GPS, dan pencarian: `src/lib/` (`graph.js`, `routing.js`, `navigasiLantai.js`, `gps.js`, `search.js`).
- Pengujian otomatis Vitest: `src/lib/*.test.js` dan `tests/`.

## Product Principles

1. **Peta di garis depan:** rasio peta terhadap UI harus tinggi sehingga orientasi spasial selalu jelas di layar ponsel.
2. **Keterbacaan luar ruangan:** kontras tinggi dan permukaan terang yang tetap terbaca jelas di bawah sinar matahari.
3. **Presisi kartografis utilitarian:** setiap elemen UI berfungsi membantu menemukan gedung, ruangan, atau jalur; hindari dekorasi yang tidak perlu.
4. **Kejujuran spasial & lantai:** jangan pernah memalsukan jalur indoor, koordinat, atau menebak lantai dari GPS.
5. **Bahasa sehari-hari yang jelas:** gunakan Bahasa Indonesia yang lugas (`gedung`, `ruangan`, `lantai`, `tangga`, `lift`, `jalur`) tanpa jargon graf.

## Accessibility & Inclusion

- Target kontras minimal **WCAG AA** untuk seluruh teks, label, dan kontrol interaktif di layar ponsel luar ruangan.
- Ergonomi *mobile-first* ramah satu tangan (target sentuh memadai, *bottom sheet* responsif), dukungan navigasi keyboard (`focus-visible`), serta menghormati `prefers-reduced-motion`.
