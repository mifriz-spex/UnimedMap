import { IkonGedung, IkonRuang } from './Ikon'
import { formatJarak, teksLantai } from '../lib/format'
import { KELOMPOK } from '../lib/peta'

function geserFokus(e) {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
  const tombol = [...e.currentTarget.querySelectorAll('[data-hasil]')]
  const i = tombol.indexOf(document.activeElement)
  if (i === -1) return
  e.preventDefault()
  if (e.key === 'ArrowUp' && i === 0) {
    e.currentTarget.closest('section')?.querySelector('input[type="search"]')?.focus()
    return
  }
  const berikut = e.key === 'ArrowDown' ? tombol[i + 1] || tombol[0] : tombol[i - 1]
  berikut?.focus()
}

const kelas = 'flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-sky-400 hover:bg-sky-50 focus-visible:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:border-slate-200 disabled:hover:bg-white min-h-[48px]'

function BadgeFakultas({ fakultas }) {
  if (!fakultas) return null
  const label = fakultas === 'Fasilitas Umum' ? 'Umum' : fakultas
  return (
    <span className="ml-1.5 inline-flex flex-none items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
      {label}
    </span>
  )
}

export default function HasilPencarian({ hasil, kueri, namaTempat, onPilihTempat, onPilihRuangan, onSaran, denganJarak }) {
  if (!kueri.trim()) return null

  if (hasil.kosong) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-700" role="status">
        <p>Tidak ada hasil untuk &ldquo;{kueri}&rdquo;.</p>
        {hasil.saran && (
          <p className="mt-2">
            Maksud kamu{' '}
            <button type="button" onClick={() => onSaran(hasil.saran)} className="min-h-[44px] inline-flex items-center font-semibold text-sky-800 underline p-1">
              {hasil.saran}
            </button>
            ?
          </p>
        )}
        <p className="mt-2 text-slate-600">Coba kata yang lebih singkat, misalnya nama gedung, fakultas, &ldquo;toilet&rdquo;, atau &ldquo;dekan&rdquo;.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4" onKeyDown={geserFokus}>
      {hasil.tempat.length > 0 && (
        <section aria-label="Hasil gedung dan tempat">
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">Gedung dan tempat</h3>
          <ul className="space-y-1.5">
            {hasil.tempat.map(({ tempat, jarak }) => {
              const subJudul = KELOMPOK[tempat.kelompok]?.nama || tempat.fakultas || 'Area kampus'
              return (
                <li key={tempat.id}>
                  <button type="button" data-hasil className={kelas} onClick={() => onPilihTempat(tempat)}>
                    <span className="mt-0.5 text-sky-800"><IkonGedung /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-1">
                        <span className="font-semibold text-slate-900">{tempat.nama}</span>
                        <BadgeFakultas fakultas={tempat.fakultas} />
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-600">
                        {subJudul}
                        {denganJarak && Number.isFinite(jarak) ? ` · ${formatJarak(jarak)} dari titik awal` : ''}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {hasil.ruangan.length > 0 && (
        <section aria-label="Hasil ruangan">
          {!denganJarak && hasil.totalRuangan > 8 && (
            <p className="mb-2 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-950">
              Banyak hasil. Pilih titik awal dulu supaya yang paling dekat denganmu muncul lebih dulu.
            </p>
          )}
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">Ruangan</h3>
          <ul className="space-y-1.5">
            {hasil.ruangan.map((r) => {
              const namaGedung = namaTempat.get(r.tempatId) || r.namaGedung || 'Gedung belum dipetakan'
              return (
                <li key={r.id}>
                  <button type="button" data-hasil className={kelas} onClick={() => onPilihRuangan(r)} disabled={!r.tempatId}>
                    <span className="mt-0.5 text-teal-800"><IkonRuang /></span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-1">
                        <span className="font-semibold text-slate-900">{r.nama}</span>
                        <BadgeFakultas fakultas={r.fakultas} />
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-600">
                        {namaGedung} · {teksLantai(r.lantai)}
                        {r.jumlah > 1 ? ` · ${r.jumlah} ruangan` : ''}
                        {r.kodeTampil && r.jumlah === 1 ? ` · kode ${r.kodeTampil}` : ''}
                        {denganJarak && Number.isFinite(r.jarak) ? ` · ${formatJarak(r.jarak)}` : ''}
                        {!r.tempatId ? ' · Titik peta belum tersedia' : ''}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          {hasil.totalRuangan > hasil.ruangan.length && (
            <p className="mt-2 text-xs text-slate-600">
              Menampilkan {hasil.ruangan.length} dari {hasil.totalRuangan} hasil. Tambahkan kata (misalnya nama gedung atau fakultas) untuk mempersempit.
            </p>
          )}
        </section>
      )}
    </div>
  )
}