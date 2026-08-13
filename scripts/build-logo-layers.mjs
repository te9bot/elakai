/**
 * Turns the brand artwork into the depth planes the intro animates.
 *
 *   node scripts/build-logo-layers.mjs
 *
 * Source: assets/logo parallax  animation.png — a flat, 156x139, no-alpha
 * export of the pin mark. It is the single source of truth for shape and
 * colour here; nothing in this file draws anything, it only *reads* what is
 * already in those pixels and re-expresses it as vector layers:
 *
 *   pin       the blue teardrop, ring and tail       (largest blue component)
 *   road      the white lane winding through its base
 *   house     the green house                        (green component)
 *   tower     the blue windowed building             (second blue component)
 *   shop      the orange awninged shop               (orange component)
 *
 * The two blue elements separate cleanly because the artwork leaves a
 * two-pixel white gutter under the tower, so they are genuinely disconnected
 * regions rather than something this script has to guess at.
 *
 * Writes src/components/brand/logo-mark.generated.ts. Regenerate rather than
 * hand-editing that file.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { decodePng } from './lib/png.mjs'
import { traceField } from './lib/trace.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = resolve(root, 'assets/logo parallax  animation.png')
const OUTPUT = resolve(root, 'src/components/brand/logo-mark.generated.ts')

/* ------------------------------------------------------------------ */
/* Colour classes                                                      */
/* ------------------------------------------------------------------ */

/**
 * Hue windows, not fixed colours: the export is lossy, so every element
 * spreads over a few hundred RGB values. Hue survives that spread; exact
 * channel values do not.
 */
const CLASSES = {
  blue: { min: 195, max: 250 },
  green: { min: 100, max: 178 },
  orange: { min: 18, max: 62 },
}

function hsv(r, g, b) {
  const mx = Math.max(r, g, b)
  const mn = Math.min(r, g, b)
  const d = mx - mn
  let h = 0
  if (d) {
    if (mx === r) h = ((g - b) / d + 6) % 6
    else if (mx === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
  }
  return [h, mx ? d / mx : 0, mx]
}

/**
 * Which element a pixel belongs to, ignoring how much of it there is.
 *
 * The saturation and value floors exist to reject the clipped top edge of the
 * wordmark that sits in the last row of the source: it is a dark navy, which
 * lands inside the blue hue window but nowhere near the pin's chroma.
 */
function classOf(r, g, b) {
  const [h, s, v] = hsv(r, g, b)
  if (s < 0.28 || v < 120) return null
  for (const [name, range] of Object.entries(CLASSES)) {
    if (h >= range.min && h < range.max) return name
  }
  return null
}

/** How much ink is on the pixel, 0 on the white ground, 1 at full strength. */
const ink = (r, g, b) => 255 - Math.min(r, g, b)

/* ------------------------------------------------------------------ */
/* Connected components                                                */
/* ------------------------------------------------------------------ */

/** 4-connected labelling over a binary mask. Returns labels and their sizes. */
function label(mask, w, h) {
  const labels = new Int32Array(w * h).fill(-1)
  const sizes = []
  const stack = []

  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || labels[start] !== -1) continue

    const id = sizes.length
    let size = 0
    stack.push(start)
    labels[start] = id

    while (stack.length) {
      const at = stack.pop()
      size++
      const x = at % w
      const y = (at / w) | 0

      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
        const next = ny * w + nx
        if (mask[next] && labels[next] === -1) {
          labels[next] = id
          stack.push(next)
        }
      }
    }

    sizes.push(size)
  }

  return { labels, sizes }
}

/** Component ids ordered largest first. */
function bySize(sizes) {
  return sizes.map((size, id) => ({ id, size })).sort((a, b) => b.size - a.size)
}

function dilate(mask, w, h, radius) {
  const out = new Uint8Array(mask.length)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx >= 0 && ny >= 0 && nx < w && ny < h) out[ny * w + nx] = 1
        }
      }
    }
  }
  return out
}

/* ------------------------------------------------------------------ */
/* Read the artwork                                                    */
/* ------------------------------------------------------------------ */

const { width: W, height: H, data } = decodePng(readFileSync(SOURCE))

const klass = new Array(W * H).fill(null)
const alpha = new Float32Array(W * H)
const strongest = { blue: 0, green: 0, orange: 0 }
const swatch = {}

for (let i = 0; i < W * H; i++) {
  const r = data[i * 4]
  const g = data[i * 4 + 1]
  const b = data[i * 4 + 2]
  const name = classOf(r, g, b)
  if (!name) continue

  klass[i] = name
  alpha[i] = ink(r, g, b)

  // The most saturated pixel of each element is the one least diluted by the
  // white ground, so it is the closest thing to the designer's own colour.
  const [, s] = hsv(r, g, b)
  if (s > strongest[name]) {
    strongest[name] = s
    swatch[name] = [r, g, b]
  }
}

