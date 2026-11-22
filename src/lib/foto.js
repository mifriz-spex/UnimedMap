/**
 * Modul pemetaan foto gedung dan fasilitas kawasan Unimed.
 * Memetakan berkas gambar di src/assets/ (atau src/assests/) ke ID tempat.
 */

const fotoModules = import.meta.glob(
  ['../assets/**/*.{webp,jpg,jpeg,png}', '../assests/**/*.{webp,jpg,jpeg,png}'],
  { eager: true, import: 'default' }
)

const FOTO_TEMPAT = {}

for (const [path, url] of Object.entries(fotoModules)) {
  const match = path.match(/\/([^/]+)\.(webp|jpg|jpeg|png)$/i)
  if (match) {
    const kunci = match[1].toLowerCase().replace(/_/g, '-')
    FOTO_TEMPAT[kunci] = url
  }
}

/**
 * Pemetaan eksplisit: ID tempat di tempat.json -> nama berkas foto (tanpa ekstensi)
 * Tambahkan atau ubah baris di bawah jika ada foto gedung yang tertukar.
 */
const ALIAS_FOTO = {
  'lab-matematika-fmipa': 'lab-komputer',
  'lab-biologi-lama': 'lab-biologi-lama',
  'lab-biologi': 'lab-biologi',
}

/**
 * Mengambil URL foto untuk ID tempat tertentu.
 * @param {string} tempatId
 * @returns {string|null}
 */
export function ambilFotoTempat(tempatId) {
  if (!tempatId) return null
  const normal = String(tempatId).toLowerCase().replace(/_/g, '-')
  const targetAlias = ALIAS_FOTO[normal]
  const tanpaAwalan = normal.replace(/^gedung-/, '')
  const tanpaAkhiranFakultas = tanpaAwalan.replace(/-(fmipa|ft|fbs|fis|fik|fe|feb|fip|fk)$/, '')

  return (
    (targetAlias && FOTO_TEMPAT[targetAlias]) ||
    FOTO_TEMPAT[normal] ||
    FOTO_TEMPAT[tanpaAwalan] ||
    FOTO_TEMPAT[tanpaAkhiranFakultas] ||
    null
  )
}

/**
 * Mengecek apakah tempat memiliki foto yang tersedia.
 * @param {string} tempatId
 * @returns {boolean}
 */
export function adaFotoTempat(tempatId) {
  return Boolean(ambilFotoTempat(tempatId))
}

/**
 * Menghasilkan gambar placeholder SVG ringan bertema kampus jika foto belum tersedia.
 */
export function buatPlaceholderGedung(nama = 'Gedung Unimed', warna = '#065f46') {
  const inisial = nama
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((k) => k[0]?.toUpperCase() || '')
    .join('')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${warna}" />
        <stop offset="100%" stop-color="#0f172a" />
      </linearGradient>
    </defs>
    <rect width="640" height="360" fill="url(#g)" />
    <circle cx="560" cy="60" r="140" fill="#ffffff" fill-opacity="0.06" />
    <circle cx="80" cy="320" r="110" fill="#ffffff" fill-opacity="0.05" />
    <rect x="44" y="44" width="68" height="68" rx="16" fill="#ffffff" fill-opacity="0.16" />
    <text x="78" y="88" text-anchor="middle" fill="#ffffff" font-family="system-ui, sans-serif" font-size="28" font-weight="700">${inisial || 'UN'}</text>
    <text x="44" y="295" fill="#ffffff" fill-opacity="0.78" font-family="system-ui, sans-serif" font-size="16" font-weight="600">Universitas Negeri Medan</text>
    <text x="44" y="322" fill="#ffffff" fill-opacity="0.55" font-family="system-ui, sans-serif" font-size="13">Foto gedung belum tersedia</text>
  </svg>`

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export { FOTO_TEMPAT, ALIAS_FOTO }