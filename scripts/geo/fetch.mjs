/**
 * Fetch real Kushtia geography from OpenStreetMap via Nominatim.
 *
 * Data © OpenStreetMap contributors, ODbL. Attribution is required and is
 * carried into the generated module.
 *
 * Nominatim usage policy: max 1 request/second, identifying User-Agent.
 */
import { writeFileSync, mkdirSync } from 'node:fs'

mkdirSync('raw', { recursive: true })

const UA = 'ELAKAI-map-build/1.0 (civic directory for Kushtia, Bangladesh)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const TARGETS = [
  ['district', 'Kushtia District, Bangladesh'],
  ['kushtia-sadar', 'Kushtia Sadar Upazila, Kushtia, Bangladesh'],
  ['kumarkhali', 'Kumarkhali Upazila, Kushtia, Bangladesh'],
  ['khoksa', 'Khoksa Upazila, Kushtia, Bangladesh'],
  ['mirpur', 'Mirpur Upazila, Kushtia, Bangladesh'],
  ['bheramara', 'Bheramara Upazila, Kushtia, Bangladesh'],
  ['daulatpur', 'Daulatpur Upazila, Kushtia, Bangladesh'],
]

const out = {}
for (const [id, query] of TARGETS) {
  const url =
    'https://nominatim.openstreetmap.org/search?' +
    new URLSearchParams({
      q: query,
      format: 'jsonv2',
      polygon_geojson: '1',
      limit: '3',
      addressdetails: '1',
    })
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en' } })
  if (!res.ok) {
    console.log(`${id}: HTTP ${res.status}`)
    await sleep(1200)
    continue
  }
  const json = await res.json()
  // Prefer an actual administrative boundary over a point or a road.
  const hit =
    json.find(
      (h) =>
        h.geojson &&
        /Polygon/i.test(h.geojson.type) &&
        (h.type === 'administrative' || h.category === 'boundary'),
    ) ?? json.find((h) => h.geojson && /Polygon/i.test(h.geojson.type))

  if (!hit) {
    console.log(`${id}: no polygon found (${json.length} results: ${json.map((h) => h.type).join(',')})`)
    await sleep(1200)
    continue
  }
  out[id] = {
    name: hit.display_name,
    osm: `${hit.osm_type}/${hit.osm_id}`,
    type: hit.geojson.type,
    geojson: hit.geojson,
  }
  const rings = hit.geojson.type === 'Polygon' ? hit.geojson.coordinates : hit.geojson.coordinates.flat()
  const pts = rings.reduce((s, r) => s + r.length, 0)
  console.log(`${id}: ${hit.geojson.type}, ${rings.length} ring(s), ${pts} points — ${hit.osm_type}/${hit.osm_id}`)
  await sleep(1200)
}

writeFileSync('raw/boundaries.json', JSON.stringify(out, null, 1))
console.log('\nwrote raw/boundaries.json with', Object.keys(out).length, 'features')
