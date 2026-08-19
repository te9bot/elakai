/**
 * Real coordinates for the minor settlements the map labels.
 *
 * These ten were previously placed by interpolating between two upazila
 * coordinates and nudging by an arbitrary offset — real names at invented
 * positions. That was survivable while everything around them was also
 * invented. Against a real road network it puts real towns in the wrong place.
 *
 * Data © OpenStreetMap contributors, ODbL.
 */
import { writeFileSync, readFileSync } from 'node:fs'

const UA = 'ELAKAI-map-build/1.0 (civic directory for Kushtia, Bangladesh)'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const TOWNS = [
  ['Allardarga', 'আল্লারদর্গা'],
  ['Hatash Haripur', 'হাটাশ হরিপুর'],
  ['Amla', 'আমলা'],
  ['Poradaha', 'পোড়াদহ'],
  ['Jagati', 'জগতি'],
  ['Janipur', 'জানিপুর'],
  ['Bittipara', 'বিত্তিপাড়া'],
  ['Shilaidaha', 'শিলাইদহ'],
  ['Piaripur', 'পিয়ারীপুর'],
  ['Chithulia', 'চিথুলিয়া'],
]

// The district window, so a same-named place elsewhere in Bangladesh cannot win.
const VIEWBOX = '88.75,24.25,89.45,23.65'

const found = []
for (const [en, bn] of TOWNS) {
  const url =
    'https://nominatim.openstreetmap.org/search?' +
    new URLSearchParams({
      q: `${en}, Kushtia, Bangladesh`,
      format: 'jsonv2',
      limit: '5',
      viewbox: VIEWBOX,
      bounded: '1',
    })
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en' } })
  const json = res.ok ? await res.json() : []
  const hit = json.find((h) => /place|boundary|village|town|suburb/i.test(h.category ?? '')) ?? json[0]
  if (hit) {
    found.push({ en, bn, lat: Number(hit.lat), lon: Number(hit.lon), osm: `${hit.osm_type}/${hit.osm_id}` })
    console.log(`  ${en.padEnd(16)} ${Number(hit.lat).toFixed(4)}, ${Number(hit.lon).toFixed(4)}  (${hit.category}/${hit.type})`)
  } else {
    console.log(`  ${en.padEnd(16)} NOT FOUND — will be dropped`)
  }
  await sleep(1200)
}

writeFileSync('raw/settlements.json', JSON.stringify(found, null, 1))
console.log(`\n${found.length}/${TOWNS.length} located; wrote raw/settlements.json`)
