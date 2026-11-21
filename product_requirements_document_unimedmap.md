# Product Requirements Document (PRD)
## UnimedMap — Interactive Campus Map & Navigation System

| Metadata | Detail |
| :--- | :--- |
| **Nama Produk** | UnimedMap |
| **Versi Dokumen** | 1.0.0 |
| **Status** | Draft |
| **Pemilik Produk** | Tim Pengembang UnimedMap |
| **Target Launch** | Q3 2026 |
| **Tema Visual** | Hijau Tosca (`#00A896` / `#028090`) & Crisp White (`#FFFFFF`) |

---

## 1. Ringkasan Eksekutif (Executive Summary)

**UnimedMap** adalah sistem peta digital dan navigasi kampus interaktif web-based yang dirancang khusus untuk civitas akademika Universitas Negeri Medan (UNIMED). Aplikasi ini mentransformasi peta kampus statis menjadi platform dinamis berbasis web yang mendukung pencarian lokasi gedung/fasilitas secara presisi, visualisasi rute terpendek (*shortest path*) antar-gedung lintas fakultas, serta fleksibilitas tampilan menggunakan *dual-mode base map* (Google Maps dan OpenStreetMap).

---

## 2. Latar Belakang & Pernyataan Masalah

### 2.1 Masalah
1. **Navigasi Terbatas:** Cakupan navigasi digital kampus sebelumnya terbatas pada area tertentu (misalnya FMIPA), sehingga mahasiswa baru, dosen tamu, maupun pengunjung kesulitan menemukan lokasi gedung perkuliahan lain (FT, FE, FBS, FIS, FIK, FIP), biro, dan fasilitas umum.
2. **Denah Statis & Kurang Akurat:** Peta cetak/statis yang ada saat ini tidak memberikan perkiraan waktu tempuh, jalur pejalan kaki optimal, atau informasi detail pintu masuk gedung.
3. **Pengelolaan Data Terpusat yang Kaku:** Penggabungan seluruh data spasial kampus dalam satu berkas besar menyebabkan beban pemuatan (*loading time*) lambat dan menyulitkan pemeliharaan data (*maintenance*) per fakultas.

### 2.2 Tujuan Utama (Objectives)
* **Perluasan Skala Coverage:** Memperluas pemetaan spasial interaktif ke seluruh wilayah kampus Universitas Negeri Medan.
* **Efisiensi Navigasi:** Membantu pengguna menemukan rute berjalan kaki terpendek dan tercepat ke lokasi tujuan dengan memanfaatkan **Algoritma Dijkstra**.
* **Arsitektur Modular:** Membagi struktur data spasial ke dalam format **GeoJSON per Fakultas/Klaster** untuk skalabilitas dan performa aplikasi yang ringan.
* **Pengalaman Pengguna Optimal:** Menyediakan antarmuka *mobile-first* yang bersih dengan bilah pencarian intuitif *"Mau ke mana?"*.

---

## 3. Target Pengguna (User Personas)

1. **Mahasiswa Baru & Mahasiswa Tingkat Akhir:**
   * *Kebutuhan:* Mencari ruang kuliah lintas fakultas, laboratorium, perpustakaan digital, dan fasilitas umum (kantin, musala, ATM).
   * *Perilaku:* Mengakses via ponsel pintar (*mobile web*) saat sedang berjalan di area kampus.
2. **Dosen & Staf Administrasi:**
   * *Kebutuhan:* Menemukan gedung dekanat, biro rektorat, atau ruang pertemuan secara cepat.
3. **Tamu / Pengunjung Luar:**
   * *Kebutuhan:* Navigasi masuk dari gerbang utama ke gedung serbaguna, audit, atau area parkir terdekat.

---

## 4. Spesifikasi Fitur Utama (Core Features)

