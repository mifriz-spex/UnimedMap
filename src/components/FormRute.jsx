import { useRef } from 'react'
import HasilPencarian from './HasilPencarian'
import { IkonCari, IkonHapus, IkonKembali, IkonLokasi, IkonPeta, IkonTukar, IkonTutup } from './Ikon'
import { kapital, teksLantai } from '../lib/format'

const inputKelas = 'w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-11 text-base text-[#0F172A] placeholder:text-slate-500 focus:border-[#047857] min-h-[48px]'

function KotakCari({ id, label, nilai, onUbah, placeholder, onEnter, autoFokus }) {
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">{label}</label>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"><IkonCari /></span>
      <input
        id={id}
        type="search"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck="false"
        enterKeyHint="search"
        autoFocus={autoFokus}
        value={nilai}
        placeholder={placeholder}
        onChange={(e) => onUbah(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onEnter()
          if (e.key === 'ArrowDown') {
            const pertama = e.currentTarget.closest('section')?.querySelector('[data-hasil]')
            if (pertama) {
              e.preventDefault()
              pertama.focus()
            }
          }
        }}
        className={inputKelas}
      />
      {nilai && (
        <button
          type="button"
          onClick={() => onUbah('')}
          aria-label="Hapus kata pencarian"
          className="absolute right-1 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-[#0F172A]"
        >
          <IkonTutup ukuran={16} />
        </button>
      )}
    </div>
  )
}

