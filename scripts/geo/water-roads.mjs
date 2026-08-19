/**
 * Real rivers and major roads for the Kushtia district window.
 * Data © OpenStreetMap contributors, ODbL.
 */
import { writeFileSync } from 'node:fs'

const UA = 'ELAKAI-map-build/1.0 (civic directory for Kushtia, Bangladesh)'
const BBOX = '23.70,88.80,24.20,89.40'

const Q = `
[out:json][timeout:240];
(
  way["waterway"="river"](${BBOX});
  way["natural"="water"]["water"="river"](${BBOX});
  way["highway"~"^(trunk|primary)$"](${BBOX});
);
out geom;
`

const res = await fetch('https://overpass-api.de/api/interpreter', {
  method: 'POST',
  headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: 'data=' + encodeURIComponent(Q),
})
if (!res.ok) {
  console.error('HTTP', res.status, (await res.text()).slice(0, 200))
  process.exit(1)
}
const json = await res.json()

const rivers = []
const roads = []
const riverNames = new Map()

for (const el of json.elements) {
  if (el.type !== 'way' || !el.geometry) continue
  const t = el.tags ?? {}
  const line = el.geometry.map((p) => [p.lon, p.lat])
  if (line.length < 2) continue
  const name = t['name:en'] ?? t.name ?? null

  if (t.waterway === 'river' || t.water === 'river') {
    rivers.push({ name, line })
    if (name) riverNames.set(name, (riverNames.get(name) ?? 0) + 1)
  } else if (t.highway) {
    roads.push({ name, cls: t.highway, line })
  }
}

console.log(`rivers: ${rivers.length} ways, ${rivers.reduce((s, r) => s + r.line.length, 0)} pts`)
console.log('  named:', [...riverNames.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8))
console.log(`roads:  ${roads.length} ways, ${roads.reduce((s, r) => s + r.line.length, 0)} pts`)
const byCls = {}
for (const r of roads) byCls[r.cls] = (byCls[r.cls] ?? 0) + 1
console.log('  by class:', byCls)

writeFileSync('raw/water-roads.json', JSON.stringify({ rivers, roads }))
console.log('wrote raw/water-roads.json')
