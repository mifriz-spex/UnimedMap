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
      className="pointer-events-auto absolute bottom-[calc(var(--bottom-sheet-height,4.75rem)+0.75rem+env(safe-area-inset-bottom,0px))] left-3 right-3 z-[1060] mx-auto max-w-md overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xl transition-all duration-300 md:bottom-5 md:left-5 md:right-auto md:w-[23rem]"
    >
      {/* Bagian Foto / Banner */}
      <div className="relative aspect-[16/9] w-full max-w-full bg-slate-900 sm:aspect-[16/10]">
        <img
          src={srcFoto}
          alt={punyaFoto ? `Foto ${tempat.nama}` : `Ilustrasi ${tempat.nama}`}
          className="h-full w-full max-w-full object-cover"
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
          className="absolute right-2 top-2 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-slate-950/65 text-white backdrop-blur-xs transition-colors hover:bg-slate-950 active:bg-slate-900"
        >
          <IkonTutup ukuran={18} />
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
          <span className="break-words">
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
            className="col-span-1 min-h-[44px] flex items-center justify-center rounded-xl bg-emerald-800 px-2 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs transition-colors hover:bg-emerald-900 active:bg-emerald-950"
          >
            Rute ke sini
          </button>
          <button
            type="button"
            onClick={() => onRuteDari(tempat.id)}
            className="col-span-1 min-h-[44px] flex items-center justify-center rounded-xl border border-emerald-700 bg-emerald-50 px-2 py-2 text-xs sm:text-sm font-semibold text-emerald-900 transition-colors hover:bg-emerald-100 active:bg-emerald-200"
          >
            Dari sini
          </button>
          <button
            type="button"
            onClick={() => onBukaDetail(tempat.id)}
            className="col-span-1 min-h-[44px] flex items-center justify-center rounded-xl border border-slate-300 bg-white px-2 py-2 text-xs sm:text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 active:bg-slate-100"
          >
            Detail
          </button>
        </div>
      </div>
    </section>
  )
}