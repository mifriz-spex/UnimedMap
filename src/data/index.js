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

// Sambungkan gedung dari ruangan_unimed.js ke titik lokasi di tempat.json
const tempat = tempatMentah.map((t) => {
  if (t.gedung && t.gedung.length > 0) return t
  const namaTarget = String(t.nama || '').toLowerCase()
  const cocok = daftarGedung.filter((g) => {
    const namaG = String(g.nama || g.namaGedung || g.gedung || '').toLowerCase()
    const kodeG = String(g.kode || g.kodeGedung || '')
    return (kodeG && namaTarget.includes(kodeG)) || (namaG && namaTarget && namaG.includes(namaTarget.replace(/^gedung\s+/i, '')))
  })
  return cocok.length > 0
    ? { ...t, gedung: cocok.map((g) => ({ kode: String(g.kode || g.kodeGedung) })) }
    : t
})

// Ubah field kodeRuangan menjadi kode agar dikenali sistem pencarian & lantai
const ruanganMentah = dataRuangan.map((r) => ({
  ...r,
  kode: r.kodeRuangan || r.kode || '',
  status: 'resmi',
}))

export const graphData = buildGraph(koordinat, edges)
export const indeks = bangunIndeksTempat(tempat, graphData.pointsById)
export const bentuk = bentukPoligon(poligon, tempat)
export const batas = batasPeta(bentuk, graphData.pointsById)
export const ruanganLokal = normalisasiSemua(ruanganMentah, tempat)
export { tempat, ruanganMentah }