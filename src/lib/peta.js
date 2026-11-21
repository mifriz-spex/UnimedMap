// peta.js - bentuk poligon gedung, titik pusat label, dan batas tampilan peta. Murni (tanpa DOM).

import { pusatPoligon } from './geo'

/** Poligon gedung dipetakan ke tempat lewat properti `poligon` pada tempat.json. */
export function bentukPoligon(poligonGeoJson, daftarTempat) {
  const tempatByPoligon = new Map(daftarTempat.map((t) => [t.poligon, t]))
  const hasil = []
  for (const f of poligonGeoJson.features) {
    const tempat = tempatByPoligon.get(String(f.properties.id))
    if (!tempat) continue
    const cincin = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates.map((p) => p[0]) : [f.geometry.coordinates[0]]
    const terbesar = cincin.reduce((a, b) => (b.length > a.length ? b : a), cincin[0])
    hasil.push({
      tempatId: tempat.id,
      label: tempat.label,
      kelompok: tempat.kelompok,
      positions: cincin.map((r) => r.map(([lon, lat]) => [lat, lon])),
      pusat: pusatPoligon(terbesar),
    })
  }
  return hasil
}

/** Batas [[selatan, barat], [utara, timur]] yang memuat seluruh kampus Unimed dan titik jalan. */
export function batasPeta(bentuk = [], pointsById = {}, margin = 0.0003) {
  let minLat = Infinity
  let maxLat = -Infinity
  let minLon = Infinity
  let maxLon = -Infinity

  for (const b of (bentuk || [])) {
    for (const cincin of (b.positions || [])) {
      for (const [la, lo] of cincin) {
        if (la < minLat) minLat = la
        if (la > maxLat) maxLat = la
        if (lo < minLon) minLon = lo
        if (lo > maxLon) maxLon = lo
      }
    }
  }

  for (const p of Object.values(pointsById || {})) {
    if (p.lat < minLat) minLat = p.lat
    if (p.lat > maxLat) maxLat = p.lat
    if (p.lon < minLon) minLon = p.lon
    if (p.lon > maxLon) maxLon = p.lon
  }

  if (!Number.isFinite(minLat) || !Number.isFinite(minLon)) {
    return [
      [3.6050, 98.7110],
      [3.6110, 98.7230],
    ]
  }

  return [
    [minLat - margin, minLon - margin],
    [maxLat + margin, maxLon + margin],
  ]
}

/** Warna dan kategori tempat menurut kelompok/fakultas (juga dipakai pada legenda dan pencarian). */
export const KELOMPOK = {
  pusat: { nama: 'Gedung Pusat / Rektorat', warna: '#4f46e5' },
  fmipa: { nama: 'FMIPA', warna: '#0284c7' },
  ft: { nama: 'Fakultas Teknik (FT)', warna: '#ea580c' },
  fbs: { nama: 'Fakultas Bahasa & Seni (FBS)', warna: '#ca8a04' },
  fis: { nama: 'Fakultas Ilmu Sosial (FIS)', warna: '#16a34a' },
  fik: { nama: 'Fakultas Ilmu Keolahragaan (FIK)', warna: '#dc2626' },
  fe: { nama: 'Fakultas Ekonomi (FE)', warna: '#9333ea' },
  fip: { nama: 'Fakultas Ilmu Pendidikan (FIP)', warna: '#0891b2' },
  fk: { nama: 'Fakultas Kedokteran (FK)', warna: '#e11d48' },
  umum: { nama: 'Fasilitas Umum', warna: '#4b5563' },
  jurusan: { nama: 'Gedung Jurusan / Kuliah', warna: '#0369a1' },
  lab: { nama: 'Laboratorium', warna: '#0f766e' },
  lainnya: { nama: 'Gedung Lainnya', warna: '#b45309' },
  taman: { nama: 'Taman & Fasilitas Luar', warna: '#15803d' },
}

export const URUTAN_KELOMPOK = [
  'pusat',
  'fmipa',
  'ft',
  'fbs',
  'fis',
  'fik',
  'fe',
  'fip',
  'fk',
  'umum',
  'jurusan',
  'lab',
  'lainnya',
  'taman',
]
