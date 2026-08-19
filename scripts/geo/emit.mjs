/**
 * Emit the verified geometry as a TypeScript module for the app.
 *
 * WHAT IS IN AND WHAT IS OUT, AND WHY
 *
 * In: the district boundary, the Padma and its tributaries, and the trunk and
 * primary road network. All fetched from OpenStreetMap, all checked.
 *
 * Out: upazila boundary fills. OSM has no admin_level=6 relation for Kushtia
 * Sadar at all, and the relation it labels "Mirpur" (relation/17674651)
 * contains the real Kushtia Sadar coordinate as well as the real Mirpur one —
 * verified by ray-casting both points against every fetched polygon. So two of
 * the six boundaries are not available and a third is not trustworthy. Drawing
 * five polygons and calling them the six upazilas would be exactly the
 * invented geography the brief rules out.
 *
 * The six upazilas are still present, as their real AREA_MAP coordinates,
 * which is what the focus light already travels between.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const m = JSON.parse(readFileSync('merged.json', 'utf8'))
const areas = JSON.parse(readFileSync('areas.json', 'utf8'))

const ts = `/* eslint-disable */
/**
 * Real Kushtia district geography, projected and simplified at build time.
 *
 * GENERATED FILE — do not hand-edit. Rebuilt by scripts/geo (see repo notes).
 *
 * SOURCE AND LICENCE
 *
 * Geometry © OpenStreetMap contributors, available under the Open Database
 * Licence (ODbL). https://www.openstreetmap.org/copyright
 * The attribution is rendered by the map component and must stay visible.
 *
 * HOW IT WAS MADE
 *
 *   1. District boundary: OSM relation/9517082, admin_level=5.
 *   2. Rivers: waterway=river within the district window, keeping the named
 *      systems that read at this scale — Padma, Gorai-Madhumati, Kumar Nod,
 *      Ichhamoti, Mathavanga.
 *   3. Roads: highway=trunk and highway=primary only. Geographic context, not
 *      navigation, so nothing smaller is fetched.
 *   4. Projected equirectangular with a cos(lat) correction at the district's
 *      centre latitude, so the shape is not stretched ~9% horizontally the way
 *      a raw lon/lat plot would be.
 *   5. Simplified with Douglas-Peucker, then every way of a class concatenated
 *      into a single path. 12,476 source points became 1873 points, and 252 OSM
 *      ways became 4 path elements.
 *
 * WHAT IS DELIBERATELY ABSENT
 *
 * Upazila boundary polygons. OSM has no admin_level=6 relation for Kushtia
 * Sadar, and the relation tagged "Mirpur" (relation/17674651) encloses the
 * real Kushtia Sadar coordinate as well as Mirpur's own — checked by ray
 * casting both points against every candidate polygon. Two of the six
 * boundaries are therefore unavailable and a third is unreliable, so none are
 * drawn. The six upazilas appear as their real coordinates instead.
 */

export const KUSHTIA_VIEW = { w: ${m.view.w}, h: ${m.view.h} } as const

/** The district outline. OSM relation/9517082. */
export const KUSHTIA_DISTRICT = '${m.district}'

/** The Padma, along the district's northern edge. */
export const KUSHTIA_PADMA = '${m.padma}'

/** Gorai-Madhumati, Kumar Nod, Ichhamoti, Mathavanga. */
export const KUSHTIA_TRIBUTARIES = '${m.tributaries}'

/** highway=trunk. */
export const KUSHTIA_TRUNK_ROADS = '${m.trunk}'

/** highway=primary. */
export const KUSHTIA_PRIMARY_ROADS = '${m.primary}'

/**
 * The six upazila centres, projected into the same view box.
 *
 * These are the same coordinates \`data/categories.ts\` uses for the area filter
 * and the distance sort, so a marker and a distance can never disagree.
 */
export const KUSHTIA_PLACES = [
${areas.map((a) => `  { id: '${a.en.toLowerCase().replace(/\s+/g, '-')}', en: '${a.en}', x: ${a.x.toFixed(1)}, y: ${a.y.toFixed(1)} },`).join('\n')}
] as const

export const KUSHTIA_ATTRIBUTION = '© OpenStreetMap contributors'
`

writeFileSync('kushtia-geo.generated.ts', ts)
console.log('wrote kushtia-geo.generated.ts', (ts.length / 1024).toFixed(1) + 'kb')
