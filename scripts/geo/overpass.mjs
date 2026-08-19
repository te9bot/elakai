/**
 * Authoritative fetch: every admin_level=6 boundary (upazila) inside the
 * Kushtia district relation, plus the district itself and the Padma.
 *
 * Free-text search was not good enough — it missed Kushtia Sadar entirely and
 * matched a five-point building in Dhaka for "Mirpur". Querying by admin level
 * inside the district relation cannot make either mistake.
 *
 * Data © OpenStreetMap contributors, ODbL.
 */
import { writeFileSync, mkdirSync } from 'node:fs'

mkdirSync('raw', { recursive: true })
const UA = 'ELAKAI-map-build/1.0 (civic directory for Kushtia, Bangladesh)'

const QUERY = `
[out:json][timeout:180];
rel(9517082);
map_to_area->.kushtia;
(
  rel(area.kushtia)["boundary"="administrative"]["admin_level"="6"];
  rel(9517082);
);
out geom;
`

const res = await fetch('https://overpass-api.de/api/interpreter', {
  method: 'POST',
  headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: 'data=' + encodeURIComponent(QUERY),
})
if (!res.ok) {
  console.error('overpass HTTP', res.status, (await res.text()).slice(0, 300))
  process.exit(1)
}
const json = await res.json()
console.log('elements:', json.elements.length)

/** Chain relation member ways into closed rings. */
function ringsFrom(el) {
  const ways = (el.members ?? [])
    .filter((m) => m.type === 'way' && (m.role === 'outer' || m.role === '') && m.geometry)
    .map((m) => m.geometry.map((p) => [p.lon, p.lat]))
  const rings = []
  const pool = [...ways]
  const key = (p) => `${p[0].toFixed(7)},${p[1].toFixed(7)}`

  while (pool.length) {
    let ring = pool.shift()
    let progress = true
    while (progress && key(ring[0]) !== key(ring[ring.length - 1])) {
      progress = false
      for (let i = 0; i < pool.length; i++) {
        const w = pool[i]
        const end = key(ring[ring.length - 1])
        if (key(w[0]) === end) {
          ring = ring.concat(w.slice(1))
          pool.splice(i, 1)
          progress = true
          break
        }
        if (key(w[w.length - 1]) === end) {
          ring = ring.concat(w.slice(0, -1).reverse())
          pool.splice(i, 1)
          progress = true
          break
        }
      }
    }
    if (ring.length > 3) rings.push(ring)
  }
  // Largest ring first — that is the outline, the rest are islands/enclaves.
  return rings.sort((a, b) => b.length - a.length)
}

const out = {}
for (const el of json.elements) {
  if (el.type !== 'relation') continue
  const tags = el.tags ?? {}
  const name = tags['name:en'] ?? tags.name ?? String(el.id)
  const rings = ringsFrom(el)
  if (!rings.length) {
    console.log(`  ${name}: no closed ring`)
    continue
  }
  out[name] = {
    osm: `relation/${el.id}`,
    adminLevel: tags.admin_level,
    nameBn: tags['name:bn'] ?? null,
    rings,
  }
  console.log(
    `  ${String(name).padEnd(18)} level=${tags.admin_level}  rings=${rings.length}  pts=${rings.reduce((s, r) => s + r.length, 0)}`,
  )
}

writeFileSync('raw/overpass.json', JSON.stringify(out, null, 1))
console.log('\nwrote raw/overpass.json —', Object.keys(out).length, 'features')
