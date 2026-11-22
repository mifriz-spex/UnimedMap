import { useMemo } from 'react'
import { ambilFotoTempat, adaFotoTempat, buatPlaceholderGedung } from '../lib/foto'
import { KELOMPOK } from '../lib/peta'
import { IkonTutup } from './Ikon'

export default function CardGedung({
  tempat,
  jumlahRuangan = 0,
  onTutup,
  onRuteKe,
  onRuteDari,
  onBukaDetail,
}) {
  const warna = KELOMPOK[tempat?.kelompok]?.warna || '#047857'
  const punyaFoto = useMemo(() => adaFotoTempat(tempat?.id), [tempat?.id])
  const srcFoto = useMemo(
    () => ambilFotoTempat(tempat?.id) || buatPlaceholderGedung(tempat?.nama, warna),
    [tempat?.id, tempat?.nama, warna]
  )

  if (!tempat) return null

  const statusTertutup = Array.isArray(tempat.titik) && tempat.titik.length === 0

  return (
    <section
      aria-label={`Pratinjau ${tempat.nama}`}
      className="pointer-events-auto absolute bottom-3 left-3 right-3 z-[1050] mx-auto max-w-md overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl transition-all sm:bottom-5 sm:left-5 sm:right-auto sm:w-[23rem]"
    >
      {/* Bagian Foto / Banner */}
      <div className="relative h-36 w-full bg-slate-900 sm:h-40">
        <img
          src={srcFoto}
          alt={punyaFoto ? `Foto ${tempat.nama}` : `Ilustrasi ${tempat.nama}`}
          className="h-full w-full object-cover"
          loading="eager"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />

        {/* Badge Fakultas / Kelompok */}
        <div className="absolute left-3 top-3 flex items-center gap-1.5">
          <span
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/75 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-xs"
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: warna }} />
            {tempat.fakultas || KELOMPOK[tempat.kelompok]?.label || 'Area Kampus'}
          </span>
        </div>

        {/* Tombol Tutup */}
        <button
          type="button"
          onClick={onTutup}
          aria-label="Tutup kartu pratinjau gedung"
          className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/65 text-white backdrop-blur-xs transition-colors hover:bg-slate-950"
        >
          <IkonTutup ukuran={16} />
        </button>

        {/* Judul Gedung di atas gradasi bawah foto */}
        <div className="absolute bottom-2.5 left-3 right-3 text-white">
          <h2 className="line-clamp-1 text-base font-bold leading-snug drop-shadow-xs">
            {tempat.nama}
          </h2>
          {tempat.namaLengkap && tempat.namaLengkap !== tempat.nama && (
            <p className="line-clamp-1 text-xs text-slate-200">{tempat.namaLengkap}</p>
          )}
        </div>
      </div>

      {/* Ringkasan & Tombol Aksi */}
      <div className="space-y-3 p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <span>
            {jumlahRuangan > 0
              ? `${jumlahRuangan} ruangan terdata di gedung ini`
              : tempat.fungsi || 'Fasilitas & area kampus Unimed'}
          </span>
          {statusTertutup && (
            <span className="rounded-md bg-amber-100 px-2 py-0.5 font-semibold text-amber-900">
              Akses terbatas
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onRuteKe(tempat.id)}
            className="col-span-1 flex items-center justify-center rounded-xl bg-emerald-800 px-2.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-emerald-900"
          >
            Rute ke sini
          </button>
          <button
            type="button"
            onClick={() => onRuteDari(tempat.id)}
            className="col-span-1 flex items-center justify-center rounded-xl border border-emerald-700 bg-emerald-50 px-2.5 py-2 text-xs font-semibold text-emerald-900 transition-colors hover:bg-emerald-100"
          >
            Dari sini
          </button>
          <button
            type="button"
            onClick={() => onBukaDetail(tempat.id)}
            className="col-span-1 flex items-center justify-center rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50"
          >
            Detail
          </button>
        </div>
      </div>
    </section>
  )
}