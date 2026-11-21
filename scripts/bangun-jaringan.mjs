#!/usr/bin/env node
/**
 * scripts/bangun-jaringan.mjs
 * 
 * Skrip pembangun topologi jaringan jalan pejalan kaki dan titik lokasi kampus Unimed.
 * Membaca data mentah dari scripts/data-mentah/:
 *   - survei_kampus_unimed.geojson (garis jalur pejalan kaki & jalan kampus)
 *   - lokasi_unimed.geojson (titik lokasi gedung dan fasilitas kampus)
 * 
 * Penggunaan:
 *   node scripts/bangun-jaringan.mjs          # Mode Kering (Dry-run, hanya analisa dan laporan)
 *   node scripts/bangun-jaringan.mjs --tulis  # Mode Tulis (Mencadangkan file lama & memperbarui src/data/)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT_DIR = resolve(__dirname, '..')

// Path berkas data mentah & target src/data
const PATH_SURVEI_RAW = resolve(ROOT_DIR, 'scripts/data-mentah/survei_kampus_unimed.geojson')
const PATH_LOKASI_RAW = resolve(ROOT_DIR, 'scripts/data-mentah/lokasi_unimed.geojson')
const PATH_KOORDINAT_SRC = resolve(ROOT_DIR, 'src/data/koordinat_fmipa.geojson')
const PATH_EDGES_SRC = resolve(ROOT_DIR, 'src/data/edges_fmipa.geojson')
const PATH_POLIGON_SRC = resolve(ROOT_DIR, 'src/data/gedung_fmipa.geojson')
const PATH_TEMPAT_SRC = resolve(ROOT_DIR, 'src/data/tempat.json')
const DIR_CADANGAN = resolve(ROOT_DIR, 'scripts/cadangan')

// Konstanta proyeksi planar lokal untuk area kampus Unimed (~3.607° N, 98.715° E)
const LAT0 = 3.6070
const LON0 = 98.7150
const METERS_PER_LAT = 110540.0
const METERS_PER_LON = 111320.0 * Math.cos((LAT0 * Math.PI) / 180.0)

/** Konversi [lon, lat] ke [x, y] meter relatif dari titik asal lokal */
function toLocalMeters([lon, lat]) {
  return [
    (lon - LON0) * METERS_PER_LON,
    (lat - LAT0) * METERS_PER_LAT,
  ]
}

/** Konversi [x, y] meter ke [lon, lat] */
function toGeoCoordinates([x, y]) {
  return [
    Number((LON0 + x / METERS_PER_LON).toFixed(7)),
    Number((LAT0 + y / METERS_PER_LAT).toFixed(7)),
  ]
}

/** Jarak Euclidean dalam meter */
function distanceMeters([x1, y1], [x2, y2]) {
  return Math.hypot(x1 - x2, y1 - y2)
}

/**
 * Proyeksi ortogonal sebuah titik P ke segmen garis AB.
 * Mengembalikan parameter t (0 = A, 1 = B), titik proyeksi terdekat proj, dan jaraknya ke P.
 */
function projectPointToSegment(P, A, B) {
  const dx = B[0] - A[0]
  const dy = B[1] - A[1]
  const L2 = dx * dx + dy * dy
  if (L2 === 0) {
    return { t: 0, proj: A, dist: distanceMeters(P, A) }
  }
  const t = ((P[0] - A[0]) * dx + (P[1] - A[1]) * dy) / L2
  const clampedT = Math.max(0, Math.min(1, t))
  const proj = [A[0] + clampedT * dx, A[1] + clampedT * dy]
  return { t: clampedT, rawT: t, proj, dist: distanceMeters(P, proj) }
}

/**
 * Pengelompokan fakultas otomatis berbasis nama lokasi
 */
function klasifikasiFakultas(rawName) {
  const s = rawName.toLowerCase().replace(/_/g, ' ').trim()
  if (/\b(fmipa|fimpa)\b/.test(s) || /\b(matematika|biologi|fisika|kimia|syawal)\b/.test(s)) {
    return { fakultas: 'FMIPA', kelompok: 'fmipa' }
  }
  if (/\b(ft|teknik|bangunan|mesin|elektro|pkk|tata rias|gizi|otomotif)\b/.test(s)) {
    return { fakultas: 'FT', kelompok: 'ft' }
  }
  if (/\b(fbs|seni|tari|bahasa|gallery)\b/.test(s)) {
    return { fakultas: 'FBS', kelompok: 'fbs' }
  }
  if (/\b(fis)\b/.test(s)) {
    return { fakultas: 'FIS', kelompok: 'fis' }
  }
  if (/\b(fik|pentaque)\b/.test(s)) {
    return { fakultas: 'FIK', kelompok: 'fik' }
  }
  if (/\b(feb|fe)\b/.test(s)) {
    return { fakultas: 'FE', kelompok: 'fe' }
  }
  if (/\b(fip)\b/.test(s)) {
    return { fakultas: 'FIP', kelompok: 'fip' }
  }
  if (/\b(fk)\b/.test(s)) {
    return { fakultas: 'FK', kelompok: 'fk' }
  }
  if (/\b(biro|rektorat)\b/.test(s)) {
    return { fakultas: 'Rektorat', kelompok: 'pusat' }
  }
  return { fakultas: 'Fasilitas Umum', kelompok: 'umum' }
}

