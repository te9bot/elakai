/**
 * Turn the raw OSM geometry into a small, projected, ready-to-render module.
 *
 * Three jobs: project, simplify, emit.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const bounds = JSON.parse(readFileSync('raw/overpass.json', 'utf8'))
const { rivers, roads } = JSON.parse(readFileSync('raw/water-roads.json', 'utf8'))

/* -- 1. Projection ---------------------------------------------------- */
/*
 * Equirectangular with a cos(lat) correction.
 *
 * The map this replaces projected longitude and latitude straight onto x and y
 * with no correction, which stretches the district horizontally by 1/cos(24°)
 * — about 9%. That was invisible while the artwork was illustrative. With real
 * boundaries it would be a real error, so the correction goes in.
 */
const DISTRICT = bounds['Kushtia District']
if (!DISTRICT) throw new Error('district missing')

const allPts = DISTRICT.rings.flat()
const lons = allPts.map((p) => p[0])
const lats = allPts.map((p) => p[1])
const west = Math.min(...lons)
const east = Math.max(...lons)
const south = Math.min(...lats)
const north = Math.max(...lats)
const lat0 = (north + south) / 2
const kx = Math.cos((lat0 * Math.PI) / 180)

// Pad so the district does not touch the frame.
const PAD = 0.04
const w = (east - west) * kx
const h = north - south
const spanX = w * (1 + PAD * 2)
const spanY = h * (1 + PAD * 2)

// Fit into a viewBox whose aspect matches the district's true aspect, so
// nothing is squashed to fill a chosen rectangle.
const VIEW_W = 1000
const VIEW_H = Math.round((VIEW_W * spanY) / spanX)
const cx = (west + east) / 2
const cy = (north + south) / 2

const project = ([lon, lat]) => [
  ((lon - cx) * kx) / spanX * VIEW_W + VIEW_W / 2,
  -((lat - cy) / spanY) * VIEW_H + VIEW_H / 2,
]

/* -- 2. Simplification ------------------------------------------------ */
function perpDist(p, a, b) {
  const [x, y] = p
  const [x1, y1] = a
  const [x2, y2] = b
  const dx = x2 - x1
  const dy = y2 - y1
  if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1)
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy))
}

function simplify(points, tol) {
  if (points.length < 3) return points
  let maxD = 0
  let idx = 0
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpDist(points[i], points[0], points[points.length - 1])
    if (d > maxD) {
      maxD = d
      idx = i
    }
  }
  if (maxD <= tol) return [points[0], points[points.length - 1]]
  return [
    ...simplify(points.slice(0, idx + 1), tol).slice(0, -1),
    ...simplify(points.slice(idx), tol),
  ]
}

const r2 = (n) => Math.round(n * 10) / 10
const toPath = (pts, close) =>
  pts.map((p, i) => `${i ? 'L' : 'M'}${r2(p[0])} ${r2(p[1])}`).join('') + (close ? 'Z' : '')

/* -- 3. Build features ------------------------------------------------ */
const UPAZILA_ID = {
  'Kushtia District': 'district',
  'Khoksa Upazila': 'khoksa',
  'Bheramara Upazila': 'bheramara',
  'Daulatpur Upazila (Kushtia)': 'daulatpur',
  'Kumarkhali Upazila': 'kumarkhali',
  Mirpur: 'mirpur',
}

const out = { upazilas: [], district: null, rivers: [], roads: [] }
let totalPts = 0

for (const [name, feat] of Object.entries(bounds)) {
  const id = UPAZILA_ID[name]
  if (!id) continue
  const tol = id === 'district' ? 1.1 : 1.3
  const rings = feat.rings
    .map((r) => simplify(r.map(project), tol))
    .filter((r) => r.length > 3)
  const d = rings.map((r) => toPath(r, true)).join('')
  const pts = rings.reduce((s, r) => s + r.length, 0)
  totalPts += pts
  const rec = { id, name, osm: feat.osm, nameBn: feat.nameBn, d, points: pts }
  if (id === 'district') out.district = rec
  else out.upazilas.push(rec)
}

// Rivers: keep the named ones that actually read at this scale.
const KEEP_RIVERS = /padma|gorai|madhumati|kumar|ichhamoti|mathavanga|kali/i
for (const r of rivers) {
  if (!r.name || !KEEP_RIVERS.test(r.name)) continue
  const line = simplify(r.line.map(project), 1.0)
  if (line.length < 2) continue
  totalPts += line.length
  out.rivers.push({ name: r.name, d: toPath(line, false), points: line.length })
}

// Roads: trunk and primary only, simplified hard. Context, not navigation.
for (const r of roads) {
  const line = simplify(r.line.map(project), 0.8)
  if (line.length < 2) continue
  totalPts += line.length
  out.roads.push({ cls: r.cls, d: toPath(line, false), points: line.length })
}


/* -- 5. Merge into few paths ------------------------------------------ */
/*
 * One <path> per class rather than one per OSM way.
 *
 * The roads came back as 237 separate ways and the rivers as 15. Rendered
 * literally that is 252 path elements for decoration that never changes, and
 * the point of this map is that it must not become the next mobile
 * performance problem. SVG path data concatenates: several `M…L…` subpaths in
 * one `d` draw exactly the same picture as several elements, and the browser
 * treats it as one thing to style, promote and paint.
 */
const merged = {
  district: out.district.d,
  upazilas: out.upazilas.map((u) => ({ id: u.id, name: u.name, nameBn: u.nameBn, osm: u.osm, d: u.d })),
  padma: out.rivers.filter((r) => /padma/i.test(r.name)).map((r) => r.d).join(''),
  tributaries: out.rivers.filter((r) => !/padma/i.test(r.name)).map((r) => r.d).join(''),
  trunk: out.roads.filter((r) => r.cls === 'trunk').map((r) => r.d).join(''),
  primary: out.roads.filter((r) => r.cls === 'primary').map((r) => r.d).join(''),
}
const kb = (s) => (s.length / 1024).toFixed(1) + 'kb'
console.log('\n--- merged paths ---')
console.log('  district    ', kb(merged.district))
console.log('  upazilas    ', merged.upazilas.length, 'paths,', kb(merged.upazilas.map((u) => u.d).join('')))
console.log('  padma       ', kb(merged.padma))
console.log('  tributaries ', kb(merged.tributaries))
console.log('  trunk       ', kb(merged.trunk))
console.log('  primary     ', kb(merged.primary))
const totalKb =
  merged.district.length + merged.upazilas.map((u) => u.d).join('').length + merged.padma.length +
  merged.tributaries.length + merged.trunk.length + merged.primary.length
console.log('  TOTAL        ' + (totalKb / 1024).toFixed(1) + 'kb of path data, 11 path elements')
writeFileSync('merged.json', JSON.stringify({ view: { w: VIEW_W, h: VIEW_H }, ...merged }, null, 1))
