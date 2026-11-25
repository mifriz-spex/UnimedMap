import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { batas, bentuk, edges, graphData, poligon, tempat, ruanganLokal } from './data'
import aturanJalur from './data/aturanJalur.json'
import { useRuangan } from './hooks/useRuangan'
import { findNearestPoint, findNearestPointForPlace, findPlaceContainingPoint, getCurrentPosition, JARAK_DI_KAMPUS_M, pesanGalatGps } from './lib/gps'
import { susunHasil, pilihanCepat } from './lib/hasilCari'
import { bangunKosakata } from './lib/search'
import { geometriRute, hitungRute, jarakKeSemuaTempat, langkahRute } from './lib/routing'
import { cariRuanganDariKunci, kunciRuangan } from './lib/rooms'
import { bangunIndeksTempat, ringkasOrientasi } from './lib/places'
import { bacaUrl, tulisUrl } from './lib/urlState'
import CardGedung from './components/CardGedung'
import DetailTempat from './components/DetailTempat'
import FormRute from './components/FormRute'
import { IkonBantuan, IkonBawah, IkonPanah } from './components/Ikon'
import Jelajahi from './components/Jelajahi'
import KartuRute from './components/KartuRute'
import MapView from './components/MapView'
import Panduan from './components/Panduan'

const KUNCI_PANDUAN = 'unimed_panduan_dilihat'
const TINGGI_PANEL = { min: 'h-[4.75rem]', mid: 'h-[35dvh]', max: 'h-[88dvh]' }
const NILAI_TINGGI_PANEL = { min: '4.75rem', mid: '35dvh', max: '88dvh' }
const URUTAN_PANEL = ['min', 'mid', 'max']

const indeks = bangunIndeksTempat(tempat, graphData.pointsById, aturanJalur)
const namaCari = new Map(tempat.map((t) => [t.id, `${t.nama} ${t.namaLengkap || ''} ${t.fakultas || ''}`]))
const namaTampil = new Map(tempat.map((t) => [t.id, t.nama]))
const orientasi = ringkasOrientasi(indeks, graphData.graph)
const STATUS_GPS_KOSONG = { jenis: '', pesan: '' }

function pernahMelihatPanduan() {
  try {
    return window.localStorage.getItem(KUNCI_PANDUAN) === '1'
  } catch {
    return true
  }
}

function keadaanAwal() {
  const url = bacaUrl(window.location.search)
  const dari = indeks.byId.has(url.dari) ? url.dari : ''
  const ke = indeks.byId.has(url.ke) ? url.ke : ''
  const ruang = ke && url.ruang ? cariRuanganDariKunci(ruanganLokal, url.ruang) : null
  return { dari, ke, ruang: ruang && ruang.tempatId === ke ? ruang : null }
}