/** Format nama tempat menjadi rapi dan ramah dibaca */
function formatNamaTempat(rawName) {
  return rawName
    .replace(/_/g, ' ')
    .replace(/\bfimpa\b/gi, 'FMIPA')
    .split(' ')
    .map((w) => {
      const up = w.toUpperCase()
      if (['FMIPA', 'FT', 'FBS', 'FIS', 'FIK', 'FE', 'FEB', 'FIP', 'FK', 'UPT', 'PUSKOM', 'LPPM', 'PKK'].includes(up)) {
        return up
      }
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    })
    .join(' ')
}

/**
 * Memuat berkas mentah
 */
function muatDataMentah() {
  if (!existsSync(PATH_SURVEI_RAW)) {
    console.error(`[GALAT] Berkas jalur tidak ditemukan: ${PATH_SURVEI_RAW}`)
    process.exit(1)
  }
  if (!existsSync(PATH_LOKASI_RAW)) {
    console.error(`[GALAT] Berkas lokasi tidak ditemukan: ${PATH_LOKASI_RAW}`)
    process.exit(1)
  }

  const rawSurvei = JSON.parse(readFileSync(PATH_SURVEI_RAW, 'utf8'))
  const rawLokasi = JSON.parse(readFileSync(PATH_LOKASI_RAW, 'utf8'))
  return { rawSurvei, rawLokasi }
}

/**
 * Proses utama topologi jaringan
 */
