/**
 * Modul pemetaan foto gedung dan fasilitas kawasan Unimed.
 * Memetakan berkas WebP di src/assets/ (seperti src/assets/fmipa/) ke ID tempat.
 */

const fotoModules = import.meta.glob('../assets/**/*.webp', { eager: true, import: 'default' })

const FOTO_TEMPAT = {}

for (const [path, url] of Object.entries(fotoModules)) {
  const match = path.match(/\/([^/]+)\.webp$/)
  if (match) {
    FOTO_TEMPAT[match[1]] = url
  }
}

/**
 * Mengambil URL foto untuk ID tempat tertentu.
 * @param {string} tempatId
 * @returns {string|null}
 */
export function ambilFotoTempat(tempatId) {
  if (!tempatId) return null
  const bersih = String(tempatId).replace(/^gedung-/, '')
  return FOTO_TEMPAT[tempatId] || FOTO_TEMPAT[bersih] || null
}

/**
 * Mengecek apakah tempat memiliki foto yang tersedia.
 * @param {string} tempatId
 * @returns {boolean}
 */
export function adaFotoTempat(tempatId) {
  return Boolean(ambilFotoTempat(tempatId))
}

export { FOTO_TEMPAT }