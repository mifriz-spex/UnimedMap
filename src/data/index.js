import koordinatRaw from './koordinat_fmipa.geojson?raw'
import edgesRaw from './edges_fmipa.geojson?raw'
import poligonRaw from './gedung_fmipa.geojson?raw'
import tempatMentah from './tempat.json'
import { daftarGedung, dataRuangan } from './ruangan_unimed.js'
import { buildGraph } from '../lib/graph'
import { bangunIndeksTempat } from '../lib/places'
import { bentukPoligon, batasPeta } from '../lib/peta'
import { normalisasiSemua } from '../lib/rooms'

export const koordinat = JSON.parse(koordinatRaw)
export const edges = JSON.parse(edgesRaw)
export const poligon = JSON.parse(poligonRaw)

// Helper: normalisasi nama fakultas (mis. "FIK" <-> "FIKK", "FE" <-> "FEB")
function normFakultas(fak) {
  const f = String(fak || '').toUpperCase().trim()
  if (f === 'FIK') return 'FIKK'
  if (f === 'FE') return 'FEB'
  return f
}

// Helper: ekstrak angka gedung dari nama tempat (mis. "Gedung FEB 36" -> "036", "Gedung 33 FIK" -> "033")
function ekstrakKodeAngka(nama) {
  const match = String(nama || '').match(/\b(\d{1,3})\b/)
  return match ? match[1].padStart(3, '0') : null
}

// Sambungkan gedung dari ruangan_unimed.js ke titik lokasi di tempat.json (tanpa perlu poligon)
const tempat = tempatMentah.map((t) => {
  if (Array.isArray(t.gedung) && t.gedung.length > 0) return t

  const namaTarget = String(t.nama || '').toLowerCase()
  const fakTarget = normFakultas(t.fakultas)
  const kodeDariNama = ekstrakKodeAngka(t.nama)

  const cocok = daftarGedung.filter((g) => {
    const kodeG = String(g.kodeGedung ?? g.kode ?? '').padStart(3, '0')
    const namaG = String(g.namaGedung ?? g.nama ?? '').toLowerCase()
    const fakG = normFakultas(g.fakultas)

    // 1. Cocokkan lewat angka gedung + fakultas yang sama (mis. "Gedung 33 FIK" -> kode "033" FIKK)
    if (kodeDariNama && kodeG === kodeDariNama && (!fakTarget || !fakG || fakTarget === fakG)) {
      return true
    }

    // 2. Cocokkan lewat kemiripan nama gedung (abaikan kata umum "gedung" & singkatan fakultas)
    const bersihTarget = namaTarget
      .replace(/\b(gedung|fmipa|ft|fik|fikk|fbs|fis|fe|feb|fip|fk|unimed)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    const bersihG = namaG
      .replace(/\b(gedung|fmipa|ft|fik|fikk|fbs|fis|fe|feb|fip|fk|unimed)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    if (bersihTarget.length >= 4 && bersihG.length >= 4) {
      const samaFakultas = !fakTarget || !fakG || fakTarget === fakG
      if (samaFakultas && (bersihG.includes(bersihTarget) || bersihTarget.includes(bersihG))) {
        return true
      }
    }

    return false
  })

  return {
    ...t,
    gedung: cocok.map((g) => ({
      kode: String(g.kodeGedung ?? g.kode).padStart(3, '0'),
      lantai: g.totalLantai || 1,
    })),
  }
})

// Petakan field ruangan_unimed.js ke skema yang dibaca normalisasiRuangan() di rooms.js
const ruanganMentah = dataRuangan.map((r) => ({
  ...r,
  kode: r.kodeRuangan ?? r.kode ?? '',
  nama: r.namaRuangan ?? r.nama ?? '',
  nomor: r.ruangan ?? r.nomor ?? '',
  alias: r.alias ?? [r.namaGedung, r.fakultas].filter(Boolean).join(' '),
  status: 'resmi',
}))

export const graphData = buildGraph(koordinat, edges)
export const indeks = bangunIndeksTempat(tempat, graphData.pointsById)
export const bentuk = bentukPoligon(poligon, tempat)
export const batas = batasPeta(bentuk, graphData.pointsById)
export const ruanganLokal = normalisasiSemua(ruanganMentah, tempat)

export { tempat, ruanganMentah }