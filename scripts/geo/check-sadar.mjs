/**
 * Is Kushtia Sadar a genuine gap in the five polygons, or do they overlap it?
 *
 * If the five fetched upazilas cover Sadar's real coordinate, then rendering
 * "district minus five" as Sadar would be wrong. If they do not, the remainder
 * is exactly Sadar and the evenodd approach is sound.
 */
import { readFileSync } from 'node:fs'

const bounds = JSON.parse(readFileSync('raw/overpass.json', 'utf8'))

const AREAS = [
  ['Kushtia Sadar', 23.9013, 89.1206],
  ['Kumarkhali', 23.8626, 89.2264],
  ['Bheramara', 24.0243, 88.9925],
  ['Mirpur', 23.95, 89.0167],
  ['Daulatpur', 24.0667, 88.9],
  ['Khoksa', 23.7833, 89.2667],
]

/** Ray casting in lon/lat space. */
function inRing(lon, lat, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

const feats = Object.entries(bounds).filter(([n]) => n !== 'Kushtia District')

console.log('Which fetched upazila polygon contains each real coordinate?\n')
for (const [name, lat, lon] of AREAS) {
  const hits = feats.filter(([, f]) => f.rings.some((r) => inRing(lon, lat, r))).map(([n]) => n)
  const inDistrict = bounds['Kushtia District'].rings.some((r) => inRing(lon, lat, r))
  console.log(
    `  ${name.padEnd(15)} district=${inDistrict ? 'yes' : 'NO '}  polygon=${hits.length ? hits.join(', ') : '(none — gap)'}`,
  )
}
