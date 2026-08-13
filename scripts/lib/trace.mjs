/**
 * Raster -> vector, for turning the brand PNG into animatable layers.
 *
 * The pipeline is: marching squares over a *continuous* coverage field (so the
 * contour lands on the artwork's own antialiased edge, at sub-pixel accuracy,
 * rather than on the pixel lattice) -> Douglas-Peucker -> a corner-aware cubic
 * fit. The corner test is what keeps the buildings rectilinear while the pin's
 * arcs stay round; fitting everything as smooth curves rounds off the window
 * frames, and fitting everything as polylines facets the circle.
 */

/* ------------------------------------------------------------------ */
/* Marching squares                                                    */
/* ------------------------------------------------------------------ */

/**
 * Directed edge pairs per corner mask. Corners are 0=(i,j) 1=(i+1,j)
 * 2=(i+1,j+1) 3=(i,j+1); edges are A=top B=right C=bottom D=left. Directions
 * are chosen so the filled side stays on one consistent side of every segment,
 * which is what lets the segments chain into closed loops.
 */
const CASES = {
  1: [['D', 'A']],
  2: [['A', 'B']],
  3: [['D', 'B']],
  4: [['B', 'C']],
  6: [['A', 'C']],
  7: [['D', 'C']],
  8: [['C', 'D']],
  9: [['C', 'A']],
  11: [['C', 'B']],
  12: [['B', 'D']],
  13: [['B', 'A']],
  14: [['A', 'D']],
}

/** Interpolated crossing on a cell edge, keyed off the edge's lower index so
 *  both cells sharing it produce bit-identical coordinates. */
function crossing(edge, i, j, f0, f1, f2, f3, t) {
  const lerp = (a, b) => (t - a) / (b - a)
  switch (edge) {
    case 'A':
      return [i + lerp(f0, f1), j]
    case 'B':
      return [i + 1, j + lerp(f1, f2)]
    case 'C':
      return [i + lerp(f3, f2), j + 1]
    case 'D':
      return [i, j + lerp(f0, f3)]
  }
}

const key = (p) => `${Math.round(p[0] * 1e6)},${Math.round(p[1] * 1e6)}`

/**
 * Iso-contours of `field` at `t`. The field must be zero along its border, so
 * every contour closes; callers pad for this.
 *
 * @returns {number[][][]} closed rings, each an array of [x, y]
 */
export function isoContours(field, w, h, t) {
  const at = (x, y) => field[y * w + x]
  const segments = []

  for (let j = 0; j < h - 1; j++) {
    for (let i = 0; i < w - 1; i++) {
      const f0 = at(i, j)
      const f1 = at(i + 1, j)
      const f2 = at(i + 1, j + 1)
      const f3 = at(i, j + 1)

      const mask =
        (f0 >= t ? 1 : 0) | (f1 >= t ? 2 : 0) | (f2 >= t ? 4 : 0) | (f3 >= t ? 8 : 0)
      if (mask === 0 || mask === 15) continue

      // Saddles: the cell average decides whether the two filled corners are
      // joined through the middle or pinched apart.
      let pairs
      if (mask === 5) {
        pairs = (f0 + f1 + f2 + f3) / 4 >= t ? [['D', 'C'], ['B', 'A']] : [['D', 'A'], ['B', 'C']]
      } else if (mask === 10) {
        pairs = (f0 + f1 + f2 + f3) / 4 >= t ? [['A', 'D'], ['C', 'B']] : [['A', 'B'], ['C', 'D']]
      } else {
        pairs = CASES[mask]
      }

      for (const [from, to] of pairs) {
        segments.push([
          crossing(from, i, j, f0, f1, f2, f3, t),
          crossing(to, i, j, f0, f1, f2, f3, t),
        ])
      }
    }
  }

  // Chain head-to-tail. Every crossing point is shared by exactly two
  // segments, so following `next` from any unused segment closes a ring.
  const next = new Map()
  for (const seg of segments) {
    const k = key(seg[0])
    if (!next.has(k)) next.set(k, [])
    next.get(k).push(seg)
  }

  const rings = []
  const used = new Set()

  for (const start of segments) {
    if (used.has(start)) continue
    const ring = [start[0]]
    let seg = start

    while (seg && !used.has(seg)) {
      used.add(seg)
      ring.push(seg[1])
      const candidates = next.get(key(seg[1])) ?? []
      seg = candidates.find((s) => !used.has(s))
    }

    // Drop the duplicated closing point; ignore degenerate stubs.
    if (ring.length > 3) rings.push(ring.slice(0, -1))
  }

  return rings
}

/* ------------------------------------------------------------------ */
/* Simplify                                                            */
/* ------------------------------------------------------------------ */