### 4.1. Floating Search Bar ("Mau ke mana?")
* **Fitur:** Bilah pencarian melayang (*floating*) di bagian atas peta.
* **Fungsionalitas:**
  * Pencarian *real-time* (auto-complete) berdasarkan kata kunci nama gedung, kode ruangan, nama fakultas, atau jenis fasilitas.
  * Filter kategori cepat: `FMIPA`, `FT`, `FE`, `FBS`, `FIS`, `FIK`, `FIP`, `Fasilitas Umum`, `Parkir`.
  * Rekomendasi lokasi terpopuler/terdekat saat *search bar* di-fokuskan.

### 4.2. Dual-Mode Base Map Switcher
* **Fitur:** Tombol sakelar (*toggle switcher*) untuk mengubah layer peta latar belakang.
* **Pilihan Mode:**
  1. **OpenStreetMap (OSM):** Default untuk tampilan vektor gaya peta jalan yang ringan dan bersih.
  2. **Google Maps (Satelit / Hibrid):** Untuk tampilan citra satelit nyata yang intuitif bagi pengguna umum.
* **Persistensi State:** Seluruh layer poligon GeoJSON, penanda (*marker*), dan garis rute tetap dirender pada koordinat yang sama tanpa *reload* halaman saat mode peta berganti.

### 4.3. Engine Routing & Visualisasi Rute (Dijkstra Algorithm)
* **Algoritma:** Algoritma Dijkstra diimplementasikan untuk mencari rute terpendek dalam graf berbobot (di mana *node* = persimpangan/pintu gedung, dan *edge* = segmen jalur pejalan kaki dengan bobot jarak meter).
* **Kompleksitas Waktu:** $O((V + E) \log V)$ menggunakan *priority queue* untuk penentuan rute instan.
* **Fungsionalitas Navigasi:**
  * Penentuan titik asal (*Start Point*): GPS Pengguna (*Current Location*) atau pemilihan manual titik awal di peta.
  * Penentuan titik tujuan (*Destination*): Hasil klik dari pencarian atau pin pada peta.
  * Visualisasi jalur rute berwarna **Hijau Tosca** (`#00A896`) dengan garis berkedip/bergerak (*animated dash array*).
  * Panel informasi rute: Menampilkan total jarak (meter/km) dan perkiraan waktu tempuh jalan kaki.

### 4.4. Information Card (Building Detail Sheet)
* **Fitur:** Kartu informasi melayang/bottom sheet yang muncul saat suatu gedung di-klik atau dipilih dari pencarian.
* **Konten:**
  * Nama Lengkap Gedung & Kode Ruang.
  * Foto Gedung ( thumbnail / pratinjau visual ).
  * Fakultas / Unit Pengelola.
  * Deskripsi Singkat & Fasilitas di dalam gedung.
  * Tombol aksi utama: **"Petunjuk Rute ke Sini"** dan **"Bagikan Lokasi"**.

---

## 5. Arsitektur Data Spasial (GeoJSON Modular)

Untuk menjaga bobot aplikasi tetap ringan (*fast initial load*), data GeoJSON dipecah secara modular berdasarkan wilayah/fakultas:

### 5.1. Struktur File Spasial
```text
public/geojson/
├── network_graph.json       # Graph node & edge jaringan jalan kampus (Routing)
├── fmipa.geojson            # Poligon & Point Gedung FMIPA
├── ft.geojson               # Poligon & Point Gedung FT
├── fe.geojson               # Poligon & Point Gedung FE
├── fbs.geojson              # Poligon & Point Gedung FBS
├── fis.geojson              # Poligon & Point Gedung FIS
├── fik.geojson              # Poligon & Point Gedung FIK
├── fip.geojson              # Poligon & Point Gedung FIP
├── rektorat_fasum.geojson   # Biro, Rektorat, GSG, Perpustakaan
└── parkir_musala.geojson    # Fasilitas pendukung umum
```

### 5.2. Skema Spesifikasi Properti GeoJSON
Setiap entitas fitur pada GeoJSON wajib memiliki atribut properti standar berikut:

```json
{
  "type": "Feature",
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[98.6582, 3.5901], [98.6585, 3.5901], [98.6585, 3.5898], [98.6582, 3.5898], [98.6582, 3.5901]]]
  },
  "properties": {
    "id": "FMIPA-G3",
    "nama": "Gedung Dekanat FMIPA",
    "fakultas": "FMIPA",
    "kategori": "Gedung Utama",
    "deskripsi": "Kantor Dekan, Subbag Akademik, dan Ruang Seminar FMIPA UNIMED",
    "pintu_masuk": [98.65835, 3.58995],
    "foto_url": "/assets/images/buildings/fmipa-dekanat.jpg"
  }
}
```

---

## 6. Kebutuhan Non-Fungsional (Non-Functional Requirements)

1. **Performa & Responsivitas:**
   * Waktu muat awal (*First Contentful Paint*) < 1.5 detik pada jaringan 4G.
   * *Lazy loading* data GeoJSON per wilayah/fakultas saat *viewport* peta diarahkan ke area tersebut.
2. **Kesesuaian Antarmuka (Mobile-First UI/UX):**
   * Desain tombol kontrol peta yang ramah sentuhan ibu jari (*thumb-friendlyzone*).
   * Tata letak responsif penuh dari layar ponsel (360px) hingga layar monitor desktop (1920px).
3. **Akurasi Geospasial:**
   * Koordinat proyeksi menggunakan standar **EPSG:4326 (WGS 84)**.
   * Toleransi akurasi jalur routing pejalan kaki dalam radius $\le 2$ meter dari kenyataan lapangan.

---

## 7. Desain Visual & Panduan Antarmuka (UI Guidelines)

| Elemen Antarmuka | Warna / Kode Hex | Penggunaan |
| :--- | :--- | :--- |
| **Primary Color** | `#00A896` (Hijau Tosca) | Tombol Utama, Header, Jalur Rute Aktif |
| **Secondary Accent** | `#028090` (Tosca Tua) | Hover state, Marker Terpilih, Card Highlight |
| **Background Neutral** | `#F8F9FA` / `#FFFFFF` | Latar belakang Card, Search Bar, Modal |
| **Text Primary** | `#212529` (Dark Charcoal) | Judul Gedung, Teks Pencarian Utama |
| **Text Muted** | `#6C757D` (Slate Gray) | Sub-teks, Jarak Routing, Kategori |

---

## 8. Rencana Implementasi & Milestone

```
[Fase 1: Setup & GeoJSON] ──► [Fase 2: Engine Maps & Dijkstra] ──► [Fase 3: UI/UX Integration] ──► [Fase 4: Testing & Launch]
```

* **Fase 1: Digitalisasi Data Spasial Kampus (Minggu 1-2)**
  * Pemetaan koordinat seluruh gedung UNIMED via QGIS / OpenStreetMap editor.
  * Penyusunan berkas GeoJSON per fakultas dan pembentukan `network_graph.json` untuk jaringan jalan pejalan kaki.
* **Fase 2: Pengembangan Core Engine (Minggu 3-4)**
  * Integrasi Leaflet.js / Mapbox GL JS.
  * Implementasi sakelar dual-mode (Google Maps & OSM).
  * Implementasi Algoritma Dijkstra untuk pencarian rute terpendek.
* **Fase 3: Integrasi Antarmuka & Responsivitas (Minggu 5-6)**
  * Pembuatan komponen *Floating Search Bar* dan *Building Detail Card*.
  * Penerapan tema warna Hijau Tosca & Putih.
  * Pengujian responsivitas layar mobile dan desktop.
* **Fase 4: Pengujian & Peluncuran (Minggu 7)**
  * Uji coba lapangan (*field testing*) akurasi GPS dan rute pejalan kaki.
  * Optimasi bundle JavaScript dan GeoJSON compression.
  * Peluncuran publik (Deployment).

---

## 9. Metrik Keberhasilan (Success KPIs)

1. **Akurasi Rute:** $\ge 95\%$ pengguna berhasil sampai ke titik tujuan tanpa kesalahan penunjuk rute.
2. **Kecepatan Respons:** Waktu kalkulasi rute Dijkstra $< 100\text{ ms}$.
3. **Tingkat Adopsi:** Digunakan oleh minimal $70\%$ mahasiswa baru saat masa orientasi / perkuliahan semester baru.