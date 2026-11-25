import { useMemo, useState } from 'react'
import { IkonBawah, IkonKembali, IkonTutup } from './Ikon'
import { KELOMPOK } from '../lib/peta'
import { formatJarak, teksLantai } from '../lib/format'
import { posisiRelatif, tempatTerhubung } from '../lib/places'
import { ringkasanIsi, ruanganPerLantai } from '../lib/rooms'
import { kebutuhanKueri, cocokKebutuhan, normalizeText } from '../lib/search'
import { ambilFotoTempat } from '../lib/foto'

export default function DetailTempat({ tempat, indeks, graph, ruangan, aturan, onKembali, onRuteKe, onRuteDari, onBuka, onPilihRuangan }) {
  const [saring, setSaring] = useState('')
  const [lantaiAktif, setLantaiAktif] = useState('semua')
  const [prevTempatId, setPrevTempatId] = useState(tempat.id)

  if (prevTempatId !== tempat.id) {
    setPrevTempatId(tempat.id)
    setSaring('')
    setLantaiAktif('semua')
  }

  const isi = useMemo(() => ringkasanIsi(ruangan, tempat.id), [ruangan, tempat.id])
  const lantai = useMemo(() => ruanganPerLantai(ruangan, tempat.id), [ruangan, tempat.id])
  const terhubung = useMemo(() => tempatTerhubung(indeks, graph, tempat.id), [indeks, graph, tempat.id])

  const pusat = useMemo(
    () =>
      indeks.daftar.find((t) => t.id === 'gedung-biro') ||
      indeks.daftar.find((t) => t.kelompok === 'pusat'),
    [indeks]
  )
  const rel = pusat && pusat.id !== tempat.id ? posisiRelatif(indeks, pusat.id, tempat.id) : null
  const fotoUrl = useMemo(() => ambilFotoTempat(tempat.id), [tempat.id])
  const infoKelompok = KELOMPOK[tempat.kelompok]

  const semuaTitik = useMemo(() => tempat.titikSemua || tempat.titik || [], [tempat])
  const catatanAturan = useMemo(() => {
    if (!aturan) return []
    const catatan = []
    for (const p of aturan.pintuTertutup || []) {
      if (semuaTitik.includes(Number(p.id))) {
        catatan.push({ jenis: 'tertutup', teks: p.alasan })
      }
    }
    for (const u of aturan.titikUjungSaja || []) {
      if (semuaTitik.includes(Number(u.id))) {
        catatan.push({ jenis: 'ujung', teks: u.alasan })
      }
    }
    return catatan
  }, [aturan, semuaTitik])

  const kebutuhan = kebutuhanKueri(saring)
  const tersaring = useMemo(
    () =>
      lantai
        .filter((l) => lantaiAktif === 'semua' || String(l.lantai) === String(lantaiAktif))
        .map((l) => ({
          ...l,
          ruangan: kebutuhan.length
            ? l.ruangan.filter((r) => cocokKebutuhan(normalizeText(`${r.nama} ${r.alias}`), kebutuhan))
            : l.ruangan,
        }))
        .filter((l) => l.ruangan.length),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lantai, saring, lantaiAktif]
  )

  return (
    <article aria-label={`Rincian ${tempat.nama}`} className="space-y-5">
      <button type="button" onClick={onKembali} className="min-h-[44px] inline-flex items-center gap-1.5 text-sm font-semibold text-[#064E3B] hover:text-[#047857] py-1.5">
        <IkonKembali ukuran={18} /> Kembali
      </button>

      {fotoUrl && (
        <div className="relative aspect-[16/9] w-full max-w-full overflow-hidden rounded-2xl bg-slate-100 shadow-xs sm:aspect-[4/3]">
          <img
            src={fotoUrl}
            alt={`Foto ${tempat.nama}`}
            loading="lazy"
            className="h-full w-full max-w-full object-cover"
          />
        </div>
      )}

      <header>
        {infoKelompok && (
          <span
            className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-[#0F172A]"
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: infoKelompok.warna }} />
            {tempat.fakultas && tempat.fakultas !== infoKelompok.nama
              ? `${tempat.fakultas} · ${infoKelompok.nama}`
              : infoKelompok.nama}
          </span>
        )}
        <h2 className="text-xl font-bold text-slate-900">{tempat.nama}</h2>
        {tempat.namaLengkap && tempat.namaLengkap !== tempat.nama && (
          <p className="text-sm text-slate-700">{tempat.namaLengkap}</p>
        )}
        <p className="mt-1 text-sm text-slate-800">
          {rel ? `Di ${rel.arah} ${pusat.nama}, sekitar ${formatJarak(rel.jarak)} dari pusat kampus.` : 'Berada di pusat kawasan kampus.'}
          {tempat.gedung.length > 0 && ` Kode gedung ${tempat.gedung.map((g) => g.kode).join(' dan ')}.`}
        </p>
      </header>

      {catatanAturan.length > 0 && (
        <div className="space-y-1.5" role="note" aria-label="Catatan akses tempat">
          {catatanAturan.map((c, i) => (
            <div
              key={i}
              className={`rounded-xl border p-3 text-xs leading-relaxed ${
                c.jenis === 'tertutup'
                  ? 'border-amber-200 bg-amber-50 text-amber-900'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-900'
              }`}
            >
              <b>{c.jenis === 'tertutup' ? 'Akses Pintu:' : 'Aturan Akses:'}</b> {c.teks}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => onRuteKe(tempat.id)} className="min-h-[44px] flex items-center justify-center rounded-xl bg-[#064E3B] px-3 py-2.5 font-semibold text-white hover:bg-[#047857] active:bg-[#064E3B]">
          Rute ke sini
        </button>
        <button type="button" onClick={() => onRuteDari(tempat.id)} className="min-h-[44px] flex items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2.5 font-semibold text-[#0F172A] hover:bg-slate-50 active:bg-slate-100">
          Rute dari sini
        </button>
      </div>

      {terhubung.length > 0 && (
        <section>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">Tersambung langsung dengan</h3>
          <div className="flex flex-wrap gap-2">
            {terhubung.map(({ tempat: t, jarak }) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onBuka(t.id)}
                className="min-h-[40px] inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 hover:border-emerald-500 hover:bg-emerald-50 active:bg-emerald-100"
              >
                {t.label} <span className="font-normal text-slate-600">· {formatJarak(jarak)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {isi.total > 0 ? (
        <>
          <section>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">Yang ada di sini</h3>
            {isi.fasilitas.length > 0 && (
              <p className="text-sm text-slate-800">{isi.fasilitas.map((f) => `${f.jumlah} ${f.label}`).join(' · ')}</p>
            )}
            {isi.penting.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm text-slate-800">
                {isi.penting.map((p) => (
                  <li key={p.label}>
                    <b>{p.label}</b>:{' '}
                    {p.contoh.map((r, i) => (
                      <span key={r.id}>
                        {i > 0 && ', '}
                        <button
                          type="button"
                          className="min-h-[32px] inline-flex items-center underline decoration-dotted underline-offset-2 hover:text-emerald-800"
                          onClick={() => onPilihRuangan(r)}
                        >
                          {r.nama}
                        </button>
                      </span>
                    ))}
                    {p.jumlah > p.contoh.length ? `, dan ${p.jumlah - p.contoh.length} lainnya` : ''}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Isi gedung per lantai">
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">Isi gedung per lantai</h3>
            <label htmlFor="saring-ruangan" className="sr-only">Saring ruangan di gedung ini</label>
            <div className="relative mb-2">
              <input
                id="saring-ruangan"
                type="search"
                value={saring}
                onChange={(e) => setSaring(e.target.value)}
                placeholder="Cari di gedung ini"
                autoComplete="off"
                className="min-h-[48px] w-full rounded-xl border border-slate-300 py-2.5 pl-3 pr-11 text-base text-[#0F172A] placeholder:text-slate-500 focus:border-[#047857]"
              />
              {saring && (
                <button
                  type="button"
                  onClick={() => setSaring('')}
                  aria-label="Hapus saringan ruangan"
                  className="absolute right-1 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-[#0F172A]"
                >
                  <IkonTutup ukuran={16} />
                </button>
              )}
            </div>

            {lantai.length > 1 && (
              <div className="no-scrollbar mb-2.5 flex flex-nowrap gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setLantaiAktif('semua')}
                  className={`min-h-[44px] flex-none whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                    lantaiAktif === 'semua'
                      ? 'bg-[#064E3B] text-white'
                      : 'border border-slate-300 bg-white text-[#0F172A] hover:border-[#047857] hover:bg-emerald-50'
                  }`}
                >
                  Semua ({isi.total})
                </button>
                {lantai.map((l) => {
                  const kunci = String(l.lantai)
                  const aktif = lantaiAktif === kunci
                  return (
                    <button
                      key={kunci}
                      type="button"
                      onClick={() => setLantaiAktif(kunci)}
                      className={`min-h-[44px] flex-none whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                        aktif
                          ? 'bg-[#064E3B] text-white'
                          : 'border border-slate-300 bg-white text-[#0F172A] hover:border-[#047857] hover:bg-emerald-50'
                      }`}
                    >
                      {l.lantai === null ? 'Lainnya' : `Lt. ${l.lantai}`}
                    </button>
                  )
                })}
              </div>
            )}

            {tersaring.length === 0 && <p className="text-sm text-slate-700">Tidak ada ruangan yang cocok.</p>}
            <div className="space-y-2">
              {tersaring.map((l) => (
                <details
                  key={l.lantai ?? 'x'}
                  open={Boolean(saring.trim()) || lantaiAktif !== 'semua' || lantai.length === 1}
                  className="rounded-xl border border-slate-200 bg-white"
                >
                  <summary className="min-h-[44px] flex cursor-pointer items-center justify-between px-3 py-2.5 font-semibold text-slate-900 select-none">
                    <span>
                      {l.lantai === null ? 'Lantai belum tercatat' : teksLantai(l.lantai)}{' '}
                      <span className="font-normal text-slate-600">· {l.ruangan.length} ruangan</span>
                    </span>
                    <IkonBawah ukuran={18} />
                  </summary>
                  <ul className="divide-y divide-slate-100 border-t border-slate-100">
                    {l.ruangan.map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => onPilihRuangan(r)}
                          className="min-h-[44px] flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-emerald-50 active:bg-emerald-100"
                        >
                          <span className="text-slate-900">{r.nama}</span>
                          {r.kodeTampil && <span className="flex-none text-xs text-slate-600">{r.kodeTampil}</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </section>
        </>
      ) : (
        <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">Belum ada data ruangan untuk tempat ini.</p>
      )}
    </article>
  )
}