function perpendicular(p, a, b) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len = Math.hypot(dx, dy)
  if (len < 1e-9) return Math.hypot(p[0] - a[0], p[1] - a[1])
  return Math.abs((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) / len
}

function douglasPeucker(points, epsilon) {
  if (points.length < 3) return points

  let worst = 0
  let index = 0
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicular(points[i], points[0], points[points.length - 1])
    if (d > worst) {
      worst = d
      index = i
    }
  }

  if (worst <= epsilon) return [points[0], points[points.length - 1]]

  return [
    ...douglasPeucker(points.slice(0, index + 1), epsilon).slice(0, -1),
    ...douglasPeucker(points.slice(index), epsilon),
  ]
}

/** Douglas-Peucker on a closed ring, split at its two most distant points so
 *  the seam is not itself a source of error. */
function simplifyRing(ring, epsilon) {
  let far = 0
  let best = -1
  for (let i = 1; i < ring.length; i++) {
    const d = Math.hypot(ring[i][0] - ring[0][0], ring[i][1] - ring[0][1])
    if (d > best) {
      best = d
      far = i
    }
  }

  const head = douglasPeucker(ring.slice(0, far + 1), epsilon)
  const tail = douglasPeucker([...ring.slice(far), ring[0]], epsilon)
  return [...head.slice(0, -1), ...tail.slice(0, -1)]
}

/* ------------------------------------------------------------------ */
/* Cubic fit                                                           */
/* ------------------------------------------------------------------ */

const unit = (dx, dy) => {
  const len = Math.hypot(dx, dy)
  return len < 1e-9 ? [0, 0] : [dx / len, dy / len]
}

/**
 * Fits a closed ring with cubic segments. A vertex whose turn exceeds
 * `cornerAngle` keeps its crease; everything else gets a Catmull-Rom tangent,
 * which is what rounds the pin back into a circle.
 */
function ringToPath(ring, cornerAngle, precision) {
  const n = ring.length
  const num = (v) => {
    const r = Number(v.toFixed(precision))
    return Object.is(r, -0) ? 0 : r
  }

  const corner = []
  const tangent = []
  for (let i = 0; i < n; i++) {
    const prev = ring[(i - 1 + n) % n]
    const point = ring[i]
    const nextPoint = ring[(i + 1) % n]

    const incoming = unit(point[0] - prev[0], point[1] - prev[1])
    const outgoing = unit(nextPoint[0] - point[0], nextPoint[1] - point[1])
    const dot = Math.max(-1, Math.min(1, incoming[0] * outgoing[0] + incoming[1] * outgoing[1]))

    corner[i] = Math.acos(dot) > cornerAngle
    tangent[i] = unit(nextPoint[0] - prev[0], nextPoint[1] - prev[1])
  }

  let d = `M${num(ring[0][0])} ${num(ring[0][1])}`

  for (let i = 0; i < n; i++) {
    const a = ring[i]
    const b = ring[(i + 1) % n]
    const along = unit(b[0] - a[0], b[1] - a[1])
    const span = Math.hypot(b[0] - a[0], b[1] - a[1]) / 3

    // At a corner the segment leaves (or arrives) along its own chord, so two
    // adjacent corners produce a dead-straight edge.
    const out = corner[i] ? along : tangent[i]
    const into = corner[(i + 1) % n] ? along : tangent[(i + 1) % n]

    const c1 = [a[0] + out[0] * span, a[1] + out[1] * span]
    const c2 = [b[0] - into[0] * span, b[1] - into[1] * span]

    d += `C${num(c1[0])} ${num(c1[1])} ${num(c2[0])} ${num(c2[1])} ${num(b[0])} ${num(b[1])}`
  }

  return `${d}Z`
}

/* ------------------------------------------------------------------ */
/* Entry point                                                         */
/* ------------------------------------------------------------------ */

/**
 * Traces a coverage field into one SVG path. Holes come out as extra
 * subpaths, so the result is meant to be filled `evenodd`.
 */
export function traceField(
  field,
  w,
  h,
  { threshold = 0.5, epsilon = 0.35, cornerAngle = (32 * Math.PI) / 180, minArea = 1.2, precision = 2 } = {},
) {
  const rings = isoContours(field, w, h, threshold)

  return rings
    .map((ring) => simplifyRing(ring, epsilon))
    .filter((ring) => ring.length >= 3 && Math.abs(signedArea(ring)) >= minArea)
    .map((ring) => ringToPath(ring, cornerAngle, precision))
    .join('')
}

export function signedArea(ring) {
  let sum = 0
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]
    const b = ring[(i + 1) % ring.length]
    sum += a[0] * b[1] - b[0] * a[1]
  }
  return sum / 2
}
