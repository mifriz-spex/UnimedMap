import { useMemo, useState } from 'react'
import { IkonPanah } from './Ikon'
import { KELOMPOK } from '../lib/peta'
import { formatJarak } from '../lib/format'
import { posisiRelatif } from '../lib/places'

const URUTAN_FAKULTAS = [
  'FMIPA',
  'FT',
  'FIK',
  'FBS',
  'FIS',
  'FE',
  'FIP',
  'FK',
  'Rektorat',
  'Fasilitas Umum',
]

export default function Jelajahi({ orientasi, indeks, ruangan, pilihanCepat, onBuka, onCari }) {
  const [filterFak, setFilterFak] = useState('SEMUA')
  const pusat = orientasi?.pusat

  // Hitung jumlah ruangan per tempatId sekali saja (O(N)) agar render cepat
  const jumlahRuanganPerTempat = useMemo(() => {
    const map = new Map()
    for (const r of ruangan) {
      if (!r.tempatId) continue
      map.set(r.tempatId, (map.get(r.tempatId) || 0) + 1)
    }
    return map
  }, [ruangan])

  // Daftar fakultas yang tersedia di tempat.json sesuai urutan rapi
  const daftarFakultasTersedia = useMemo(() => {
    const ada = new Set(indeks.daftar.map((t) => t.fakultas || 'Lainnya'))
    const terurut = URUTAN_FAKULTAS.filter((f) => ada.has(f))
    const sisa = [...ada].filter((f) => !URUTAN_FAKULTAS.includes(f)).sort()
    return [...terurut, ...sisa]
  }, [indeks.daftar])

  const grupTampil = useMemo(() => {
    const fakultasAktif = filterFak === 'SEMUA' ? daftarFakultasTersedia : [filterFak]
    return fakultasAktif
      .map((fak) => ({
        fakultas: fak,
        items: indeks.daftar.filter((t) => (t.fakultas || 'Lainnya') === fak),
      }))
      .filter((g) => g.items.length > 0)
  }, [filterFak, daftarFakultasTersedia, indeks.daftar])

  return (
    <section aria-label="Jelajahi Kampus Unimed" className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Jelajahi Kampus Unimed</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-700">
          Pilih fakultas atau ketuk salah satu gedung di bawah untuk melihat lokasi, daftar ruangan per lantai, dan rute jalan kaki.
        </p>
      </div>

      {pilihanCepat.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Cari cepat</h3>
          <div className="flex flex-wrap gap-2">
            {pilihanCepat.map((p) => (
              <button key={p.kueri} type="button" onClick={() => onCari(p.kueri)} className="rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-sm font-semibold text-slate-900 hover:border-sky-500 hover:bg-sky-50">
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter Chip Fakultas */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Filter Fakultas & Area</h3>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setFilterFak('SEMUA')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              filterFak === 'SEMUA'
                ? 'bg-sky-800 text-white'
                : 'border border-slate-300 bg-white text-slate-700 hover:border-sky-500 hover:bg-sky-50'
            }`}
          >
            Semua ({indeks.daftar.length})
          </button>
          {daftarFakultasTersedia.map((fak) => {
            const aktif = filterFak === fak
            const label = fak === 'Fasilitas Umum' ? 'Umum' : fak
            return (
              <button
                key={fak}
                type="button"
                onClick={() => setFilterFak(fak)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  aktif
                    ? 'bg-sky-800 text-white'
                    : 'border border-slate-300 bg-white text-slate-700 hover:border-sky-500 hover:bg-sky-50'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Daftar Gedung per Fakultas */}
      <div className="space-y-5">
        {grupTampil.map(({ fakultas, items }) => (
          <div key={fakultas}>
            <h3 className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-600">
              <span>{fakultas}</span>
              <span className="text-[11px] font-normal text-slate-500">{items.length} lokasi</span>
            </h3>
            <ul className="space-y-1.5">
              {items.map((t) => {
                const rel = pusat && t.id !== pusat.id ? posisiRelatif(indeks, pusat.id, t.id) : null
                const jumlah = jumlahRuanganPerTempat.get(t.id) || 0
                const lantai = Math.max(0, ...(t.gedung || []).map((g) => g.lantai || 0))
                const warna = KELOMPOK[t.kelompok]?.warna || '#0284c7'

                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => onBuka(t.id)}
                      className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-sky-400 hover:bg-sky-50"
                    >
                      <span
                        className="h-3 w-3 flex-none rounded-full border"
                        style={{ backgroundColor: `${warna}40`, borderColor: warna }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-slate-900">{t.nama}</span>
                        <span className="mt-0.5 block text-xs text-slate-600">
                          {rel ? `${rel.arah} ${pusat.label}, ±${formatJarak(rel.jarak)}` : 'Pusat kawasan'}
                          {lantai > 0 ? ` · ${lantai} lantai` : ''}
                          {jumlah > 0 ? ` · ${jumlah} ruangan` : ''}
                        </span>
                      </span>
                      <span className="text-slate-400"><IkonPanah /></span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}