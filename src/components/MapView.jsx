import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { CircleMarker, Circle, MapContainer, Marker, Polygon, Polyline, TileLayer, Tooltip, ZoomControl, useMap, useMapEvents } from 'react-leaflet'
import { KELOMPOK } from '../lib/peta'
import { pusatTitik } from '../lib/geo'
import { tempat as daftarTempat } from '../data'
import { IkonLokasi } from './Ikon'
import Legenda from './Legenda'

function ikonLabel(teks, bawah = false, satelit = false) {
  const bersih = teks.replace(/[<>&]/g, '')
  const gayaSatelit = satelit
    ? ' style="color:#ffffff;text-shadow:0 1px 3px rgba(0,0,0,0.95),0 0 6px rgba(0,0,0,0.95),1px 0 2px rgba(0,0,0,0.9),-1px 0 2px rgba(0,0,0,0.9)"'
    : ''
  return L.divIcon({
    className: `peta-label${bawah ? ' peta-label-bawah' : ''}${satelit ? ' peta-label-satelit' : ''}`,
    html: `<span${gayaSatelit}>${bersih}</span>`,
    iconSize: [0, 0],
  })
}

const ikonPin = (huruf, kelas) =>
  L.divIcon({
    className: `peta-pin ${kelas}`,
    html: `<span>${huruf}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })

function AturPandangan({ batas, garis, kunciRute }) {
  const map = useMap()
  const sebelumnya = useRef(null)

  useEffect(() => {
    const pasang = () => {
      map.invalidateSize()
      if (garis && garis.length > 1) map.fitBounds(garis, { padding: [48, 48], maxZoom: 19 })
      else map.fitBounds(batas, { padding: [16, 16] })
    }
    const berubah = sebelumnya.current !== kunciRute
    sebelumnya.current = kunciRute
    if (!berubah) return undefined
    const timer = setTimeout(pasang, 320)
    return () => clearTimeout(timer)
  }, [map, batas, garis, kunciRute])

  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return undefined
    const pengamat = new ResizeObserver(() => map.invalidateSize())
    pengamat.observe(map.getContainer())
    return () => pengamat.disconnect()
  }, [map])

  return null
}

function KontrolPetaAtas({ batas, tampilJalur, onToggleJalur, modePeta, onGantiModePeta }) {
  const map = useMap()
  return (
    <div className="pointer-events-auto absolute left-2.5 top-[calc(0.625rem+env(safe-area-inset-top,0px))] z-[1000] flex max-w-[calc(100%-4rem)] flex-nowrap items-center gap-1.5 overflow-x-auto no-scrollbar">
      <button
        type="button"
        onClick={() => map.fitBounds(batas, { padding: [16, 16] })}
        className="min-h-[44px] flex-none inline-flex items-center justify-center whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 shadow-md hover:bg-slate-50 active:bg-slate-100 transition-colors"
        aria-label="Kembali ke tampilan seluruh kampus Unimed"
      >
        <span className="sm:hidden">Kampus</span>
        <span className="hidden sm:inline">Seluruh kampus</span>
      </button>

      <div
        role="group"
        aria-label="Pilih tampilan peta"
        className="inline-flex flex-none overflow-hidden rounded-xl border border-slate-200 bg-white p-0.5 shadow-md"
      >
        {[
          ['osm', 'Peta'],
          ['satelit', 'Satelit'],
        ].map(([id, label]) => {
          const aktif = modePeta === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onGantiModePeta(id)}
              aria-pressed={aktif}
              className={`min-h-[44px] rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                aktif
                  ? 'bg-[#064E3B] text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {onToggleJalur && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleJalur()
          }}
          className={`min-h-[44px] flex-none inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-semibold shadow-md transition-colors ${
            tampilJalur
              ? 'border-[#064E3B] bg-[#064E3B] text-white hover:bg-[#047857]'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100'
          }`}
          aria-pressed={tampilJalur}
          aria-label={tampilJalur ? 'Sembunyikan seluruh rute di peta' : 'Tampilkan seluruh rute di peta'}
          title={tampilJalur ? 'Sembunyikan seluruh rute jalan kaki' : 'Nyalakan tampilan seluruh rute jalan kaki di peta'}
        >
          <span
            className={`inline-block h-2 w-2 rounded-full transition-colors ${
              tampilJalur ? 'bg-lime-300' : 'bg-slate-400'
            }`}
          />
          <span className="sm:hidden">{tampilJalur ? 'Jalur aktif' : 'Jalur'}</span>
          <span className="hidden sm:inline">{tampilJalur ? 'Semua rute aktif' : 'Lihat semua rute'}</span>
        </button>
      )}
    </div>
  )
}