export default function App() {
  const [awal] = useState(keadaanAwal)
  const { ruangan: daftarRuangan, galat: galatData } = useRuangan()

  const [tab, setTab] = useState('rute')
  const [detail, setDetail] = useState(null)
  const [gedungPratinjau, setGedungPratinjau] = useState(null)
  const [dari, setDari] = useState(awal.dari)
  const [asalGps, setAsalGps] = useState(null)
  const [posisiPengguna, setPosisiPengguna] = useState(null)
  const [ke, setKe] = useState(awal.ke)
  const [ruanganTujuan, setRuanganTujuan] = useState(awal.ruang)
  const [ruanganAsal, setRuanganAsal] = useState(null)
  const [kueriTujuan, setKueriTujuan] = useState('')
  const [kueriAsal, setKueriAsal] = useState('')
  const [bukaTujuan, setBukaTujuan] = useState(false)
  const [bukaAsal, setBukaAsal] = useState(false)
  const [modeAsal, setModeAsal] = useState('menu')
  const [statusGps, setStatusGps] = useState(STATUS_GPS_KOSONG)
  const [pilihPeta, setPilihPeta] = useState(null)
  const [panel, setPanel] = useState('mid')
  const [panelTersembunyi, setPanelTersembunyi] = useState(false)
  const [resetPeta, setResetPeta] = useState(0)
  const [tampilJalur, setTampilJalur] = useState(false)
  const [panduan, setPanduan] = useState(() => !pernahMelihatPanduan())
  const [pesanBagikan, setPesanBagikan] = useState('')
  const awalSentuh = useRef(null)

  // ---------- turunan ----------
  const kosakata = useMemo(() => bangunKosakata(daftarRuangan, tempat), [daftarRuangan])
  const cepat = useMemo(() => pilihanCepat(daftarRuangan, tempat, namaCari), [daftarRuangan])
  const jumlahFakultas = useMemo(
    () => new Set(tempat.map((t) => t.fakultas).filter((f) => f && f !== 'Fasilitas Umum' && f !== 'Rektorat')).size,
    []
  )

  const asal = useMemo(() => {
    if (asalGps) return { ...asalGps, jenis: 'gps', tempat: indeks.byTitik.get(asalGps.titikId) || null }
    if (dari) return { jenis: 'tempat', tempat: indeks.byId.get(dari), ruangan: ruanganAsal }
    return null
  }, [asalGps, dari, ruanganAsal])
  const tujuan = useMemo(() => (ke ? { tempat: indeks.byId.get(ke), ruangan: ruanganTujuan } : null), [ke, ruanganTujuan])
  const titikAsal = useMemo(() => (asalGps ? [asalGps.titikId] : dari ? (indeks.byId.get(dari)?.titik || []) : []), [asalGps, dari])

  const rute = useMemo(() => {
    if (!tujuan) return null
    if (tujuan.tempat && tujuan.tempat.titik.length === 0) {
      return { found: false, alasan: 'titik-tertutup' }
    }
    if (asal?.jenis === 'tempat' && asal.tempat && asal.tempat.titik.length === 0) {
      return { found: false, alasan: 'titik-tertutup' }
    }
    if (!titikAsal.length || !tujuan.tempat?.titik?.length) return null
    return hitungRute(graphData, titikAsal, tujuan.tempat.titik, aturanJalur)
  }, [titikAsal, tujuan, asal])

  const ruteTanpaAturan = useMemo(() => {
    if (!tujuan || !titikAsal.length) return null
    const asalSemua = asalGps ? [asalGps.titikId] : (indeks.byId.get(dari)?.titikSemua || indeks.byId.get(dari)?.titik || [])
    const tujuanSemua = tujuan.tempat?.titikSemua || tujuan.tempat?.titik || []
    if (!asalSemua.length || !tujuanSemua.length) return null
    return hitungRute(graphData, asalSemua, tujuanSemua, null)
  }, [titikAsal, tujuan, asalGps, dari])

  const garisRute = useMemo(() => (rute?.found ? geometriRute(rute, edges, graphData.pointsById) : null), [rute])
  const langkah = useMemo(() => (rute?.found ? langkahRute(rute, indeks, graphData, { edges, poligon, tempat }) : []), [rute])
  const jarakTempat = useMemo(() => jarakKeSemuaTempat(graphData, titikAsal, indeks, aturanJalur), [titikAsal])

  const hasilTujuan = useMemo(
    () => susunHasil({ kueri: kueriTujuan, daftarTempat: tempat, ruangan: daftarRuangan, namaTempat: namaCari, jarakTempat, kosakata }),
    [kueriTujuan, daftarRuangan, jarakTempat, kosakata]
  )
  const hasilAsal = useMemo(
    () => susunHasil({ kueri: kueriAsal, daftarTempat: tempat, ruangan: daftarRuangan, namaTempat: namaCari, hanyaTempat: false, kosakata }),
    [kueriAsal, daftarRuangan, kosakata]
  )

  // ---------- alamat halaman (bisa dibagikan) ----------
  useEffect(() => {
    const s = tulisUrl({ dari, ke, ruang: ruanganTujuan ? kunciRuangan(ruanganTujuan) : '' })
    if (s !== window.location.search) window.history.replaceState(null, '', `${window.location.pathname}${s}${window.location.hash}`)
  }, [dari, ke, ruanganTujuan])

  // ---------- aksi ----------
  const geserPanel = useCallback((arah) => {
    setPanel((p) => URUTAN_PANEL[Math.min(2, Math.max(0, URUTAN_PANEL.indexOf(p) + arah))])
  }, [])

  const tutupPanduan = useCallback(() => {
    try {
      window.localStorage.setItem(KUNCI_PANDUAN, '1')
    } catch {
      /* penyimpanan tidak tersedia */
    }
    setPanduan(false)
  }, [])

  const setTujuanTempat = (id, ruang = null) => {
    setKe(id)
    setRuanganTujuan(ruang)
    setKueriTujuan('')
    setBukaTujuan(false)
    setPesanBagikan('')
    setTab('rute')
    setDetail(null)
    setGedungPratinjau(null)
    setPanel('mid')
    setPanelTersembunyi(false)
  }
  const setAsalTempat = (id, ruang = null) => {
    setDari(id)
    setRuanganAsal(ruang)
    setAsalGps(null)
    setKueriAsal('')
    setBukaAsal(false)
    setModeAsal('menu')
    setStatusGps(STATUS_GPS_KOSONG)
    setPesanBagikan('')
    setTab('rute')
    setDetail(null)
    setGedungPratinjau(null)
    setPanel('mid')
    setPanelTersembunyi(false)
  }

  const bersihkanRute = () => {
    setDari('')
    setKe('')
    setRuanganTujuan(null)
    setRuanganAsal(null)
    setAsalGps(null)
    setKueriTujuan('')
    setKueriAsal('')
    setBukaTujuan(false)
    setBukaAsal(false)
    setModeAsal('menu')
    setStatusGps(STATUS_GPS_KOSONG)
    setPilihPeta(null)
    setGedungPratinjau(null)
    setPesanBagikan('')
    setResetPeta((v) => v + 1)
  }

  const pakaiGps = async () => {
    setStatusGps({ jenis: 'info', pesan: 'Mencari lokasimu…' })
    try {
      const pos = await getCurrentPosition()
      const lokasi = { lat: pos.coords.latitude, lon: pos.coords.longitude }
      const akurasi = pos.coords.accuracy || 0
      const tempatGps = findPlaceContainingPoint(lokasi, poligon, tempat)
      const titikTempat = tempatGps ? findNearestPointForPlace(lokasi, tempatGps, graphData.pointsById) : null
      const dekat = titikTempat || findNearestPoint(lokasi, graphData.pointsById, { kecualikanTitik: aturanJalur.titikUjungSaja?.map((u) => u.id) || [] })
      setPosisiPengguna({ ...lokasi, akurasi })
      if (!dekat || dekat.distance > JARAK_DI_KAMPUS_M) {
        setStatusGps({ jenis: 'galat', pesan: `Lokasimu sekitar ${Math.round(dekat?.distance ?? 0)} m dari jalur terdekat, sepertinya di luar area kampus Unimed. Pilih titik awal secara manual.` })
        setModeAsal('menu')
        return
      }
      setAsalGps({
        ...lokasi,
        akurasi,
        titikId: dekat.id,
        jarak: dekat.distance,
        berdasarkanArea: Boolean(tempatGps),
      })
      setRuanganAsal(null)
      setDari('')
      setBukaAsal(false)
      setStatusGps({ jenis: 'info', pesan: akurasi > 50 ? 'Akurasi GPS rendah, posisimu bisa meleset. Jika ragu, pilih gedung terdekat secara manual.' : '' })
      setPanel('mid')
    } catch (e) {
      setStatusGps({ jenis: 'galat', pesan: pesanGalatGps(e) })
      setModeAsal('menu')
    }
  }

  const tukar = () => {
    if (!dari || !ke) return
    const prevDari = dari
    const prevKe = ke
    const prevRuanganAsal = ruanganAsal
    const prevRuanganTujuan = ruanganTujuan
    setDari(prevKe)
    setKe(prevDari)
    setRuanganAsal(prevRuanganTujuan)
    setRuanganTujuan(prevRuanganAsal)
  }

  const bagikan = async () => {
    const url = `${window.location.origin}${window.location.pathname}${tulisUrl({ dari, ke, ruang: ruanganTujuan ? kunciRuangan(ruanganTujuan) : '' })}`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Rute Kampus Unimed', text: `Rute ke ${tujuan.tempat.nama}`, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setPesanBagikan('Tautan disalin.')
    } catch (e) {
      if (e?.name !== 'AbortError') setPesanBagikan('Tidak bisa menyalin otomatis. Salin tautan dari bilah alamat browser.')
    }
  }

  const klikPeta = (id) => {
    if (pilihPeta === 'asal') {
      setPanelTersembunyi(false)
      setPilihPeta(null)
      setAsalTempat(id)
    } else if (pilihPeta === 'tujuan') {
      setPanelTersembunyi(false)
      setPilihPeta(null)
      setTujuanTempat(id)
    } else {
      setGedungPratinjau(id)
      setPanel('min')
    }
  }

  const mulaiPilihDiPeta = (mode) => {
    setPilihPeta(mode)
    setPanel('min')
  }

  const kunciRuteAtur = rute?.found ? `${rute.startId}-${rute.targetId}` : asalGps ? 'gps' : `kosong-${resetPeta}`
  const tempatDetail = detail ? indeks.byId.get(detail) : null
  const tempatPratinjau = gedungPratinjau ? indeks.byId.get(gedungPratinjau) : null
  const jumlahRuanganPratinjau = useMemo(
    () => (gedungPratinjau ? daftarRuangan.filter((r) => r.tempatId === gedungPratinjau).length : 0),
    [gedungPratinjau, daftarRuangan]
  )

  const mulaiSentuh = (e) => { awalSentuh.current = e.touches[0].clientY }
  const akhirSentuh = (e) => {
    if (awalSentuh.current === null) return
    const dy = e.changedTouches[0].clientY - awalSentuh.current
    awalSentuh.current = null
    if (dy < -40) geserPanel(1)
    else if (dy > 40) geserPanel(-1)
  }

  return (
    <div
      data-panel={panel}
      className="relative flex h-full min-h-screen min-h-dvh h-dvh w-full flex-col overflow-hidden md:flex-row"
      style={{ '--bottom-sheet-height': NILAI_TINGGI_PANEL[panel] }}
    >
      {/* Area sentuh transparan di atas panel saat max di mobile untuk menciutkan kembali */}
      {panel === 'max' && (
        <button
          type="button"
          onClick={() => setPanel('mid')}
          className="fixed inset-x-0 top-0 bottom-[88dvh] z-[1040] md:hidden cursor-pointer bg-transparent border-0 p-0"
          aria-label="Ketuk area peta untuk menciutkan panel"
        />
      )}

      <aside
        aria-label="Panel pencarian dan rute"
        className={`fixed inset-x-0 bottom-0 z-[1050] flex w-full flex-col rounded-t-3xl border-t border-slate-200 bg-white shadow-[0_-8px_30px_rgba(15,23,42,0.14)] transition-[height] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:static md:order-1 md:z-auto md:h-full md:w-[26rem] md:rounded-none md:border-t-0 md:shadow-xl ${TINGGI_PANEL[panel]} ${panelTersembunyi ? 'md:hidden' : ''}`}
        onFocusCapture={(e) => {
          if (e.target.tagName === 'INPUT' && window.innerWidth < 768) setPanel('max')
        }}
      >
        {/* Drag handle dan tombol toggle mobile */}
        <div
          className="flex flex-none items-center justify-between px-4 pt-2.5 pb-1 md:hidden select-none cursor-pointer"
          onTouchStart={mulaiSentuh}
          onTouchEnd={akhirSentuh}
          onClick={() => geserPanel(panel === 'max' ? -1 : 1)}
        >
          <div className="flex-1" />
          <div className="flex flex-col items-center justify-center py-1">
            <span className="block h-1.5 w-12 rounded-full bg-slate-300 hover:bg-slate-400 transition-colors" />
          </div>
          <div className="flex-1 flex justify-end">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                geserPanel(panel === 'max' ? -2 : (panel === 'mid' ? 1 : 1))
              }}
              aria-label={panel === 'max' ? 'Ciutkan panel' : 'Perluas panel'}
              className="min-h-[44px] min-w-[44px] -my-2 flex items-center justify-center text-slate-500 hover:text-slate-800"
            >
              <IkonBawah ukuran={18} className={`transition-transform duration-200 ${panel === 'max' ? '' : 'rotate-180'}`} />
            </button>
          </div>
        </div>

        <header className="flex flex-none items-center justify-between gap-2 px-4 pb-2 pt-0.5 md:pt-4">
          <div>
            <h1 className="text-base sm:text-lg font-bold leading-tight text-slate-900">Peta Kampus Unimed</h1>
            <p className="hidden text-xs text-slate-600 sm:block">Navigasi gedung, fakultas &amp; ruangan jalan kaki</p>
          </div>
          <button
            type="button"
            onClick={() => setPanduan(true)}
            className="min-h-[44px] inline-flex flex-none items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-[#064E3B] hover:bg-emerald-50 active:bg-emerald-100"
            aria-label="Buka panduan cara pakai"
          >
            <IkonBantuan ukuran={18} /> <span>Cara pakai</span>
          </button>
        </header>

        <div role="tablist" aria-label="Menu utama" className="flex flex-none gap-1 border-b border-slate-200 px-4">
          {[['rute', 'Rute'], ['jelajah', 'Jelajahi gedung']].map(([id, label]) => (
            <button
              key={id}
              role="tab"
              type="button"
              id={`tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`isi-${id}`}
              onClick={() => { setTab(id); setDetail(null); if (panel === 'min') setPanel('mid') }}
              className={`min-h-[44px] -mb-px border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${
                tab === id
                  ? 'border-[#064E3B] text-[#064E3B]'
                  : 'border-transparent text-slate-600 hover:text-[#0F172A]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div
          className="min-h-0 flex-1 overflow-y-auto px-4 pt-3.5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] md:pb-8 bottom-sheet-scroll"
          role="tabpanel"
          id={`isi-${tab}`}
          aria-labelledby={`tab-${tab}`}
        >
          {tab === 'rute' && (
            <div key="tab-rute" className="animasi-tab space-y-5">
              {galatData && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Data ruangan terbaru belum bisa dimuat ({galatData}). Yang tampil adalah data bawaan.</p>}
              <FormRute
                tujuan={tujuan}
                asal={asal}
                bukaTujuan={bukaTujuan}
                bukaAsal={bukaAsal}
                modeAsal={modeAsal}
                setModeAsal={setModeAsal}
                kueriTujuan={kueriTujuan}
                setKueriTujuan={setKueriTujuan}
                kueriAsal={kueriAsal}
                setKueriAsal={setKueriAsal}
                hasilTujuan={hasilTujuan}
                hasilAsal={hasilAsal}
                namaTempat={namaTampil}
                adaJarak={titikAsal.length > 0}
                onPilihTujuanTempat={(t) => setTujuanTempat(t.id)}
                onPilihTujuanRuangan={(r) => setTujuanTempat(r.tempatId, r)}
                onPilihAsalTempat={(t) => setAsalTempat(t.id)}
                onPilihAsalRuangan={(r) => setAsalTempat(r.tempatId, r)}
                onUbahTujuan={() => { setBukaTujuan(true); setKueriTujuan('') }}
                onBatalUbahTujuan={() => { setBukaTujuan(false); setKueriTujuan('') }}
                onUbahAsal={() => { setBukaAsal(true); setModeAsal('menu') }}
                onBatalUbahAsal={() => { setBukaAsal(false); setKueriAsal('') }}
                onGps={pakaiGps}
                statusGps={statusGps}
                onPilihDiPeta={() => mulaiPilihDiPeta('asal')}
                onTukar={tukar}
                onBersihkan={bersihkanRute}
              />

              {!tujuan && !kueriTujuan.trim() && (
                <section aria-label="Pencarian cepat" className="space-y-3">
                  {cepat.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Cari cepat</h3>
                      <div className="no-scrollbar flex flex-nowrap gap-2 overflow-x-auto pb-1">
                        {cepat.map((p) => (
                          <button
                            key={p.kueri}
                            type="button"
                            onClick={() => setKueriTujuan(p.kueri)}
                            className="min-h-[44px] flex-none whitespace-nowrap rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:border-[#047857] hover:bg-emerald-50 active:bg-emerald-100"
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <button type="button" onClick={() => setTab('jelajah')} className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-left text-[#0F172A] transition-colors hover:border-[#047857] hover:bg-emerald-50/60 active:bg-emerald-100/70">
                    <span>
                      <span className="block font-semibold text-[#0F172A]">Baru di Unimed?</span>
                      <span className="block text-sm text-slate-600">Jelajahi {tempat.length} lokasi di {jumlahFakultas} fakultas &amp; fasilitas kampus.</span>
                    </span>
                    <IkonBawah ukuran={20} className="-rotate-90 flex-none text-[#064E3B]" />
                  </button>
                </section>
              )}

              {tujuan && !asal && (
                <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-950">Pilih titik awal di atas untuk melihat rute ke <b>{tujuan.tempat.nama}</b>.</p>
              )}

              {rute && tujuan && asal && !bukaTujuan && (
                <KartuRute
                  rute={rute}
                  ruteTanpaAturan={ruteTanpaAturan}
                  aturan={aturanJalur}
                  langkah={langkah}
                  tujuan={tujuan}
                  asal={asal}
                  indeks={indeks}
                  graphData={graphData}
                  onBagikan={bagikan}
                  pesanBagikan={pesanBagikan}
                  onBersihkan={bersihkanRute}
                />
              )}
            </div>
          )}

          {tab === 'jelajah' && (
            <div key="tab-jelajah" className="animasi-tab">
              {tempatDetail ? (
                <DetailTempat
                  key={tempatDetail.id}
                  tempat={tempatDetail}
                  indeks={indeks}
                  graph={graphData.graph}
                  ruangan={daftarRuangan}
                  aturan={aturanJalur}
                  onKembali={() => setDetail(null)}
                  onBuka={setDetail}
                  onRuteKe={(id) => setTujuanTempat(id)}
                  onRuteDari={(id) => setAsalTempat(id)}
                  onPilihRuangan={(r) => r.tempatId && setTujuanTempat(r.tempatId, r)}
                />
              ) : (
                <Jelajahi
                  orientasi={orientasi}
                  indeks={indeks}
                  ruangan={daftarRuangan}
                  pilihanCepat={cepat}
                  onBuka={setDetail}
                  onCari={(q) => { setTab('rute'); setKueriTujuan(q); setBukaTujuan(true) }}
                />
              )}
            </div>
          )}

          <footer className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-600">
            <p>
              Peta jalur digambar manual dan perkiraan jarak bisa berbeda di lapangan. Data ruangan menggunakan berkas bawaan aplikasi.
            </p>
          </footer>
        </div>
      </aside>

      <main className="relative order-1 h-full w-full flex-1 overflow-hidden md:order-2" aria-label="Peta">
        <button
          type="button"
          onClick={() => setPanelTersembunyi((v) => !v)}
          aria-label={panelTersembunyi ? 'Tampilkan panel kiri' : 'Sembunyikan panel kiri'}
          title={panelTersembunyi ? 'Tampilkan panel' : 'Sembunyikan panel'}
          className="hidden md:flex absolute left-0 top-1/2 z-[1000] -translate-y-1/2 items-center justify-center rounded-r-xl border border-l-0 border-slate-200 bg-white/95 px-1.5 py-4 text-slate-700 shadow-md backdrop-blur-xs transition-colors hover:bg-emerald-50 hover:text-emerald-900"
        >
          <IkonPanah ukuran={18} className={`transition-transform duration-200 ${panelTersembunyi ? '' : 'rotate-180'}`} />
        </button>

        <MapView
          bentuk={bentuk}
          batas={batas}
          edges={edges}
          pointsById={graphData.pointsById}
          tampilJalur={tampilJalur}
          onToggleJalur={() => setTampilJalur((v) => !v)}
          garisRute={garisRute}
          kunciRute={kunciRuteAtur}
          asal={asal && { ...asal, titikId: rute?.found ? rute.startId : titikAsal[0], tempatId: asal.tempat?.id }}
          tujuan={rute?.found ? rute.targetId : null}
          tujuanTempatId={rute?.found ? ke : null}
          terpilih={tempatDetail?.id || tempatPratinjau?.id}
          posisiPengguna={posisiPengguna}
          pilihPeta={pilihPeta}
          onPilihTempat={klikPeta}
          onBatalPilih={() => { setPilihPeta(null); setPanel('mid') }}
          onLocateMe={pakaiGps}
          gpsMemuat={statusGps.jenis === 'info' && statusGps.pesan.includes('Mencari')}
        />

        {tempatPratinjau && !pilihPeta && (
          <CardGedung
            tempat={tempatPratinjau}
            jumlahRuangan={jumlahRuanganPratinjau}
            onTutup={() => setGedungPratinjau(null)}
            onRuteKe={(id) => setTujuanTempat(id)}
            onRuteDari={(id) => setAsalTempat(id)}
            onBukaDetail={(id) => {
              setGedungPratinjau(null)
              setDetail(id)
              setTab('jelajah')
              setPanel('mid')
              setPanelTersembunyi(false)
            }}
          />
        )}
      </main>

      {panduan && <Panduan onTutup={tutupPanduan} onJelajahi={() => { tutupPanduan(); setTab('jelajah') }} />}
    </div>
  )
}