// Normalise ink against each element's own full strength so the 0.5 contour
// sits on the true half-covered edge for dark blue and pale orange alike.
const full = {}
for (const name of Object.keys(CLASSES)) full[name] = ink(...swatch[name])

const coverage = {}
for (const name of Object.keys(CLASSES)) {
  const field = new Float32Array(W * H)
  for (let i = 0; i < W * H; i++) {
    if (klass[i] === name) field[i] = Math.min(1, alpha[i] / full[name])
  }
  coverage[name] = field
}

const binary = {}
for (const name of Object.keys(CLASSES)) {
  binary[name] = Uint8Array.from(coverage[name], (v) => (v >= 0.5 ? 1 : 0))
}

/* ------------------------------------------------------------------ */
/* Split the two blue elements                                         */
/* ------------------------------------------------------------------ */

const blueParts = label(binary.blue, W, H)
const ranked = bySize(blueParts.sizes).filter((c) => c.size > 40)
if (ranked.length < 2) throw new Error('expected a pin and a tower in the blue channel')

const PIN = ranked[0].id
const TOWER = ranked[1].id

const pinMask = Uint8Array.from(blueParts.labels, (id) => (id === PIN ? 1 : 0))
const towerMask = Uint8Array.from(blueParts.labels, (id) => (id === TOWER ? 1 : 0))

/* ------------------------------------------------------------------ */
/* Lift the road out of the pin                                        */
/* ------------------------------------------------------------------ */

/**
 * The road is not drawn in the artwork — it is the white the pin leaves
 * behind, the lane that splits the base from the wedge on its right. It is
 * also not a sealed pocket: it opens out at the bottom, between the tail and
 * the point of the wedge, so flood-filling for an enclosed hole finds nothing.
 *
 * What does bound it on every row is the pin itself. Below the ground line —
 * the first row where the pin stops being two thin arcs and becomes a solid
 * base — the road is exactly the white lying between that row's leftmost and
 * rightmost blue. The lane closes itself off naturally on the row where the
 * wedge runs out and only one run of blue is left.
 */
function longestRun(mask, y) {
  let best = 0
  let run = 0
  for (let x = 0; x < W; x++) {
    run = mask[y * W + x] ? run + 1 : 0
    if (run > best) best = run
  }
  return best
}

// The ring's arcs are ~12px of blue per row; the base is 40+. Scanning from
// the vertical middle down avoids matching the ring's own solid crown.
let groundRow = -1
for (let y = (H / 2) | 0; y < H; y++) {
  if (longestRun(pinMask, y) > 30) {
    groundRow = y
    break
  }
}
if (groundRow < 0) throw new Error('could not find the pin base')

const roadMask = new Uint8Array(W * H)
for (let y = groundRow; y < H; y++) {
  let left = -1
  let right = -1
  for (let x = 0; x < W; x++) {
    if (!pinMask[y * W + x]) continue
    if (left < 0) left = x
    right = x
  }
  if (left < 0) continue
  for (let x = left; x <= right; x++) {
    if (!pinMask[y * W + x]) roadMask[y * W + x] = 1
  }
}

/**
 * Extrude the road's mouth up into the ring's interior. That stretch is white
 * on white, so it changes nothing when the layers sit together — but once the
 * road drifts on its own plane it is what stops the pin's base showing through
 * as a blue bar across the top of the lane.
 */
const MOUTH_RISE = 14
for (let x = 0; x < W; x++) {
  if (!roadMask[groundRow * W + x]) continue
  for (let y = Math.max(0, groundRow - MOUTH_RISE); y < groundRow; y++) {
    roadMask[y * W + x] = 1
  }
}

/* ------------------------------------------------------------------ */
/* Fields to trace                                                     */
/* ------------------------------------------------------------------ */

/** Restrict a coverage field to one region without cutting it at its own edge. */
function restrict(field, mask) {
  const region = dilate(mask, W, H, 2)
  const out = new Float32Array(W * H)
  for (let i = 0; i < W * H; i++) if (region[i]) out[i] = field[i]
  return out
}

/** The pin, with the road filled back in so the lane can be drawn over it. */
const pinField = (() => {
  const out = restrict(coverage.blue, pinMask)
  for (let i = 0; i < W * H; i++) if (roadMask[i]) out[i] = 1
  return out
})()

/**
 * The road is the *absence* of pin, so its field is the complement. Sharing
 * one boundary with the pin this way means the two edges land on exactly the
 * same curve and the lane sits seamlessly in its bed.
 */
const roadField = (() => {
  const region = dilate(roadMask, W, H, 2)
  const out = new Float32Array(W * H)
  for (let i = 0; i < W * H; i++) {
    if (!region[i]) continue
    out[i] = roadMask[i] ? Math.max(1 - coverage.blue[i], 0.75) : 1 - coverage.blue[i]
  }
  return out
})()