const PRIORITAS = {
  pusat: 0,
  fmipa: 1,
  ft: 1,
  fbs: 1,
  fis: 1,
  fik: 1,
  fe: 1,
  fip: 1,
  fk: 1,
  jurusan: 1,
  lab: 2,
  umum: 3,
  lainnya: 3,
  taman: 4,
}

/** Tampilkan label sebanyak mungkin tanpa saling menimpa; gedung utama didahulukan. */
function labelTerlihat(map, itemLabel) {
  const terlihat = new Set()
  if (map.getZoom() < 16) return terlihat
  const kotak = []
  const urut = [...itemLabel].sort((a, b) => (PRIORITAS[a.kelompok] ?? 9) - (PRIORITAS[b.kelompok] ?? 9))
  for (const b of urut) {
    const p = map.latLngToContainerPoint([b.pusat.lat, b.pusat.lon])
    const w = b.label.length * 7.2 + 14
    const h = 20
    const k = { x1: p.x - w / 2, x2: p.x + w / 2, y1: p.y - h / 2, y2: p.y + h / 2 }
    const bertabrakan = kotak.some((o) => k.x1 < o.x2 && k.x2 > o.x1 && k.y1 < o.y2 && k.y2 > o.y1)
    if (!bertabrakan) {
      kotak.push(k)
      terlihat.add(b.tempatId)
    }
  }
  return terlihat
}

function LabelGedung({ itemLabel, berpin, satelit }) {
  const map = useMap()
  const [versi, setVersi] = useState(0)
  useMapEvents({ zoomend: () => setVersi((v) => v + 1), moveend: () => setVersi((v) => v + 1) })

  const ikon = useMemo(
    () =>
      new Map(
        itemLabel.map((b) => [
          b.tempatId,
          [ikonLabel(b.label, true, satelit), ikonLabel(b.label, true, satelit)],
        ])
      ),
    [itemLabel, satelit]
  )

  const terlihat = useMemo(() => {
    void versi
    return labelTerlihat(map, itemLabel)
  }, [map, itemLabel, versi])

  return itemLabel
    .filter((b) => terlihat.has(b.tempatId) || berpin.has(b.tempatId))
    .map((b) => (
      <Marker
        key={`${b.tempatId}-${satelit ? 'sat' : 'osm'}`}
        position={[b.pusat.lat, b.pusat.lon]}
        icon={ikon.get(b.tempatId)[berpin.has(b.tempatId) ? 1 : 0]}
        interactive={false}
        keyboard={false}
        zIndexOffset={-100}
      />
    ))
}