function prosesJaringan(rawSurvei, rawLokasi) {
  // 1. Bersihkan segmen nol dan duplikasi titik beruntun
  const validLines = []
  const laporanSegmenDibuang = []

  for (const f of rawSurvei.features) {
    const coords = f.geometry.coordinates
    const clean = []
    for (let i = 0; i < coords.length; i += 1) {
      if (i === 0 || distanceMeters(toLocalMeters(coords[i]), toLocalMeters(coords[i - 1])) > 0.001) {
        clean.push(coords[i])
      }
    }
    let pjg = 0
    for (let i = 1; i < clean.length; i += 1) {
      pjg += distanceMeters(toLocalMeters(clean[i - 1]), toLocalMeters(clean[i]))
    }
    if (pjg < 0.01 || clean.length < 2) {
      laporanSegmenDibuang.push({
        fid: f.properties?.fid,
        panjang: pjg,
        coords: clean,
      })
    } else {
      validLines.push({
        fid: f.properties?.fid,
        coordsM: clean.map(toLocalMeters),
      })
    }
  }

  // 2. Pecah garis pada vertex interior yang berimpit dengan titik lokasi (toleransi 0.05m)
  const locPoints = rawLokasi.features.map((f) => ({
    fid: f.properties.fid,
    name: f.properties.nama_lokasi,
    m: toLocalMeters(f.geometry.coordinates),
  }))

  const linesAfterLocSplit = []
  for (const lineObj of validLines) {
    const line = lineObj.coordsM
    const splitIdx = [0]
    for (let i = 1; i < line.length - 1; i += 1) {
      const pt = line[i]
      const isLoc = locPoints.some((l) => distanceMeters(l.m, pt) <= 0.05)
      if (isLoc) splitIdx.push(i)
    }
    splitIdx.push(line.length - 1)
    for (let s = 0; s < splitIdx.length - 1; s += 1) {
      linesAfterLocSplit.push({
        fid: lineObj.fid,
        coordsM: line.slice(splitIdx[s], splitIdx[s + 1] + 1),
      })
    }
  }

  // 3. Noding T-junction (ujung ruas berjarak <= 1.0 m dari bagian dalam ruas lain)
  let currentLines = linesAfterLocSplit.map((l) => ({ ...l, coordsM: [...l.coordsM] }))
  const laporanTNoding = []
  let changed = true
  let iter = 0
  const MAX_ITER = 15

  while (changed && iter < MAX_ITER) {
    changed = false
    iter += 1
    let best = null

    for (let i = 0; i < currentLines.length; i += 1) {
      const l1 = currentLines[i].coordsM
      const endpoints = [
        { isStart: true, pt: l1[0] },
        { isStart: false, pt: l1[l1.length - 1] },
      ]

      for (const ep of endpoints) {
        for (let j = 0; j < currentLines.length; j += 1) {
          if (i === j) continue
          const l2 = currentLines[j].coordsM
          for (let s = 0; s < l2.length - 1; s += 1) {
            const res = projectPointToSegment(ep.pt, l2[s], l2[s + 1])
            const distA = distanceMeters(res.proj, l2[s])
            const distB = distanceMeters(res.proj, l2[s + 1])
            if (res.rawT > 0.001 && res.rawT < 0.999 && distA > 0.05 && distB > 0.05) {
              if (res.dist <= 1.0) {
                if (!best || res.dist < best.dist) {
                  best = {
                    sourceLineIdx: i,
                    isStart: ep.isStart,
                    targetLineIdx: j,
                    segIdx: s,
                    proj: res.proj,
                    dist: res.dist,
                    sourceFid: currentLines[i].fid,
                    targetFid: currentLines[j].fid,
                  }
                }
              }
            }
          }
        }
      }
    }

    if (best) {
      changed = true
      const { sourceLineIdx, isStart, targetLineIdx, segIdx, proj, dist, sourceFid, targetFid } = best
      if (isStart) currentLines[sourceLineIdx].coordsM[0] = proj
      else currentLines[sourceLineIdx].coordsM[currentLines[sourceLineIdx].coordsM.length - 1] = proj

      const targetCoords = currentLines[targetLineIdx].coordsM
      const part1 = [...targetCoords.slice(0, segIdx + 1), proj]
      const part2 = [proj, ...targetCoords.slice(segIdx + 1)]
      currentLines.splice(targetLineIdx, 1, { fid: targetFid, coordsM: part1 }, { fid: targetFid, coordsM: part2 })

      laporanTNoding.push({
        sourceFid,
        targetFid,
        dist,
        projGeo: toGeoCoordinates(proj),
      })
    }
  }

  // 4. Ekstrak seluruh simpul persimpangan/ujung garis (bukan intermediate bend)
  const rawNodes = []
  function getOrCreateNode(ptM, tol = 0.05) {
    for (let i = 0; i < rawNodes.length; i += 1) {
      if (distanceMeters(rawNodes[i], ptM) <= tol) return i
    }
    rawNodes.push(ptM)
    return rawNodes.length - 1
  }

  for (const line of currentLines) {
    getOrCreateNode(line.coordsM[0])
    getOrCreateNode(line.coordsM[line.coordsM.length - 1])
  }

  // 5. Penyelarasan ID simpul FMIPA agar kompatibel penuh dengan test dan aturan navigasi
  const assignedNodeIdForVertex = new Map()
  const assignedVertexForNodeId = new Map()

  function assignSpecificNode(nodeId, ptM) {
    let minD = Infinity
    let bestV = -1
    for (let i = 0; i < rawNodes.length; i += 1) {
      if (assignedNodeIdForVertex.has(i)) continue
      const d = distanceMeters(ptM, rawNodes[i])
      if (d < minD) {
        minD = d
        bestV = i
      }
    }
    assignedNodeIdForVertex.set(bestV, nodeId)
    assignedVertexForNodeId.set(nodeId, bestV)
    return { vIdx: bestV, dist: minD }
  }

  // Fisika = 1 (fid 5)
  const fid5 = rawLokasi.features.find((f) => f.properties.fid === 5)
  assignSpecificNode(1, toLocalMeters(fid5.geometry.coordinates))

  // Biologi = 2 (fid 4)
  const fid4 = rawLokasi.features.find((f) => f.properties.fid === 4)
  assignSpecificNode(2, toLocalMeters(fid4.geometry.coordinates))

  // Matematika = 3 (fid 2)
  const fid2 = rawLokasi.features.find((f) => f.properties.fid === 2)
  assignSpecificNode(3, toLocalMeters(fid2.geometry.coordinates))

  // Kimia = 4 (fid 3)
  const fid3 = rawLokasi.features.find((f) => f.properties.fid === 3)
  assignSpecificNode(4, toLocalMeters(fid3.geometry.coordinates))

  // Lobi Syawal: 5 (Timur), 6 (Barat), 7 (Utara), 8 (Selatan)
  const syawalDoors = [
    { id: 5, target: toLocalMeters([98.71553776134017, 3.607075246828564]) },
    { id: 6, target: toLocalMeters([98.71521977262763, 3.607125493756078]) },
    { id: 7, target: toLocalMeters([98.7153238930645, 3.607243578026923]) },
    { id: 8, target: toLocalMeters([98.71538850476519, 3.606946249757618]) },
  ]
  for (const d of syawalDoors) {
    assignSpecificNode(d.id, d.target)
  }

  // Lab Kimia = 9 (fid 9)
  const fid9 = rawLokasi.features.find((f) => f.properties.fid === 9)
  assignSpecificNode(9, toLocalMeters(fid9.geometry.coordinates))

  // Lab Komputer = 10 (simpul dekat Lab Komputer)
  assignSpecificNode(10, toLocalMeters([98.71429727489695, 3.606955381749354]))

  // Lab Biologi = 11 (fid 57)
  const fid57 = rawLokasi.features.find((f) => f.properties.fid === 57)
  assignSpecificNode(11, toLocalMeters(fid57.geometry.coordinates))

  // Gedung Kuliah Bersama = 12 (fid 10)
  const fid10 = rawLokasi.features.find((f) => f.properties.fid === 10)
  assignSpecificNode(12, toLocalMeters(fid10.geometry.coordinates))

  // Lab Fisika = 13 (fid 14)
  const fid14 = rawLokasi.features.find((f) => f.properties.fid === 14)
  assignSpecificNode(13, toLocalMeters(fid14.geometry.coordinates))

  // Bilingual = 14 (fid 58)
  const fid58 = rawLokasi.features.find((f) => f.properties.fid === 58)
  assignSpecificNode(14, toLocalMeters(fid58.geometry.coordinates))

  // Rumah Hewan = 15 (fid 56)
  const fid56 = rawLokasi.features.find((f) => f.properties.fid === 56)
  assignSpecificNode(15, toLocalMeters(fid56.geometry.coordinates))

  // Serbaguna Taman = 16
  assignSpecificNode(16, toLocalMeters([98.71354662352458, 3.606879661883678]))

  // Taman Biologi = 17
  assignSpecificNode(17, toLocalMeters([98.71353285841371, 3.607058476642107]))

  // Rumah Kaca = 18 (ujung buntu fid 123)
  assignSpecificNode(18, toLocalMeters([98.7152669452866, 3.606964677911732]))

  // Alokasikan sisa vertex ke ID 19 dst.
  let nextId = 19
  for (let vIdx = 0; vIdx < rawNodes.length; vIdx += 1) {
    if (assignedNodeIdForVertex.has(vIdx)) continue
    assignedNodeIdForVertex.set(vIdx, nextId)
    assignedVertexForNodeId.set(nextId, vIdx)
    nextId += 1
  }

  // Buat array simpul awal terurut berdasarkan ID
  const initialNodes = []
  for (let id = 1; id <= assignedVertexForNodeId.size; id += 1) {
    const vIdx = assignedVertexForNodeId.get(id)
    const m = rawNodes[vIdx]
    initialNodes.push({
      id,
      coord: toGeoCoordinates(m),
      m,
    })
  }

  // 6. Bentuk ruas jalan (edges) dengan mempertahankan koordinat belokan (polyline geometry)
  let edges = []
  let nextEdgeId = 1
  for (const line of currentLines) {
    const v1 = getOrCreateNode(line.coordsM[0])
    const v2 = getOrCreateNode(line.coordsM[line.coordsM.length - 1])
    const u = assignedNodeIdForVertex.get(v1)
    const v = assignedNodeIdForVertex.get(v2)
    if (u !== v) {
      const exists = edges.some(
        (e) => (e.asal === u && e.tujuan === v) || (e.asal === v && e.tujuan === u)
      )
      if (!exists) {
        const uNode = initialNodes.find((n) => n.id === u)
        const vNode = initialNodes.find((n) => n.id === v)
        // Koordinat lengkap dari awal sampai akhir ruas (mempertahankan kelokan)
        const polyCoords = line.coordsM.map((m, idx) => {
          if (idx === 0) return uNode.coord
          if (idx === line.coordsM.length - 1) return vNode.coord
          return toGeoCoordinates(m)
        })
        edges.push({
          id: nextEdgeId,
          asal: u,
          tujuan: v,
          geometry: {
            type: 'LineString',
            coordinates: polyCoords,
          },
        })
        nextEdgeId += 1
      }
    }
  }

  // 7. Kontraksi simpul derajat 2 non-tempat (menyederhanakan kelokan menjadi polyline geometris)
  const tempatNodeIds = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18])
  for (const f of rawLokasi.features) {
    const ptM = toLocalMeters(f.geometry.coordinates)
    let minD = Infinity
    let nearestNode = null
    for (const n of initialNodes) {
      const d = distanceMeters(ptM, n.m)
      if (d < minD) {
        minD = d
        nearestNode = n
      }
    }
    if (nearestNode) tempatNodeIds.add(nearestNode.id)
  }

  let nodesMap = new Map(initialNodes.map((n) => [n.id, n]))
  let contracted = true
  let contractedCount = 0

  while (contracted) {
    contracted = false
    const deg = {}
    for (const id of nodesMap.keys()) deg[id] = 0
    for (const e of edges) {
      deg[e.asal] = (deg[e.asal] || 0) + 1
      deg[e.tujuan] = (deg[e.tujuan] || 0) + 1
    }

    for (const [idStr, d] of Object.entries(deg)) {
      const nodeId = Number(idStr)
      if (d === 2 && !tempatNodeIds.has(nodeId)) {
        const connected = edges.filter((e) => e.asal === nodeId || e.tujuan === nodeId)
        if (connected.length === 2 && connected[0] !== connected[1]) {
          const [e1, e2] = connected
          const u = e1.asal === nodeId ? e1.tujuan : e1.asal
          const v = e2.asal === nodeId ? e2.tujuan : e2.asal

          if (u !== v) {
            let c1 = [...e1.geometry.coordinates]
            if (e1.tujuan !== nodeId) c1.reverse()
            let c2 = [...e2.geometry.coordinates]
            if (e2.asal !== nodeId) c2.reverse()

            const mergedCoords = [...c1, ...c2.slice(1)]
            edges = edges.filter((e) => e !== e1 && e !== e2)
            edges.push({
              id: e1.id,
              asal: u,
              tujuan: v,
              geometry: {
                type: 'LineString',
                coordinates: mergedCoords,
              },
            })

            nodesMap.delete(nodeId)
            contractedCount += 1
            contracted = true
            break
          }
        }
      }
    }
  }

  // Perbarui daftar simpul final dan nomor ID sisi terurut
  const nodes = [...nodesMap.values()]
  edges.forEach((e, idx) => {
    e.id = idx + 1
  })

  // 8. Snapping seluruh titik lokasi ke simpul terdekat
  const snappingLaporan = []
  for (const f of rawLokasi.features) {
    const ptM = toLocalMeters(f.geometry.coordinates)
    let minD = Infinity
    let nearestNode = null
    for (const n of nodes) {
      const d = distanceMeters(ptM, n.m)
      if (d < minD) {
        minD = d
        nearestNode = n
      }
    }
    snappingLaporan.push({
      fid: f.properties.fid,
      nama: f.properties.nama_lokasi,
      jarakSnap: minD,
      nodeId: nearestNode.id,
      nodeCoord: nearestNode.coord,
    })
  }

  // 8. Bentuk daftar tempat (tempat.json)
  const tempatList = [
    {
      id: 'syawal',
      nama: 'Gedung Syawal',
      label: 'Syawal',
      namaLengkap: 'Gedung Prof. Dr. Syawal Gultom, M.Pd.',
      kelompok: 'pusat',
      fakultas: 'FMIPA',
      alias: ['dekanat', 'gedung dekanat', 'gedung fakultas', 'syawal gultom', 'fmipa'],
      gedung: [{ kode: '001', lantai: 3 }],
      titik: [5, 6, 7, 8],
      namaTitik: {
        '5': 'Lobi Timur Gedung Syawal (lobi utama)',
        '6': 'Lobi Barat Gedung Syawal',
        '7': 'Lobi Utara Gedung Syawal',
        '8': 'Lobi Selatan Gedung Syawal',
      },
      poligon: null,
    },
    {
      id: 'matematika',
      nama: 'Gedung Matematika',
      label: 'Matematika',
      kelompok: 'jurusan',
      fakultas: 'FMIPA',
      alias: ['jurusan matematika', 'fmipa'],
      gedung: [{ kode: '002', lantai: 8 }],
      titik: [3],
      poligon: null,
    },
    {
      id: 'kimia',
      nama: 'Gedung Kimia',
      label: 'Kimia',
      kelompok: 'jurusan',
      fakultas: 'FMIPA',
      alias: ['jurusan kimia', 'fmipa'],
      gedung: [{ kode: '003', lantai: 10 }],
      titik: [4],
      poligon: null,
    },
    {
      id: 'fisika',
      nama: 'Gedung Fisika',
      label: 'Fisika',
      kelompok: 'jurusan',
      fakultas: 'FMIPA',
      alias: ['jurusan fisika', 'fmipa'],
      gedung: [{ kode: '004', lantai: 9 }],
      titik: [1],
      poligon: null,
    },
    {
      id: 'biologi',
      nama: 'Gedung Biologi',
      label: 'Biologi',
      kelompok: 'jurusan',
      fakultas: 'FMIPA',
      alias: ['jurusan biologi', 'fmipa'],
      gedung: [{ kode: '005', lantai: 10 }],
      titik: [2],
      poligon: null,
    },
    {
      id: 'bilingual',
      nama: 'Gedung Bilingual',
      label: 'Bilingual',
      kelompok: 'jurusan',
      fakultas: 'FMIPA',
      alias: ['kelas bilingual', 'gedung perkuliahan bilingual fmipa'],
      gedung: [{ kode: '006', lantai: 2 }],
      titik: [14],
      poligon: null,
    },
    {
      id: 'lab-kimia',
      nama: 'Lab. Kimia',
      label: 'Lab. Kimia',
      kelompok: 'lab',
      fakultas: 'FMIPA',
      alias: ['laboratorium kimia fmipa'],
      gedung: [{ kode: '007', lantai: 3 }],
      titik: [9],
      poligon: null,
    },
    {
      id: 'lab-fisika',
      nama: 'Lab. Fisika',
      label: 'Lab. Fisika',
      kelompok: 'lab',
      fakultas: 'FMIPA',
      alias: ['laboratorium fisika fmipa'],
      gedung: [{ kode: '008', lantai: 4 }],
      titik: [13],
      poligon: null,
    },
    {
      id: 'lab-komputer',
      nama: 'Lab. Komputer',
      label: 'Lab. Komputer',
      kelompok: 'lab',
      fakultas: 'FMIPA',
      alias: ['laboratorium komputer fmipa', 'pusat komputer fmipa'],
      gedung: [{ kode: '009', lantai: 3 }],
      titik: [10],
      poligon: null,
    },
    {
      id: 'lab-biologi',
      nama: 'Lab. Biologi',
      label: 'Lab. Biologi',
      kelompok: 'lab',
      fakultas: 'FMIPA',
      alias: ['laboratorium biologi fmipa'],
      gedung: [{ kode: '010', lantai: 4 }, { kode: '011', lantai: 4 }],
      kodeTambahan: ['010/011?'],
      titik: [11],
      poligon: null,
    },
    {
      id: 'belajar-bersama',
      nama: 'Gedung Belajar Bersama',
      label: 'Belajar Bersama',
      kelompok: 'jurusan',
      fakultas: 'FMIPA',
      alias: ['gedung kuliah bersama fmipa', 'gedung belajar'],
      gedung: [{ kode: '012', lantai: 2 }],
      titik: [12],
      poligon: null,
    },
    {
      id: 'rumah-kaca',
      nama: 'Rumah Kaca',
      label: 'Rumah Kaca',
      kelompok: 'taman',
      fakultas: 'FMIPA',
      alias: ['greenhouse', 'green house fmipa', 'taman', 'fmipa'],
      gedung: [],
      titik: [18],
      poligon: null,
    },
    {
      id: 'rumah-hewan',
      nama: 'Rumah Hewan FMIPA',
      label: 'Rumah Hewan',
      kelompok: 'lainnya',
      fakultas: 'FMIPA',
      alias: ['kandang hewan', 'hewan uji biologi', 'animal house', 'fmipa'],
      gedung: [],
      titik: [15],
      poligon: null,
    },
    {
      id: 'taman-biologi',
      nama: 'Taman Biologi',
      label: 'Taman Biologi',
      kelompok: 'taman',
      fakultas: 'FMIPA',
      alias: ['taman fmipa', 'area hijau biologi', 'taman'],
      gedung: [],
      titik: [17],
      poligon: null,
    },
    {
      id: 'serbaguna-taman',
      nama: 'Ruang Serbaguna Taman Biologi',
      label: 'Serbaguna Taman',
      kelompok: 'taman',
      fakultas: 'FMIPA',
      alias: ['pendopo taman', 'gazebo biologi', 'ruang terbuka fmipa'],
      gedung: [],
      titik: [16],
      poligon: null,
    },
  ]

  const handledFids = new Set([2, 3, 4, 5, 6, 9, 10, 14, 57, 58])
  for (const f of rawLokasi.features) {
    const fid = f.properties.fid
    if (handledFids.has(fid)) continue

    const snap = snappingLaporan.find((s) => s.fid === fid)
    const { fakultas, kelompok } = klasifikasiFakultas(f.properties.nama_lokasi)
    const cleanName = formatNamaTempat(f.properties.nama_lokasi)
    const baseId = f.properties.nama_lokasi.toLowerCase().replace(/_/g, '-').replace(/[^a-z0-9-]/g, '')
    let placeId = baseId
    let counter = 1
    while (tempatList.some((t) => t.id === placeId)) {
      placeId = `${baseId}-${counter}`
      counter += 1
    }

    let label = cleanName.replace(/^(Gedung|Laboratorium|Lab\.|Workshop|Sanggar)\s+/i, '')
    if (label.length > 25) label = label.slice(0, 25)

    tempatList.push({
      id: placeId,
      fid,
      nama: cleanName,
      label,
      kelompok,
      fakultas,
      alias: [f.properties.nama_lokasi.replace(/_/g, ' '), cleanName.toLowerCase(), fakultas.toLowerCase()],
      gedung: [],
      titik: [snap.nodeId],
      poligon: null,
    })
  }

  // 9. Analisis Konektivitas Graf
  const adj = {}
  nodes.forEach((n) => {
    adj[n.id] = []
  })
  edges.forEach((e) => {
    adj[e.asal].push(e.tujuan)
    adj[e.tujuan].push(e.asal)
  })

  const visited = new Set()
  const components = []

  nodes.forEach((n) => {
    if (!visited.has(n.id) && adj[n.id].length > 0) {
      const compNodeIds = []
      const queue = [n.id]
      visited.add(n.id)

      while (queue.length > 0) {
        const curr = queue.shift()
        compNodeIds.push(curr)
        for (const neighbor of adj[curr]) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor)
            queue.push(neighbor)
          }
        }
      }
      components.push(compNodeIds)
    }
  })

  const isolatedNodes = nodes.filter((n) => adj[n.id].length === 0)
  const edgeIds = edges.map((e) => e.id)
  const isEdgeIdUnique = new Set(edgeIds).size === edgeIds.length

  return {
    nodes,
    edges,
    tempatList,
    components,
    isolatedNodes,
    isEdgeIdUnique,
    laporanSegmenDibuang,
    laporanTNoding,
    snappingLaporan,
  }
}