/** Pad so every contour closes inside the grid. */
function pad(field, margin) {
  const w = W + margin * 2
  const h = H + margin * 2
  const out = new Float32Array(w * h)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) out[(y + margin) * w + x + margin] = field[y * W + x]
  }
  return { field: out, w, h, margin }
}

const LAYERS = [
  { name: 'pin', field: pinField, colour: swatch.blue },
  { name: 'road', field: roadField, colour: null },
  { name: 'house', field: restrict(coverage.green, binary.green), colour: swatch.green },
  { name: 'tower', field: restrict(coverage.blue, towerMask), colour: swatch.blue },
  { name: 'shop', field: restrict(coverage.orange, binary.orange), colour: swatch.orange },
]

/* ------------------------------------------------------------------ */
/* Trace and emit                                                      */
/* ------------------------------------------------------------------ */

const MARGIN = 2
const traced = LAYERS.map(({ name, field, colour }) => {
  const padded = pad(field, MARGIN)
  const d = traceField(padded.field, padded.w, padded.h, { threshold: 0.5 })
  if (!d) throw new Error(`layer "${name}" traced to nothing`)
  return { name, d, colour }
})

/**
 * Bounds of the mark, so the viewBox holds its own proportions rather than the
 * source file's incidental margins.
 *
 * Measured over control points as well as on-curve points: the hull of a
 * cubic's control polygon always contains the curve, so this can never clip an
 * arc that bulges past its endpoints — which the pin, being mostly arcs, does
 * on all four sides.
 */
function bounds(paths) {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity

  for (const { d } of paths) {
    const numbers = d.match(/-?[\d.]+/g) ?? []
    for (let i = 0; i + 1 < numbers.length; i += 2) {
      const px = Number(numbers[i])
      const py = Number(numbers[i + 1])
      if (px < x0) x0 = px
      if (px > x1) x1 = px
      if (py < y0) y0 = py
      if (py > y1) y1 = py
    }
  }

  return { x0, y0, x1, y1 }
}

// The road's extruded mouth is scaffolding, not artwork — it must not widen
// the box the mark is centred in.
const box = bounds(traced.filter((l) => l.name !== 'road'))
const hex = ([r, g, b]) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`

// Tight. The traced coordinates already sit in the padded grid's space, and
// that offset is common to every layer, so there is nothing to subtract here —
// doing so would slide the box off the artwork it is meant to frame.
const viewBox = [
  Number(box.x0.toFixed(2)),
  Number(box.y0.toFixed(2)),
  Number((box.x1 - box.x0).toFixed(2)),
  Number((box.y1 - box.y0).toFixed(2)),
]

const body = `// Generated by scripts/build-logo-layers.mjs — do not edit by hand.
//
// Traced from assets/logo parallax  animation.png. Every path and colour below
// is measured out of that file; run the script again if the artwork changes.
//
// Ordered back to front. Fill each path with fill-rule="evenodd" — the window
// frames, the door and the ring's interior are all holes, not separate shapes.

export type LogoLayerName = ${traced.map((l) => `'${l.name}'`).join(' | ')}

export type LogoLayer = {
  name: LogoLayerName
  /** Path data in the coordinate space of \`LOGO_VIEW_BOX\`. */
  d: string
  /** Sampled from the artwork; \`null\` means "paint this in the page ground". */
  fill: string | null
}

export const LOGO_VIEW_BOX = '${viewBox.join(' ')}'

/** Centre of the mark in view-box units, for transform-origin maths. */
export const LOGO_CENTRE = {
  x: ${(viewBox[0] + viewBox[2] / 2).toFixed(2)},
  y: ${(viewBox[1] + viewBox[3] / 2).toFixed(2)},
}

export const LOGO_LAYERS: readonly LogoLayer[] = [
${traced
  .map(
    (l) =>
      `  {\n    name: '${l.name}',\n    fill: ${l.colour ? `'${hex(l.colour)}'` : 'null'},\n    d: '${l.d}',\n  },`,
  )
  .join('\n')}
]
`

mkdirSync(dirname(OUTPUT), { recursive: true })
writeFileSync(OUTPUT, body)

/* ------------------------------------------------------------------ */

console.log(`source      ${W}x${H}`)
console.log(`ground row  ${groundRow}`)
console.log(`view box    ${viewBox.join(' ')}`)
console.log('')
for (const { name, d, colour } of traced) {
  const subpaths = d.split('M').length - 1
  console.log(
    `${name.padEnd(6)} ${colour ? hex(colour) : 'page ground'.padEnd(7)}  ` +
      `${String(subpaths).padStart(2)} subpath(s)  ${String(d.length).padStart(5)} chars`,
  )
}
console.log(`\nwrote ${OUTPUT}`)