export default function MapView({
  bentuk,
  batas,
  edges,
  pointsById,
  tampilJalur,
  onToggleJalur,
  garisRute,
  kunciRute,
  asal,
  tujuan,
  tujuanTempatId,
  terpilih,
  posisiPengguna,
  pilihPeta,
  onPilihTempat,
  onBatalPilih,
  onLocateMe,
  gpsMemuat = false,
}) {
  const [petaSiap, setPetaSiap] = useState(false)
  const [modePeta, setModePeta] = useState('osm')
  const isSatelit = modePeta === 'satelit'

  const garisJalur = useMemo(
    () =>
      edges.features.map((f) => ({
        id: f.properties.id,
        positions: (f.geometry.type === 'MultiLineString' ? f.geometry.coordinates.flat() : f.geometry.coordinates).map(
          ([lon, lat]) => [lat, lon]
        ),
      })),
    [edges]
  )

  // Bangun titik lokasi interaktif dari tempat.json + pointsById (pengganti poligon)
  const titikGedung = useMemo(() => {
    const punyaPoligon = new Set(bentuk.map((b) => b.tempatId))
    const hasil = []
    for (const t of daftarTempat) {
      if (punyaPoligon.has(t.id)) continue
      const coords = (t.titik || []).map((id) => pointsById[id]).filter(Boolean)
      if (!coords.length) continue
      const pusat = pusatTitik(coords)
      if (!pusat) continue
      hasil.push({
        tempatId: t.id,
        nama: t.nama,
        label: t.label || t.nama,
        fakultas: t.fakultas,
        kelompok: t.kelompok,
        pusat,
      })
    }
    return hasil
  }, [bentuk, pointsById])

  // Gabungkan poligon dan titik gedung untuk sistem label anti-tumpuk
  const semuaItemLabel = useMemo(() => [...bentuk, ...titikGedung], [bentuk, titikGedung])

  const pinAsal = useMemo(() => ikonPin('A', 'pin-a'), [])
  const pinTujuan = useMemo(() => ikonPin('B', 'pin-b'), [])
  const titikAsal = asal && pointsById[asal.titikId]
  const titikTujuan = tujuan && pointsById[tujuan]

  return (
    <div className="relative h-full w-full" data-pilih={pilihPeta || ''}>
      <MapContainer
        bounds={batas}
        boundsOptions={{ padding: [16, 16] }}
        minZoom={14}
        maxZoom={21}
        zoomSnap={0.25}
        zoomControl={false}
        className="h-full w-full"
        whenReady={() => setPetaSiap(true)}
        aria-label="Peta Kampus Unimed"
      >
        {isSatelit ? (
          <TileLayer
            key="google-satelit"
            url="https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
            subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
            attribution='&copy; Google Maps'
            maxZoom={21}
            maxNativeZoom={20}
          />
        ) : (
          <TileLayer
            key="osm"
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            maxZoom={21}
            maxNativeZoom={19}
          />
        )}

        <ZoomControl position="bottomright" />
        <AturPandangan batas={batas} garis={garisRute} kunciRute={kunciRute} />

        {/* Poligon (jika ada) */}
        {bentuk.map((b) => {
          const warna = KELOMPOK[b.kelompok]?.warna || '#475569'
          const aktif = terpilih === b.tempatId || asal?.tempatId === b.tempatId || tujuanTempatId === b.tempatId
          return (
            <Polygon
              key={b.tempatId}
              positions={b.positions}
              pathOptions={{ color: warna, weight: aktif ? 4 : 2, fillColor: warna, fillOpacity: aktif ? 0.55 : 0.32 }}
              eventHandlers={{ click: () => onPilihTempat(b.tempatId) }}
            >
              <Tooltip direction="top" sticky>{b.label}</Tooltip>
            </Polygon>
          )
        })}

        {/* Jaringan jalan kaki (opsional) */}
        {tampilJalur &&
          garisJalur.map((g) => (
            <Polyline
              key={g.id}
              positions={g.positions}
              interactive={false}
              pathOptions={{
                color: isSatelit ? '#facc15' : '#64748b',
                weight: 3,
                opacity: isSatelit ? 0.85 : 0.7,
              }}
            />
          ))}

        {/* Garis rute aktif */}
        {garisRute && garisRute.length > 1 && (
          <>
            <Polyline
              positions={garisRute}
              interactive={false}
              pathOptions={{ color: '#ffffff', weight: 11, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }}
            />
            <Polyline
              positions={garisRute}
              interactive={false}
              pathOptions={{ color: '#1d4ed8', weight: 6, opacity: 1, lineCap: 'round', lineJoin: 'round' }}
            />
          </>
        )}

        {/* Garis bantu dari posisi GPS ke titik jalur terdekat */}
        {asal?.jenis === 'gps' && titikAsal && asal.jarak > 4 && (
          <Polyline
            positions={[
              [asal.lat, asal.lon],
              [titikAsal.lat, titikAsal.lon],
            ]}
            interactive={false}
            pathOptions={{ color: '#1d4ed8', weight: 3, dashArray: '4 6' }}
          />
        )}

        {/* Titik marker gedung & fasilitas (pengganti poligon) */}
        {titikGedung.map((g) => {
          const warna = KELOMPOK[g.kelompok]?.warna || '#0284c7'
          const aktif = terpilih === g.tempatId || asal?.tempatId === g.tempatId || tujuanTempatId === g.tempatId
          return (
            <CircleMarker
              key={g.tempatId}
              center={[g.pusat.lat, g.pusat.lon]}
              radius={aktif ? 10 : 7}
              pathOptions={{
                color: '#ffffff',
                weight: aktif ? 3 : 2,
                fillColor: warna,
                fillOpacity: aktif ? 1 : 0.95,
              }}
              eventHandlers={{ click: () => onPilihTempat(g.tempatId) }}
            >
              <Tooltip direction="top" offset={[0, -6]}>
                <span className="font-semibold">{g.nama}</span>
                {g.fakultas ? <span className="block text-[11px] text-slate-600">{g.fakultas}</span> : null}
              </Tooltip>
            </CircleMarker>
          )
        })}

        <LabelGedung
          itemLabel={semuaItemLabel}
          berpin={new Set([asal?.tempatId, tujuanTempatId, terpilih].filter(Boolean))}
          satelit={isSatelit}
        />

        {titikAsal && <Marker position={[titikAsal.lat, titikAsal.lon]} icon={pinAsal} keyboard={false} title="Titik awal" />}
        {titikTujuan && <Marker position={[titikTujuan.lat, titikTujuan.lon]} icon={pinTujuan} keyboard={false} title="Tujuan" />}

        {posisiPengguna && (
          <>
            {posisiPengguna.akurasi > 0 && (
              <Circle
                center={[posisiPengguna.lat, posisiPengguna.lon]}
                radius={posisiPengguna.akurasi}
                interactive={false}
                pathOptions={{ color: '#2563eb', weight: 1, fillColor: '#3b82f6', fillOpacity: 0.12 }}
              />
            )}
            <CircleMarker
              center={[posisiPengguna.lat, posisiPengguna.lon]}
              radius={8}
              interactive={false}
              pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }}
            />
          </>
        )}

        <KontrolPetaAtas
          batas={batas}
          tampilJalur={tampilJalur}
          onToggleJalur={onToggleJalur}
          modePeta={modePeta}
          onGantiModePeta={setModePeta}
        />
      </MapContainer>

      <div
        className="pointer-events-none absolute right-2.5 top-[calc(0.625rem+env(safe-area-inset-top,0px))] z-[1000] flex h-11 w-11 flex-col items-center justify-center rounded-full border border-slate-200/90 bg-white text-[10px] font-bold leading-none text-[#0F172A] shadow-[0_2px_10px_rgba(15,23,42,0.12)]"
        aria-label="Utara berada di bagian atas peta"
      >
        <span className="text-red-600">▲</span>U
      </div>

      <Legenda />

      {onLocateMe && (
        <button
          type="button"
          onClick={onLocateMe}
          disabled={gpsMemuat}
          aria-label="Gunakan lokasi GPS saya saat ini"
          title="Lokasi saya (GPS)"
          className="peta-kontrol-bawah pointer-events-auto absolute right-2.5 bottom-[calc(var(--bottom-sheet-height,35dvh)+7.25rem+env(safe-area-inset-bottom,0px))] z-[950] flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-[#064E3B] shadow-[0_2px_10px_rgba(15,23,42,0.12)] transition-[bottom,opacity,background-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-emerald-50 active:bg-emerald-100 md:bottom-[6.75rem]"
        >
          <IkonLokasi ukuran={20} className={gpsMemuat ? 'animate-pulse' : ''} />
        </button>
      )}

      {pilihPeta && (
        <div
          role="status"
          className="absolute left-1/2 top-[calc(4.25rem+env(safe-area-inset-top,0px))] z-[1100] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center gap-2 rounded-2xl bg-slate-900/95 px-3.5 py-2.5 text-sm text-white shadow-xl backdrop-blur-xs sm:top-[calc(1rem+env(safe-area-inset-top,0px))]"
        >
          <span className="flex-1 text-xs sm:text-sm">Ketuk titik gedung di peta untuk memilih {pilihPeta === 'asal' ? 'titik awal' : 'tujuan'}.</span>
          <button type="button" onClick={onBatalPilih} className="min-h-[44px] inline-flex items-center rounded-xl bg-white/20 px-3 py-1 text-xs sm:text-sm font-semibold hover:bg-white/30 active:bg-white/40">
            Batal
          </button>
        </div>
      )}
      {!petaSiap && <span className="sr-only">Memuat peta…</span>}
    </div>
  )
}