function KartuPilihan({ judul, utama, tambahan, onUbah, warna, onTukar }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white py-1.5 pl-3 pr-1.5 min-h-[52px]">
      <span className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-bold text-white ${warna}`}>{judul}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-slate-900">{utama}</span>
        {tambahan && <span className="block truncate text-xs text-slate-600">{tambahan}</span>}
      </span>
      {onTukar && (
        <button type="button" onClick={onTukar} aria-label="Tukar arah" title="Tukar arah" className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[#064E3B] hover:bg-emerald-50 active:bg-emerald-100">
          <IkonTukar ukuran={18} />
        </button>
      )}
      <button type="button" onClick={onUbah} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg px-2.5 py-1.5 text-sm font-semibold text-[#064E3B] hover:bg-emerald-50 active:bg-emerald-100">
        Ubah
      </button>
    </div>
  )
}

export default function FormRute({
  tujuan, asal, bukaTujuan, bukaAsal, modeAsal, setModeAsal,
  kueriTujuan, setKueriTujuan, kueriAsal, setKueriAsal,
  hasilTujuan, hasilAsal, namaTempat, adaJarak,
  onPilihTujuanTempat, onPilihTujuanRuangan, onPilihAsalTempat, onPilihAsalRuangan,
  onUbahTujuan, onBatalUbahTujuan, onUbahAsal, onBatalUbahAsal, onGps, statusGps, onPilihDiPeta, onTukar, onBersihkan,
}) {
  const refAsal = useRef(null)
  const pilihPertama = (hasil, pilihTempat, pilihRuangan) => () => {
    if (hasil.tempat[0]) pilihTempat(hasil.tempat[0].tempat)
    else if (hasil.ruangan[0] && pilihRuangan) pilihRuangan(hasil.ruangan[0])
  }

  const tampilTujuan = Boolean(tujuan) && !bukaTujuan
  const tampilAsal = Boolean(asal) && !bukaAsal
  const bisaBersihkan = Boolean(onBersihkan && (tujuan || asal || kueriTujuan.trim() || kueriAsal.trim()))

  return (
    <section aria-label="Pilih tujuan dan titik awal" className="space-y-3">
      {/* ---- TUJUAN ---- */}
      <div className="space-y-2">
        {tampilTujuan ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Rute perjalanan</span>
              {bisaBersihkan && (
                <button
                  type="button"
                  onClick={onBersihkan}
                  aria-label="Bersihkan rute"
                  title="Bersihkan rute"
                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg p-2 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-700 active:bg-red-100"
                >
                  <IkonHapus ukuran={18} />
                </button>
              )}
            </div>
            <KartuPilihan
              judul="B"
              warna="bg-red-600"
              utama={tujuan.ruangan ? tujuan.ruangan.nama : tujuan.tempat.nama}
              tambahan={tujuan.ruangan ? `${tujuan.tempat.nama} · ${teksLantai(tujuan.ruangan.lantai)}` : 'Tujuan'}
              onUbah={onUbahTujuan}
            />
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Mau ke mana?</h2>
              <div className="flex items-center gap-1">
                {tujuan && (
                  <button type="button" onClick={onBatalUbahTujuan} className="min-h-[44px] inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 active:bg-emerald-100">
                    Batal
                  </button>
                )}
                {bisaBersihkan && (
                  <button
                    type="button"
                    onClick={onBersihkan}
                    aria-label="Bersihkan rute"
                    title="Bersihkan rute"
                    className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg p-2 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-700 active:bg-red-100"
                  >
                    <IkonHapus ukuran={18} />
                  </button>
                )}
              </div>
            </div>
            <KotakCari
              id="cari-tujuan"
              label="Cari gedung atau ruangan tujuan"
              nilai={kueriTujuan}
              onUbah={setKueriTujuan}
              placeholder="Cari gedung atau ruangan"
              onEnter={pilihPertama(hasilTujuan, onPilihTujuanTempat, onPilihTujuanRuangan)}
            />
            <HasilPencarian
              hasil={hasilTujuan}
              kueri={kueriTujuan}
              namaTempat={namaTempat}
              denganJarak={adaJarak}
              onPilihTempat={onPilihTujuanTempat}
              onPilihRuangan={onPilihTujuanRuangan}
              onSaran={setKueriTujuan}
            />
          </>
        )}
      </div>

      {/* ---- TITIK AWAL ---- */}
      <div className="space-y-2">
        {tampilAsal ? (
          <KartuPilihan
            judul="A"
            warna="bg-[#047857]"
            utama={asal.jenis === 'gps' ? 'Lokasi saya' : (asal.ruangan ? asal.ruangan.nama : (asal.tempat?.nama || 'Titik awal'))}
            tambahan={
              asal.jenis === 'gps'
                ? (asal.tempat
                    ? (asal.berdasarkanArea
                        ? `Berada di area: ${asal.tempat.nama}`
                        : `Terdekat dari jalur: ${asal.tempat.nama} (±${Math.round(asal.jarak)} m)`)
                    : `Di jalur antar gedung (±${Math.round(asal.jarak)} m dari jalur terdekat)`)
                : (asal.ruangan ? `${asal.tempat?.nama} · ${teksLantai(asal.ruangan.lantai)}` : 'Titik awal')
            }
            onUbah={onUbahAsal}
            onTukar={tampilTujuan && asal.jenis === 'tempat' ? onTukar : undefined}
          />
        ) : (
          <>
            <div className="flex items-center justify-between">
              {tujuan && !bukaTujuan ? <h2 className="text-base sm:text-lg font-bold text-slate-900">Dari mana kamu berangkat?</h2> : <h2 className="text-sm font-semibold text-slate-700">Titik awal (boleh diisi nanti)</h2>}
              {asal && <button type="button" onClick={onBatalUbahAsal} className="min-h-[44px] inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 active:bg-emerald-100">Batal</button>}
            </div>
            {modeAsal === 'cari' ? (
              <>
                <button type="button" onClick={() => setModeAsal('menu')} className="min-h-[44px] inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-800 hover:text-emerald-950 py-1.5">
                  <IkonKembali ukuran={16} /> Pilihan lain
                </button>
                <div ref={refAsal}>
                  <KotakCari
                    id="cari-asal"
                    label="Cari gedung atau ruangan untuk titik awal"
                    nilai={kueriAsal}
                    onUbah={setKueriAsal}
                    placeholder="Cari gedung atau ruangan"
                    onEnter={pilihPertama(hasilAsal, onPilihAsalTempat, onPilihAsalRuangan)}
                    autoFokus
                  />
                </div>
                <HasilPencarian hasil={hasilAsal} kueri={kueriAsal} namaTempat={namaTempat} onPilihTempat={onPilihAsalTempat} onPilihRuangan={onPilihAsalRuangan} onSaran={setKueriAsal} />
                {!kueriAsal.trim() && (
                  <p className="text-sm text-slate-700">Lihat sekelilingmu, lalu ketik nama gedung atau ruangan di dekatmu.</p>
                )}
              </>
            ) : (
              <div className="grid gap-2">
                <button type="button" onClick={onGps} className="min-h-[52px] flex items-center gap-3 rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-left hover:border-emerald-500 hover:bg-emerald-50 active:bg-emerald-100 transition-colors">
                  <span className="text-emerald-800 flex-none"><IkonLokasi /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-slate-900">Gunakan lokasi saya</span>
                    <span className="block text-xs text-slate-600 truncate">Paling cepat jika kamu sudah di kampus</span>
                  </span>
                </button>
                <button type="button" onClick={() => setModeAsal('cari')} className="min-h-[52px] flex items-center gap-3 rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-left hover:border-emerald-500 hover:bg-emerald-50 active:bg-emerald-100 transition-colors">
                  <span className="text-emerald-800 flex-none"><IkonCari /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-slate-900">Cari gedung atau ruangan</span>
                    <span className="block text-xs text-slate-600 truncate">Ketik nama gedung atau ruangan di dekatmu</span>
                  </span>
                </button>
                <button type="button" onClick={onPilihDiPeta} className="min-h-[52px] flex items-center gap-3 rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-left hover:border-emerald-500 hover:bg-emerald-50 active:bg-emerald-100 transition-colors">
                  <span className="text-emerald-800 flex-none"><IkonPeta /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-slate-900">Pilih di peta</span>
                    <span className="block text-xs text-slate-600 truncate">Ketuk gedung pada peta</span>
                  </span>
                </button>
              </div>
            )}
          </>
        )}
        {statusGps.pesan && (
          <p role="status" className={`rounded-lg px-3 py-2 text-sm ${statusGps.jenis === 'galat' ? 'bg-amber-50 text-amber-900' : 'bg-emerald-50 text-emerald-900'}`}>
            {statusGps.pesan}
          </p>
        )}
      </div>

      <span className="sr-only" aria-live="polite">{tujuan ? `Tujuan: ${kapital(tujuan.tempat.nama)}` : ''}</span>
    </section>
  )
}