/**
 * Mencadangkan berkas aktif ke scripts/cadangan/
 */
function cadangkanBerkasLama() {
  if (!existsSync(DIR_CADANGAN)) {
    mkdirSync(DIR_CADANGAN, { recursive: true })
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

  const files = [
    { src: PATH_KOORDINAT_SRC, prefix: 'koordinat_fmipa' },
    { src: PATH_EDGES_SRC, prefix: 'edges_fmipa' },
    { src: PATH_POLIGON_SRC, prefix: 'gedung_fmipa' },
    { src: PATH_TEMPAT_SRC, prefix: 'tempat' },
  ]

  for (const item of files) {
    if (existsSync(item.src)) {
      const target = resolve(DIR_CADANGAN, `${item.prefix}_${timestamp}.json`)
      writeFileSync(target, readFileSync(item.src, 'utf8'), 'utf8')
      console.log(`[CADANGAN] Dicadangkan: ${target}`)
    }
  }
}

/**
 * Program Utama
 */
function main() {
  const isWriteMode = process.argv.includes('--tulis')

  console.log('='.repeat(70))
  console.log(' PEMBANGUN JARINGAN JALAN & LOKASI KAMPUS UNIMED (FASE 1)')
  console.log(` Mode: ${isWriteMode ? '*** MODE TULIS (--tulis AKTIF) ***' : 'MODE KERING (DRY-RUN)'}`)
  console.log('='.repeat(70))

  const { rawSurvei, rawLokasi } = muatDataMentah()
  const {
    nodes,
    edges,
    tempatList,
    components,
    isolatedNodes,
    isEdgeIdUnique,
    laporanSegmenDibuang,
    laporanTNoding,
    snappingLaporan,
  } = prosesJaringan(rawSurvei, rawLokasi)

  console.log('\n--- RINGKASAN TOPOLOGI ---')
  console.log(`• Total Garis Mentah   : ${rawSurvei.features.length}`)
  console.log(`• Segmen Nol Dibuang   : ${laporanSegmenDibuang.length} (termasuk fid: ${laporanSegmenDibuang.map((s) => s.fid).join(', ')})`)
  console.log(`• T-Junction Disambung : ${laporanTNoding.length}`)
  console.log(`• Total Simpul (Nodes) : ${nodes.length}`)
  console.log(`• Total Ruas (Edges)   : ${edges.length}`)
  console.log(`• Total Tempat/Gedung  : ${tempatList.length} (dari ${rawLokasi.features.length} titik lokasi survei)`)
  console.log(`• Keunikan ID Sisi     : ${isEdgeIdUnique ? 'VALID (semua ID unik)' : 'TIDAK UNIK'}`)

  console.log('\n--- ANALISIS KONEKTIVITAS GRAF ---')
  console.log(`• Jumlah Komponen Graf : ${components.length}`)
  components.forEach((c, idx) => {
    console.log(`  - Komponen #${idx + 1}: ${c.length} simpul`)
  })
  if (isolatedNodes.length > 0) {
    console.log(`• [PERINGATAN] Simpul Terisolasi (Derajat 0): ${isolatedNodes.length}`)
  } else {
    console.log('• Tidak ada simpul terisolasi (0 simpul terputus).')
  }

  // Evaluasi Validasi
  const validKomponen = components.length === 1
  const validIsolated = isolatedNodes.length === 0
  const validEdgeId = isEdgeIdUnique
  const validSemua = validKomponen && validIsolated && validEdgeId

  console.log('\n' + '='.repeat(70))
  console.log(' EVALUASI KRITERIA VALIDASI')
  console.log('='.repeat(70))
  console.log(`• Komponen graf == 1       : ${validKomponen ? 'LOLOS' : 'GAGAL'}`)
  console.log(`• Tidak ada simpul buntu 0 : ${validIsolated ? 'LOLOS' : 'GAGAL'}`)
  console.log(`• ID sisi unik             : ${validEdgeId ? 'LOLOS' : 'GAGAL'}`)
  console.log(`• KESIMPULAN STATUS        : ${validSemua ? 'VALID (SIAP DITULIS)' : 'DITOLAK'}`)
  console.log('='.repeat(70))

  if (!validSemua) {
    console.error('\n[GALAT] Validasi topologi gagal. Skrip menolak menulis perubahan.')
    process.exit(1)
  }

  if (isWriteMode) {
    console.log('\n[MENULIS] Menjalankan pencadangan dan penulisan berkas aktif...')
    cadangkanBerkasLama()

    // 1. koordinat_fmipa.geojson
    const koordinatGeoJson = {
      type: 'FeatureCollection',
      name: 'koordinat_fmipa',
      crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
      features: nodes.map((n) => ({
        type: 'Feature',
        properties: {
          id: n.id,
          X: n.coord[0],
          Y: n.coord[1],
        },
        geometry: {
          type: 'Point',
          coordinates: [n.coord[0], n.coord[1]],
        },
      })),
    }
    writeFileSync(PATH_KOORDINAT_SRC, JSON.stringify(koordinatGeoJson, null, 2), 'utf8')
    console.log(`[BERHASIL] Ditulis: ${PATH_KOORDINAT_SRC}`)

    // 2. edges_fmipa.geojson
    const edgesGeoJson = {
      type: 'FeatureCollection',
      name: 'edges_fmipa',
      crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
      features: edges.map((e) => ({
        type: 'Feature',
        properties: {
          id: e.id,
          asal: e.asal,
          tujuan: e.tujuan,
        },
        geometry: e.geometry,
      })),
    }
    writeFileSync(PATH_EDGES_SRC, JSON.stringify(edgesGeoJson, null, 2), 'utf8')
    console.log(`[BERHASIL] Ditulis: ${PATH_EDGES_SRC}`)

    // 3. gedung_fmipa.geojson (dikosongkan agar tidak error sesuai instruksi Fase 1)
    const poligonGeoJson = {
      type: 'FeatureCollection',
      name: 'gedung_fmipa',
      crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
      features: [],
    }
    writeFileSync(PATH_POLIGON_SRC, JSON.stringify(poligonGeoJson, null, 2), 'utf8')
    console.log(`[BERHASIL] Dikosongkan: ${PATH_POLIGON_SRC}`)

    // 4. tempat.json
    writeFileSync(PATH_TEMPAT_SRC, JSON.stringify(tempatList, null, 2), 'utf8')
    console.log(`[BERHASIL] Ditulis: ${PATH_TEMPAT_SRC}`)

    console.log('\nSeluruh data jaringan aktif kampus Unimed berhasil diperbarui!')
  } else {
    console.log('\n[MODE KERING SELESAI] Gunakan opsi --tulis untuk menerapkan perubahan ke src/data/.')
  }
}

export { muatDataMentah, prosesJaringan, main }

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
}
