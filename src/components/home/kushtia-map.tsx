import { memo, useEffect, useMemo, useRef } from 'react'
import { AREA_MAP } from '@/data/categories'
import type { AreaId } from '@/data/types'
import { useI18n } from '@/lib/i18n'
import { useReducedMotion } from '@/lib/motion'
import { currentScrollY, onScrollFrame } from '@/lib/scroll'
import { cn } from '@/lib/utils'

/* ==========================================================================
 * The site's Kushtia map.
 *
 * Mounted once in the app shell and fixed behind every public page — hero,
 * healthcare, emergency, services, rentals, search, listing details and the
 * footer all scroll over the same backdrop, so moving between them reads as
 * moving across one place. It is a background and nothing more: no route, no
 * section of its own, and no interaction.
 *
 * Vector, not a picture. Every upazila sits where its real coordinates put it:
 * the six positions below are projected from `AREA_MAP` — the same values the
 * distance sort and the map panel use — so the arrangement is the district's
 * actual shape rather than a designer's impression of it, and correcting a
 * coordinate moves the marker with no artwork to redraw.
 *
 * WHAT IS REAL AND WHAT IS NOT
 *
 * Marker positions and their relative geometry: real, from AREA_MAP.
 * Roads, river, routes and urban blocks: illustrative. They are drawn from the
 * projected points to read as a district — the Padma along the north-west, the
 * Gorai running south-east, trunk roads through Sadar — but they are not
 * surveyed geometry and nothing in the app treats them as data. They exist to
 * make the hero feel like a place; no Directions link and no distance is ever
 * computed from them.
 *
 * THEMES ARE INDEPENDENT
 *
 * Light is not dark inverted. Dark is a deep navy field with blue-grey roads
 * and a cyan river; light is an off-white field with pale grey roads and a
 * soft blue river. Each is tuned so hero copy stays readable over it, which is
 * why the two palettes are written out per element rather than derived.
 *
 * MOTION
 *
 * Eight layers at increasing depth — grid, urban blocks, river, roads, dashed
 * routes, glow, markers and labels — offset by both pointer position and scroll
 * position, each scaled by its own depth. The grid barely moves; the labels move
 * most. Everything is a `translate3d`, so the whole backdrop stays on the
 * compositor and scrolling never triggers layout.
 *
 * Whether any of it runs is `lib/motion.ts`'s decision, not this file's — see
 * the note in the effect below.
 *
 * WHY THE MOTION IS WRITTEN TO THE DOM INSTEAD OF THROUGH REACT
 *
 * This component was the site's scroll stutter, and it is worth writing down
 * exactly how, because the previous version had a comment explaining why it was
 * fine and the comment was wrong.
 *
 * It held the scroll offset and the pointer tilt in React state and set them
 * from the event handlers. The reasoning recorded here was that "the tree below
 * is a fixed, static set of paths ... React's work is diffing seven style
 * strings". It is not seven style strings. A re-render walks the entire SVG
 * below: six markers of four elements each, thirty scattered blocks, the river,
 * two passes over the trunk roads, the dashed routes, the gradients and the
 * labels — on the order of a hundred elements, rebuilt and diffed on every
 * scroll event. And because this is mounted in the app shell, fixed and
 * full-viewport, that happened behind every page on the site, not just the home
 * page it was designed for.
 *
 * Three smaller faults compounded it:
 *
 *   * `layer()` returned a fresh object each render, so all seven `<g>` nodes
 *     had their style attribute rewritten every time regardless of whether the
 *     value had changed.
 *   * each layer carried `transition: transform 380ms`. A transition restarted
 *     on every scroll event is seven interpolations the compositor is always
 *     part-way through, fighting the scroll rather than smoothing it.
 *   * the pointer handler called `getBoundingClientRect()` on every `mousemove`
 *     with no throttle — a forced synchronous layout, on the element that
 *     covers the viewport.
 *
 * So the layout is unchanged and the choreography is unchanged, and both of
 * those are now driven by writing `transform` straight onto seven cached DOM
 * nodes inside one requestAnimationFrame loop. React renders this component
 * once. Scrolling causes no render, no diff and no style-attribute churn, and
 * the smoothing that the CSS transition used to provide is a lerp inside the
 * same loop — which produces the same eased settle without ever restarting.
 *
 * The loop stops itself when every layer is within half a pixel of its target
 * and starts again on the next input, so a page sitting still costs nothing.
 * ========================================================================== */

/* ------------------------------------------------------------------ */
/* Projection                                                          */
/* ------------------------------------------------------------------ */

const VIEW = { w: 1200, h: 700 }

/**
 * The window the map draws, in degrees.
 *
 * Padded well beyond the six upazilas on the latitude axis in particular. The
 * hero is a wide, short band and the svg uses `slice`, so it fills the box and
 * crops whatever overflows — top and bottom, at these proportions. Sizing the
 * window so the district occupies only the middle ~45% vertically is what keeps
 * Daulatpur and Khoksa, the northern and southern extremes, inside the frame
 * instead of cropped away at exactly the widths the hero is usually viewed at.
 */
const BOUNDS = { west: 88.85, east: 89.32, south: 23.6, north: 24.25 }

function project(lng: number, lat: number): { x: number; y: number } {
  return {
    x: ((lng - BOUNDS.west) / (BOUNDS.east - BOUNDS.west)) * VIEW.w,
    // Latitude increases northward and SVG y increases downward.
    y: ((BOUNDS.north - lat) / (BOUNDS.north - BOUNDS.south)) * VIEW.h,
  }
}

const AREA_ORDER: AreaId[] = [
  'daulatpur',
  'bheramara',
  'mirpur',
  'kushtia-sadar',
  'kumarkhali',
  'khoksa',
]

const PLACES = AREA_ORDER.map((id) => {
  const area = AREA_MAP[id]
  return { id, name: area.name, ...project(area.coords.lng, area.coords.lat) }
})

const at = (id: AreaId) => PLACES.find((p) => p.id === id)!

type Point = { x: number; y: number }

/**
 * The control point of the quadratic that bends a road off the straight line.
 *
 * Split out from `curve()` so the geometry has one definition. The focus light
 * below walks these same curves, and if it computed its own the light would
 * drift off the roads the moment either formula was touched.
 */
function control(a: Point, b: Point, bow: number): Point {
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  // Offset the control point perpendicular to the run.
  const dx = b.x - a.x
  const dy = b.y - a.y
  return { x: mx - dy * bow, y: my + dx * bow }
}

/** A gentle curve between two projected points, so roads are not rulers. */
function curve(a: Point, b: Point, bow = 0.12): string {
  const c = control(a, b, bow)
  return `M ${a.x} ${a.y} Q ${c.x} ${c.y} ${b.x} ${b.y}`
}

/** A point at `t` (0..1) along a quadratic Bézier. */
function quadAt(a: Point, c: Point, b: Point, t: number): Point {
  const u = 1 - t
  return {
    x: u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * c.y + t * t * b.y,
  }
}

const sadar = at('kushtia-sadar')

/** Trunk roads: everything meets at Sadar, which is how the district works. */
const ROADS = [
  curve(at('daulatpur'), at('bheramara')),
  curve(at('bheramara'), at('mirpur')),
  curve(at('mirpur'), sadar),
  curve(sadar, at('kumarkhali')),
  curve(at('kumarkhali'), at('khoksa')),
  curve(at('bheramara'), sadar, -0.08),
]

/** Secondary links, drawn dashed. */
const ROUTES = [
  curve(at('daulatpur'), at('mirpur'), -0.16),
  curve(sadar, at('khoksa'), 0.2),
]

/* ------------------------------------------------------------------ */
/* Cartographic detail                                                 */
/*                                                                     */
/* Everything below is the second tier of the map: minor settlements,  */
/* local roads, upazila boundaries, tributaries and low ground. It is   */
/* here to make the backdrop read as a surveyed district rather than as */
/* six dots on a line.                                                  */
/*                                                                     */
/* WHAT IS REAL AND WHAT IS NOT — unchanged from the note at the top    */
/*                                                                     */
/* The names are real places in Kushtia district. Their *positions* are */
/* not surveyed: they are laid out relative to the six projected towns  */
/* so the network reads correctly, exactly as the trunk roads and the   */
/* river already are. Nothing in the app computes a distance or a       */
/* direction from any of it. The six main towns remain the only         */
/* geometry taken from real coordinates, via AREA_MAP.                  */
/*                                                                     */
/* CONTRAST BUDGET                                                      */
/*                                                                     */
/* Every element here sits below the tier above it: minor roads are     */
/* thinner and paler than trunk roads, minor labels are ~60% the size   */
/* of the town labels and dimmer, boundaries are dashed hairlines. The  */
/* hero has to stay the thing you read first, so detail is bought with  */
/* density rather than with contrast.                                   */
/* ------------------------------------------------------------------ */

/** A point between two projected places, `f` of the way along, nudged off the
 *  line by `off` so a settlement does not sit exactly on the trunk road. */
function between(a: Point, b: Point, f: number, off = 0): Point {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  return {
    x: a.x + dx * f - (dy / len) * off,
    y: a.y + dy * f + (dx / len) * off,
  }
}

const daulatpur = at('daulatpur')
const bheramara = at('bheramara')
const mirpur = at('mirpur')
const kumarkhali = at('kumarkhali')
const khoksa = at('khoksa')

/**
 * Minor settlements, drawn as a small node and a small label.
 *
 * Ten is deliberate. Fewer and the district still looks empty between the
 * towns; more and the labels start colliding at the widths the hero is
 * actually read at, which is worse than having none.
 */
const MINOR: { name: { en: string; bn: string }; at: Point }[] = [
  { name: { en: 'Allardarga', bn: 'আল্লারদর্গা' }, at: between(daulatpur, bheramara, 0.34, -26) },
  { name: { en: 'Hatash Haripur', bn: 'হাটাশ হরিপুর' }, at: between(daulatpur, bheramara, 0.68, 30) },
  { name: { en: 'Amla', bn: 'আমলা' }, at: between(bheramara, mirpur, 0.45, -30) },
  { name: { en: 'Poradaha', bn: 'পোড়াদহ' }, at: between(bheramara, sadar, 0.5, 34) },
  { name: { en: 'Jagati', bn: 'জগতি' }, at: between(mirpur, sadar, 0.62, -24) },
  { name: { en: 'Janipur', bn: 'জানিপুর' }, at: between(sadar, kumarkhali, 0.26, 30) },
  { name: { en: 'Bittipara', bn: 'বিত্তিপাড়া' }, at: between(sadar, kumarkhali, 0.58, -28) },
  { name: { en: 'Shilaidaha', bn: 'শিলাইদহ' }, at: between(kumarkhali, khoksa, 0.3, 32) },
  { name: { en: 'Piaripur', bn: 'পিয়ারীপুর' }, at: between(kumarkhali, khoksa, 0.66, -26) },
  { name: { en: 'Chithulia', bn: 'চিথুলিয়া' }, at: between(mirpur, daulatpur, 0.5, 40) },
]

/**
 * Local roads: every minor settlement joined onto the trunk network, plus a
 * few cross-links so the network has loops in it. A road system that is a pure
 * tree reads as a diagram; real ones close.
 */
const MINOR_ROADS = [
  curve(daulatpur, MINOR[0].at, 0.08),
  curve(MINOR[0].at, bheramara, 0.06),
  curve(MINOR[1].at, bheramara, -0.1),
  curve(bheramara, MINOR[2].at, 0.09),
  curve(MINOR[2].at, mirpur, -0.07),
  curve(MINOR[3].at, sadar, 0.05),
  curve(mirpur, MINOR[4].at, 0.08),
  curve(MINOR[4].at, sadar, -0.06),
  curve(sadar, MINOR[5].at, 0.07),
  curve(MINOR[5].at, MINOR[6].at, -0.05),
  curve(MINOR[6].at, kumarkhali, 0.06),
  curve(kumarkhali, MINOR[7].at, -0.08),
  curve(MINOR[7].at, MINOR[8].at, 0.05),
  curve(MINOR[8].at, khoksa, -0.07),
  curve(MINOR[9].at, mirpur, 0.1),
  curve(daulatpur, MINOR[9].at, -0.09),
]

/** Unnamed lanes running off the network into the fields. Short, and the
 *  faintest thing on the map — they read as texture, not as routes. */
const LANES = MINOR.flatMap((m, i) => {
  const a = m.at
  const spread = [(i * 37) % 60, (i * 53) % 60]
  return [
    `M ${a.x} ${a.y} L ${a.x + 34 + spread[0] * 0.4} ${a.y + 22 - spread[1] * 0.5}`,
    `M ${a.x} ${a.y} L ${a.x - 28 - spread[1] * 0.35} ${a.y + 30 + spread[0] * 0.3}`,
  ]
})

/** Where a local road meets the trunk network. Small, and only at the towns
 *  the roads actually converge on. */
const JUNCTIONS = [
  between(daulatpur, bheramara, 0.34, -26),
  between(bheramara, mirpur, 0.45, -30),
  between(mirpur, sadar, 0.62, -24),
  between(sadar, kumarkhali, 0.26, 30),
  between(kumarkhali, khoksa, 0.3, 32),
]

/**
 * Upazila boundaries, as dashed hairlines running between the towns rather
 * than around them.
 *
 * Drawn this way on purpose. Closed polygons would be a claim about where the
 * borders are, and these are not surveyed; a line falling roughly between two
 * upazila seats says "the district is divided here" without asserting a shape.
 */
const BOUNDARIES = [
  `M ${between(daulatpur, bheramara, 0.5, -170).x} ${between(daulatpur, bheramara, 0.5, -170).y}
   Q ${between(daulatpur, bheramara, 0.5, 0).x} ${between(daulatpur, bheramara, 0.5, 20).y}
     ${between(daulatpur, bheramara, 0.5, 170).x} ${between(daulatpur, bheramara, 0.5, 170).y}`,
  `M ${between(bheramara, mirpur, 0.55, -180).x} ${between(bheramara, mirpur, 0.55, -180).y}
   Q ${between(bheramara, mirpur, 0.55, 0).x} ${between(bheramara, mirpur, 0.55, 10).y}
     ${between(bheramara, mirpur, 0.55, 180).x} ${between(bheramara, mirpur, 0.55, 180).y}`,
  `M ${between(mirpur, sadar, 0.5, -200).x} ${between(mirpur, sadar, 0.5, -200).y}
   Q ${between(mirpur, sadar, 0.5, 0).x} ${between(mirpur, sadar, 0.5, 15).y}
     ${between(mirpur, sadar, 0.5, 200).x} ${between(mirpur, sadar, 0.5, 200).y}`,
  `M ${between(sadar, kumarkhali, 0.5, -190).x} ${between(sadar, kumarkhali, 0.5, -190).y}
   Q ${between(sadar, kumarkhali, 0.5, 0).x} ${between(sadar, kumarkhali, 0.5, 12).y}
     ${between(sadar, kumarkhali, 0.5, 190).x} ${between(sadar, kumarkhali, 0.5, 190).y}`,
  `M ${between(kumarkhali, khoksa, 0.55, -170).x} ${between(kumarkhali, khoksa, 0.55, -170).y}
   Q ${between(kumarkhali, khoksa, 0.55, 0).x} ${between(kumarkhali, khoksa, 0.55, 14).y}
     ${between(kumarkhali, khoksa, 0.55, 170).x} ${between(kumarkhali, khoksa, 0.55, 170).y}`,
]

/** Tributaries feeding the two main channels. Thinner than the rivers they
 *  join, and they stop short rather than running off the frame. */
const TRIBUTARIES = [
  'M 210 96 C 250 150, 236 196, 286 236',
  'M 520 214 C 556 262, 604 274, 640 322',
  'M 840 268 C 884 320, 928 332, 962 386',
  'M 1096 250 C 1128 296, 1150 330, 1168 372',
  'M 742 430 C 786 468, 828 486, 872 526',
]

/** Low ground and char land along the water. Very soft, and the lowest
 *  contrast thing on the map — it should register as tone, not as shape. */
const TERRAIN = [
  'M -40 120 C 140 70, 320 120, 430 190 C 300 236, 130 214, -40 214 Z',
  'M 660 372 C 790 400, 900 466, 1010 556 C 880 540, 740 486, 640 430 Z',
  'M 250 470 C 400 440, 520 486, 610 556 C 460 596, 320 560, 240 520 Z',
]

/* ------------------------------------------------------------------ */
/* The journey                                                         */
/* ------------------------------------------------------------------ */

/**
 * The district north-west to south-east, which is also the order the trunk
 * roads already connect it in — the first five entries of `ROADS` are exactly
 * these hops.
 *
 * This is what the focus light travels. It is a real route through real
 * coordinates, not a decorative path invented to look like one.
 */
const JOURNEY: AreaId[] = [
  'daulatpur',
  'bheramara',
  'mirpur',
  'kushtia-sadar',
  'kumarkhali',
  'khoksa',
]

/**
 * The journey as Bézier segments, built from the same `control()` the roads
 * are drawn with and at the same default bow — so the light rides the road
 * rather than cutting the corner beside it.
 */
const JOURNEY_SEGMENTS = JOURNEY.slice(0, -1).map((id, i) => {
  const a = at(id)
  const b = at(JOURNEY[i + 1])
  return { a, c: control(a, b, 0.12), b }
})

/**
 * Where the light is at `t` (0..1) across the whole journey.
 *
 * One continuous walk: `t` scales across the five segments, the integer part
 * picks the segment and the fraction is the position along it. There is no
 * per-location fade to cross-fade between and therefore nothing that can snap
 * — at a segment boundary the light is simply at a location, arriving and
 * leaving on the same curve.
 */
function pointOnJourney(t: number): Point {
  const n = JOURNEY_SEGMENTS.length
  const scaled = Math.min(Math.max(t, 0), 1) * n
  const i = Math.min(Math.floor(scaled), n - 1)
  const seg = JOURNEY_SEGMENTS[i]
  return quadAt(seg.a, seg.c, seg.b, scaled - i)
}

/**
 * How wide the pool of light is, in view units against a 1200x700 canvas.
 *
 * Large on purpose. The brief asks for illumination rather than an object, and
 * the way a soft light stops reading as a glowing ball is by being much bigger
 * than the thing it is lighting — a 520-unit pool over a ~20-unit marker reads
 * as the area brightening.
 */
const FOCUS_RADIUS = 300

/**
 * How quickly the light catches the scroll, as the time for the remaining
 * distance to halve. Slower than the parallax so it drifts rather than tracks,
 * which is what makes it feel like a camera.
 */
const FOCUS_HALF_LIFE_MS = 230

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

/**
 * Each layer's depth, back to front. The grid barely moves; the labels move
 * most. Fixed and named rather than passed per call site, because the scroll
 * transforms below are hooks and must be created unconditionally.
 */
const SCROLL_SPAN = 1400

const DEPTH = {
  grid: 1,
  blocks: 3,
  glow: 4,
  river: 6,
  roads: 9,
  routes: 11,
  markers: 14,
} as const

/** The seven layers the loop drives, in the order their refs are stored. */
const LAYER_DEPTHS = [
  DEPTH.grid,
  DEPTH.blocks,
  DEPTH.river,
  DEPTH.roads,
  DEPTH.routes,
  DEPTH.glow,
  DEPTH.markers,
] as const

/**
 * How quickly a layer catches up with its target, as the time for the remaining
 * distance to halve.
 *
 * This replaces the `transition: transform 380ms cubic-bezier(0.22, 1, 0.36, 1)`
 * the layers used to carry. An exponential ease is not the same curve, but it is
 * the same *feel* — a fast start that eases into place — and unlike a CSS
 * transition it has no notion of restarting, so a continuous stream of scroll
 * events produces one continuous settle rather than a new 380ms animation every
 * event.
 *
 * A DURATION, NOT A PER-FRAME FRACTION
 *
 * This was `0.12 per frame`, which is only 0.12 per frame on the display it was
 * written on. At 120Hz that ease ran twice as fast as at 60Hz, so the map
 * tracked tightly on a desktop and drifted on a phone — the opposite of what
 * was wanted, since the phone is where it most needs to feel immediate.
 *
 * The number is also tighter than the 90ms the old per-frame value worked out
 * to at 60Hz. That is deliberate: lib/scroll.ts now hands this loop a value
 * that has already been eased, and two eases in series read as lag. Shortening
 * this one keeps the *combined* response about where it was while moving the
 * softness upstream, where every scroll-linked layer shares it.
 */
const LAYER_HALF_LIFE_MS = 70

/** Below half a pixel of remaining travel, nothing more is visible. */
const SETTLED = 0.5

/** The deepest layer, and therefore the one whose displacement is largest. */
const MAX_DEPTH = Math.max(...LAYER_DEPTHS)

/**
 * How much of the scroll parallax this viewport gets.
 *
 * The same tiering as `useDepth` in lib/parallax.ts, and the same reasoning:
 * these distances were authored against a 1440px stage, and replaying them at
 * full strength on a 360px screen slides the labels much further across the
 * artwork than the composition wants. Every layer is scaled by the same number,
 * so the ratios between them — which is what the eye reads as depth — are
 * untouched. Kept here rather than imported because this runs inside an effect,
 * not a render.
 */
function depthTier(): number {
  if (typeof window === 'undefined' || !window.matchMedia) return 1
  if (window.matchMedia('(min-width: 1024px)').matches) return 1
  if (window.matchMedia('(min-width: 768px)').matches) return 0.6
  return 0.36
}

/**
 * The smallest change worth writing to the layers, in SVG user units.
 *
 * WHY THIS EXISTS, AND WHY IT IS THE MOBILE SCROLL FIX
 *
 * A transform on an SVG `<g>` is not composited the way one on an HTML element
 * is. The browser cannot hand the group its own layer and slide it; it has to
 * re-rasterise the region the group covers. These seven groups each cover the
 * whole artwork, and the artwork is a `fixed inset-0` backdrop, so *any* write
 * here re-rasterises the full viewport — at whatever the device pixel ratio is,
 * which on a phone is 3.
 *
 * Measured, headless Chrome at 390x844 / DPR 3 / 4x CPU throttle, scrolling the
 * home page end to end: 42 frames over 20ms with these writes happening every
 * frame, 22 with the writes frozen, 16 with the whole backdrop removed. The
 * per-frame transform was the single largest source of dropped frames on the
 * page — larger than every `backdrop-filter` on the site put together, which
 * cost 2 frames.
 *
 * So the writes are quantised rather than removed. The step is the value that
 * moves the *deepest* layer by about one CSS pixel: below that nothing is on
 * screen to see, and above it the motion is exactly what it was. On a 390px
 * phone that is a write roughly every fourth frame instead of every frame; on a
 * 1440px desktop the step works out at 0.06 units, which no real frame ever
 * fails to clear, so desktop keeps writing every frame as it always did.
 */
function writeStep(): number {
  const width = typeof window === 'undefined' ? VIEW.w : window.innerWidth || VIEW.w
  return VIEW.w / width / MAX_DEPTH
}

/**
 * How the map is being used, which is the only thing that differs between its
 * two homes.
 *
 * 'backdrop' — behind the public site. Motion comes from the reader: pointer
 *              tilt and scroll position, exactly as it always has.
 *
 * 'panel'    — the left half of the contributor entrance. There is no scroll
 *              there and often no pointer over it, so the same eight layers are
 *              driven by a clock instead, and the readability veil lifts because
 *              nothing is set over the map on that side.
 *
 * A variant rather than a second component. The artwork, the projection, the
 * colours, the theme handling and the layer structure are the thing worth
 * sharing — duplicating them to get a different motion source is how the two
 * copies drift apart, and it is the map's identity that has to stay identical
 * for the auth page to read as part of ELAKAI at all.
 */
export type KushtiaMapVariant = 'backdrop' | 'panel'

/**
 * Continuous drift, for the 'panel' variant.
 *
 * WHY OSCILLATION RATHER THAN A TRUE ENDLESS PAN
 *
 * A pan that never turns around needs artwork that tiles, and this artwork
 * deliberately does not: it is one district, drawn where its real coordinates
 * put it. Repeating it would put a second Kushtia next to the first with a
 * visible seam between them, which is worse than not travelling.
 *
 * So each layer runs a long, slow sine instead. The periods below are all
 * different and none divides evenly into another, so the layers never realign
 * and the composition never returns to a pose you just watched — the same
 * trick the brand panel's planes use. At these periods a full traverse takes
 * over a minute, which reads as continuous travel rather than as something
 * swinging back and forth, and it has no reset point at all because a sine has
 * nowhere to jump.
 *
 * X and Y run on different periods so a layer traces a slow Lissajous rather
 * than a diagonal line.
 */
const DRIFT_SECONDS = [67, 59, 53, 47, 43, 61, 37] as const

/** Pixels of travel per unit of depth. The grid moves ~5px, the labels ~70. */
const DRIFT_AMPLITUDE = 5

function KushtiaMapImpl({
  className,
  variant = 'backdrop',
}: {
  className?: string
  variant?: KushtiaMapVariant
}) {
  const { L } = useI18n()
  const reduced = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const layerRefs = useRef<(SVGGElement | null)[]>([])
  const focusRef = useRef<SVGGElement | null>(null)
  /*
   * The Sadar beacon, held so the loop below can stop it while the page moves.
   *
   * WHY THIS ONE ELEMENT HAS A REF AND THE OTHER RINGS DO NOT
   *
   * `animate-pulse-ring` is `transform: scale()` plus `opacity`, which is the
   * compositor-friendly pair — on an HTML element. The other two call sites
   * (emergency-card, hero) are `<span>`s and genuinely do stay off the main
   * thread. This one is an SVG `<circle>`, and an SVG transform is not a
   * compositor property: it participates in SVG layout, so every frame of the
   * 2s loop lays the map out again. `will-change` does not rescue it; that was
   * measured and it changes nothing.
   *
   * Measured at 390x844 / DPR 3 / 4x CPU throttle, scrolling the home page end
   * to end: this single circle accounted for *all* 1188 layouts and all 210ms
   * of layout in the trace, and 17% of total main-thread time. With its
   * animation off, the page performs zero layouts while scrolling.
   */
  const pulseRef = useRef<SVGCircleElement | null>(null)

  const panel = variant === 'panel'

  /*
   * The focus light, placed but not animated.
   *
   * Both loops below return early under reduced motion, and both of them are
   * also what puts the light somewhere. Without this the group keeps its
   * initial `transform: none` and the light sits at the viewBox origin — a
   * glow in the top-left corner of the artwork, nowhere near Daulatpur, for
   * exactly the people least able to ignore it.
   *
   * So the glow stays, at the start of the journey, and simply does not
   * travel. Same size, same colour, same blur, same place the animated version
   * begins from.
   */
  useEffect(() => {
    if (!reduced || !focusRef.current) return
    const p = pointOnJourney(0)
    focusRef.current.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`
  }, [reduced])

  /*
   * The clock-driven variant. Separate effect from the input-driven one below
   * so neither has to carry a branch through its whole body, and so the
   * backdrop's listeners are not merely skipped but never referenced.
   */
  useEffect(() => {
    if (!panel || reduced) return

    const nodes = layerRefs.current
    if (!nodes.length) return

    let frame = 0

    /*
     * The animation clock, kept across pauses.
     *
     * `base` is when the current run started and `elapsed` is how much time the
     * animation had already accumulated before it. Reading `performance.now()`
     * directly would mean a panel that was off-screen for two minutes resumed
     * two minutes further along its sine — the light would jump to a different
     * town and the layers would snap to new offsets the moment it scrolled back
     * into view.
     */
    let base = performance.now()
    let elapsed = 0

    function draw(now: number) {
      frame = requestAnimationFrame(draw)
      elapsed = now - base
      const t = elapsed / 1000

      // Seven writes, no reads — the same discipline as the backdrop loop, for
      // the same reason: transforms on an SVG group stay on the compositor as
      // long as nothing asks the browser to measure in between.
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]
        if (!node) continue
        const depth = LAYER_DEPTHS[i]
        const period = DRIFT_SECONDS[i] ?? 51
        const amp = depth * DRIFT_AMPLITUDE
        const x = Math.sin((t / period) * Math.PI * 2) * amp
        const y = Math.sin((t / (period * 1.37)) * Math.PI * 2 + i) * amp * 0.55
        node.style.transform = `translate3d(${x}px, ${y}px, 0)`
      }

      /*
       * The focus light, on a clock here because there is no scroll on the
       * auth page to read.
       *
       * A triangle wave rather than a sawtooth: it walks Daulatpur to Khoksa
       * and then back again, so the light is always somewhere on the route and
       * never jumps home. A sawtooth would teleport from Khoksa to Daulatpur
       * once a minute, which is exactly the snap the brief rules out.
       */
      if (focusRef.current) {
        const cycle = (t / 96) % 2
        const p = pointOnJourney(cycle > 1 ? 2 - cycle : cycle)
        focusRef.current.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`
      }
    }

    /*
     * ONE LOOP, AND IT ONLY RUNS WHEN IT IS EARNING ITS KEEP.
     *
     * This started unconditionally on mount and never stopped. On the auth page
     * that is the worst possible timing: the map is the heaviest thing in the
     * tree — a few hundred paths since the district was filled in — and it was
     * competing with React's first commit and with Supabase's session restore
     * for the same main thread, on the one screen whose entire job is to accept
     * a password. It also kept running behind the contributor dashboard after
     * the form navigated away.
     *
     * Three things fix that, in order of how much they matter:
     *
     *   1. It does not start until the browser is idle. The login form is
     *      interactive first; the map arrives a moment later and nobody is
     *      waiting on it. `requestIdleCallback` where it exists, a short
     *      timeout where it does not (Safari).
     *   2. It stops when the panel is off-screen, via IntersectionObserver.
     *   3. It stops when the tab is hidden, which it already did.
     *
     * `start` is captured when the loop actually begins rather than at mount,
     * so a deferred or paused start does not make the light jump to wherever
     * the clock had wandered while nothing was drawing.
     */
    let running = false
    let visible = false

    function play() {
      if (running || !visible || document.visibilityState !== 'visible') return
      running = true
      // Hinted only while something is actually moving. Seven promoted layers
      // held for the life of the page is real memory on a cheap phone.
      for (const node of nodes) node?.style.setProperty('will-change', 'transform')
      base = performance.now() - elapsed
      frame = requestAnimationFrame(draw)
    }

    function pause() {
      if (!running) return
      running = false
      cancelAnimationFrame(frame)
      for (const node of nodes) node?.style.removeProperty('will-change')
    }

    function onVisibility() {
      if (document.visibilityState === 'visible') play()
      else pause()
    }

    const observer = new IntersectionObserver(
      (entries) => {
        visible = entries.some((e) => e.isIntersecting)
        if (visible) play()
        else pause()
      },
      // A little margin so it is already moving by the time it scrolls in.
      { rootMargin: '96px' },
    )
    if (ref.current) observer.observe(ref.current)

    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(() => play(), { timeout: 900 })
      : window.setTimeout(play, 260)

    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      if (window.cancelIdleCallback && typeof idle === 'number') {
        window.cancelIdleCallback(idle)
      }
      window.clearTimeout(idle as number)
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      pause()
    }
  }, [panel, reduced])

  useEffect(() => {
    // The backdrop's own driver. Untouched, and inert in the panel variant.
    if (panel) return

    // Through the project's seam, not `matchMedia` directly.
    //
    // `lib/motion.ts` is the site's single answer on reduced motion, and it
    // exists precisely so no component holds a second opinion. Querying the
    // media feature here did exactly that: on a machine with the OS setting
    // enabled the hero kept animating while this backdrop sat frozen behind it,
    // which is neither the accessible behaviour nor the intended one. Flipping
    // that one function turns this off along with everything else.
    if (reduced) return

    const nodes = layerRefs.current
    if (!nodes.length) return

    // Not a motion preference but a capability check, so it stays local: a
    // coarse pointer has no hover position to track, and the listener would
    // cost work and never move anything. Scroll still applies on touch.
    const fine = window.matchMedia('(pointer: fine)').matches

    // Where each layer is, and where it is heading. Plain arrays rather than
    // state: nothing here should ever cause React to do anything.
    const current = { x: 0, y: 0 }
    const target = { x: 0, y: 0 }

    /*
     * The focus light's position along the journey, 0 at Daulatpur and 1 at
     * Khoksa, held separately from the parallax so it can ease at its own rate.
     *
     * Read from the scroll value this component is *already* subscribed to.
     * Nothing here adds a listener or touches the wheel: lib/scroll.ts hands it
     * the browser's own `scrollY`, once per frame, through the `onScrollFrame`
     * callback below.
     */
    const focus = { current: 0, target: 0 }

    /*
     * The element's box, measured once and on resize rather than per event.
     *
     * Reading `getBoundingClientRect()` inside a `mousemove` handler is a
     * forced synchronous layout — the browser must flush pending style and
     * layout work before it can answer — and on an element that covers the
     * whole viewport that is the most expensive question you can ask, at the
     * highest frequency you can ask it. This element is `fixed inset-0`, so the
     * answer only changes when the viewport does.
     */
    let box = ref.current?.getBoundingClientRect() ?? null

    /*
     * How far the document can scroll, and the tier and step that depend on the
     * viewport. All three are read here and on resize rather than per frame.
     *
     * `scrollHeight` in particular was read inside `journeyAt` on every scroll
     * frame, and reading it forces the browser to flush pending style and
     * layout work before it can answer — a synchronous layout, in the callback
     * the browser most wants to keep short. Pages do grow as cards load, so it
     * is refreshed by a ResizeObserver on the document element as well, which
     * fires when the height actually changes instead of on the chance that it
     * might have.
     */
    let scrollLength = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
    let tier = depthTier()
    let step = writeStep()

    /*
     * Resize, coalesced to one frame and skipped when nothing it reads changed.
     *
     * THIS IS A PHONE PROBLEM AND ONLY A PHONE PROBLEM, which is why it is
     * worth the eight lines. On a desktop `resize` fires while a window is
     * being dragged and never during scrolling. On Android and iOS the address
     * bar collapses as you scroll down and comes back as you scroll up, and
     * every step of that fires `resize` — in the middle of the gesture. Each
     * one landed here, and each one read `getBoundingClientRect()` and
     * `scrollHeight`: two forced synchronous layouts, at scroll frequency, in
     * exactly the moment the browser has the least time to spare. No emulator
     * reproduces it, because no emulator has an address bar that hides.
     *
     * Two guards. The rAF coalesces a burst into one measurement per frame,
     * and it lands in the frame's own read phase rather than inside the event.
     * The dimension check is what makes the common case free: the toolbar
     * changes the viewport height, `box` is a `fixed inset-0` element whose
     * geometry follows it, and `scrollLength` is defined against it — so a
     * height that has genuinely changed still re-measures, and the repeated
     * events reporting the *same* height do not.
     */
    let measuredW = window.innerWidth
    let measuredH = window.innerHeight
    let pendingMeasure = 0

    const measure = () => {
      pendingMeasure = 0
      measuredW = window.innerWidth
      measuredH = window.innerHeight
      box = ref.current?.getBoundingClientRect() ?? null
      scrollLength = Math.max(0, document.documentElement.scrollHeight - measuredH)
      tier = depthTier()
      step = writeStep()
    }

    const remeasure = () => {
      if (window.innerWidth === measuredW && window.innerHeight === measuredH) return
      if (pendingMeasure) return
      pendingMeasure = requestAnimationFrame(measure)
    }

    const growth = new ResizeObserver(() => {
      scrollLength = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
    })
    growth.observe(document.documentElement)

    let frame = 0
    let running = false
    /** The last value actually written to the layers. See `writeStep`. */
    let written = { x: Number.NaN, y: Number.NaN }
    /** The last position written to the focus light, in whole SVG units. */
    let litAt = { x: Number.NaN, y: Number.NaN }

    /**
     * The frame clock for the eases below.
     *
     * Stamped by `wake()` as well as by each frame, so the first frame after
     * the loop has been idle measures its own length rather than the length of
     * the idle period — which would otherwise collapse the whole remaining
     * distance in one step and show up as a jump.
     */
    let lastDraw = 0

    /** The fraction of a remaining distance to close on a frame of `dt` ms. */
    const ease = (dt: number, halfLife: number) => 1 - Math.pow(2, -dt / halfLife)

    function draw(now: number) {
      running = true
      frame = requestAnimationFrame(draw)

      // Clamped: after a long task or a hidden tab this would otherwise be
      // hundreds of milliseconds and the ease would finish in a single step.
      const dt = Math.min(now - lastDraw, 64)
      lastDraw = now

      const dx = target.x - current.x
      const dy = target.y - current.y
      const df = focus.target - focus.current

      // Nothing left to move. Stop the loop entirely rather than burning a
      // frame forever on a page that is sitting still — the next input calls
      // `wake()` and it picks up where it left off.
      //
      // The light is part of that test now. Without it the loop could settle
      // the parallax and stop while the light was still mid-journey, freezing
      // it part-way between two towns until the next scroll event.
      if (
        Math.abs(dx) < SETTLED / 100 &&
        Math.abs(dy) < SETTLED / 100 &&
        Math.abs(df) < 0.0004
      ) {
        cancelAnimationFrame(frame)
        running = false
        for (const node of nodes) node?.style.removeProperty('will-change')
        // The page has come to rest, so the beacon can breathe again. Resuming
        // rather than restarting: `animation-play-state` holds the phase, so it
        // picks up mid-pulse exactly where it stopped and never re-runs the
        // expand from the beginning, which would read as a blink.
        pulseRef.current?.style.removeProperty('animation-play-state')
        return
      }

      const layerStep = ease(dt, LAYER_HALF_LIFE_MS)
      current.x += dx * layerStep
      current.y += dy * layerStep

      // Eases slower than the parallax, so the light lags the page a little and
      // reads as something travelling rather than something pinned to scroll.
      focus.current += df * ease(dt, FOCUS_HALF_LIFE_MS)
      if (focusRef.current) {
        const p = pointOnJourney(focus.current)
        // Rounded to whole units — a third of a CSS pixel on a phone, less on a
        // desktop. The light is a 300-unit gradient and moving it repaints
        // everything under it, so a sub-pixel rewrite is a repaint for nothing.
        const lx = Math.round(p.x)
        const ly = Math.round(p.y)
        if (lx !== litAt.x || ly !== litAt.y) {
          litAt = { x: lx, y: ly }
          focusRef.current.style.transform = `translate3d(${lx}px, ${ly}px, 0)`
        }
      }

      /*
       * Seven writes, no reads — and only when there is a pixel in it.
       *
       * Writing transforms without reading layout in between is what keeps this
       * out of the layout-thrash pattern: the browser batches all seven into
       * one style recalculation. What it does not avoid is the raster, because
       * these are SVG groups rather than HTML elements and each write
       * re-rasterises the region they cover — the whole viewport, here. `step`
       * is what turns "every frame" into "every frame that moves something
       * anyone can see"; see the note on `writeStep`.
       */
      if (
        !(Math.abs(current.x - written.x) < step) ||
        !(Math.abs(current.y - written.y) < step)
      ) {
        written = { x: current.x, y: current.y }
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i]
          if (!node) continue
          const depth = LAYER_DEPTHS[i]
          node.style.transform = `translate3d(${current.x * depth}px, ${current.y * depth}px, 0)`
        }
      }
    }

    function wake() {
      if (running) return
      lastDraw = performance.now()
      /*
       * Stop the beacon for as long as the page is moving.
       *
       * This is the whole fix, and it is two style writes per gesture rather
       * than a layout per frame. The ring is ambience on a backdrop that sits
       * behind every card on the page; while the reader is dragging, it is both
       * the least looked-at thing on screen and the only thing forcing layout.
       * When the scroll settles — which is the moment it is worth looking at —
       * it runs exactly as it always has.
       *
       * Deliberately hung off this loop rather than off a `data-scrolling`
       * attribute on <html>: this effect is already subscribed to the one
       * scroll pipeline and already knows when the page is in motion, and
       * writing an attribute on the root would invalidate style far wider than
       * the one element that needs it.
       */
      pulseRef.current?.style.setProperty('animation-play-state', 'paused')
      // Hinted only while something is actually moving. A permanent
      // `will-change: transform` on seven full-viewport groups asks the
      // compositor to hold seven layers for the life of the page, which costs
      // memory on exactly the low-end phones this is meant to feel smooth on.
      for (const node of nodes) node?.style.setProperty('will-change', 'transform')
      frame = requestAnimationFrame(draw)
    }

    /*
     * The two inputs are tracked separately and combined into the target,
     * because they arrive from different events and each has to be able to
     * change without discarding the other. The combination is exactly the one
     * the old inline style computed: horizontal is pointer only, vertical is
     * pointer tilt minus the clamped scroll contribution.
     */
    const pointer = { x: 0, y: 0 }

    /*
     * Clamped, so the separation accrues over the first screen or so and then
     * holds. Without it an eight-screen page would slide the labels a hundred
     * pixels clear of the markers they belong to.
     */
    const shareAt = (scrollY: number) =>
      (Math.min(scrollY, SCROLL_SPAN) / SCROLL_SPAN) * 7 * tier

    let scrollShare = shareAt(currentScrollY())

    /**
     * How far through the page we are, 0..1 — and therefore how far along the
     * journey the light should be.
     *
     * Deliberately the *whole document*, not `SCROLL_SPAN`. The parallax clamps
     * at one screen because its job is to separate the layers a little and then
     * stop; the light's job is the opposite, to make reading the page feel like
     * travelling the district end to end, so it has to stretch across
     * everything there is to scroll.
     *
     * The page length is `scrollLength`, measured on resize and whenever the
     * document actually changes height, rather than read here. It used to be
     * read here — `document.documentElement.scrollHeight`, once per scroll
     * frame — and that is a forced synchronous layout inside the scroll path:
     * the browser cannot answer it without first flushing whatever style and
     * layout work is pending. Pages do grow as cards load, which is why it was
     * read live; a ResizeObserver covers that without asking every frame.
     */
    function journeyAt(scrollY: number): number {
      if (scrollLength <= 0) return 0
      return Math.min(Math.max(scrollY / scrollLength, 0), 1)
    }

    focus.current = journeyAt(currentScrollY())
    focus.target = focus.current

    /*
     * Placed once, now, before any frame runs.
     *
     * The loop only writes while something is moving, and at the top of a page
     * nothing is: `focus.current` already equals `focus.target`, so `draw()`
     * settles on its first pass without touching the light. Without this line
     * the group keeps its initial `transform: none` and the light sits at the
     * viewBox origin — the top-left corner of the artwork, nowhere near
     * Daulatpur — until the reader happens to scroll.
     */
    if (focusRef.current) {
      const p = pointOnJourney(focus.current)
      focusRef.current.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`
    }

    function retarget() {
      target.x = pointer.x
      target.y = pointer.y - scrollShare
      wake()
    }

    function onMove(event: MouseEvent) {
      if (!box) return
      // -1..1 from the centre, so the shift is symmetric.
      pointer.x = ((event.clientX - box.left) / box.width - 0.5) * 2
      pointer.y = ((event.clientY - box.top) / box.height - 0.5) * 2
      retarget()
    }

    // Through the shared loop rather than its own listener — see lib/scroll.ts.
    // The value arrives already batched to one frame, so this never recomputes
    // more often than it can paint.
    const unsubscribe = onScrollFrame((scrollY) => {
      scrollShare = shareAt(scrollY)
      focus.target = journeyAt(scrollY)
      retarget()
    })

    /*
     * A hidden tab delivers no frames. Stopping on the way out means a
     * backgrounded ELAKAI is not holding seven promoted compositor layers, and
     * re-basing on the way in means it does not snap when it comes back.
     */
    function onVisibility() {
      if (document.visibilityState === 'visible') {
        remeasure()
        retarget()
      } else if (running) {
        cancelAnimationFrame(frame)
        running = false
      }
    }

    if (fine) window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('resize', remeasure, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      unsubscribe()
      growth.disconnect()
      if (fine) window.removeEventListener('mousemove', onMove)
      window.removeEventListener('resize', remeasure)
      document.removeEventListener('visibilitychange', onVisibility)
      if (running) cancelAnimationFrame(frame)
      // The coalesced measurement is a frame this component owns like any
      // other; leaving it queued past unmount is the same orphan.
      if (pendingMeasure) cancelAnimationFrame(pendingMeasure)
      // Never leave the hint behind on an unmount mid-animation.
      for (const node of nodes) node?.style.removeProperty('will-change')
      // Nor the pause. This effect re-runs when `reduced` or `panel` changes
      // and the circle outlives it, so a pause left set here would be a beacon
      // frozen for the rest of the page's life.
      pulseRef.current?.style.removeProperty('animation-play-state')
    }
  }, [reduced, panel])

  /**
   * Assigns each animated group its slot in `layerRefs`.
   *
   * Index-based rather than named, so the loop above can walk `LAYER_DEPTHS`
   * and the refs in lockstep without a lookup per frame.
   */
  const setLayer = useMemo(
    () =>
      LAYER_DEPTHS.map((_, i) => (node: SVGGElement | null) => {
        layerRefs.current[i] = node
      }),
    [],
  )

  return (
    <div ref={ref} aria-hidden="true" className={cn('pointer-events-none', className)}>
      <svg
        viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
        preserveAspectRatio="xMidYMid slice"
        className="size-full"
        role="presentation"
        focusable="false"
      >
        <defs>
          {/* Gradient stops carry their colour as a class pair rather than a
              `theme()` lookup: one class cannot change with the theme, and the
              veil in particular has to match the hero's own surface exactly in
              both modes or it reads as a grey panel floating over the map. */}
          {/* The focus light.
              Three stops rather than two, and the middle one carries most of
              the work: a straight centre-to-edge fade has a visible bright core
              and reads as a ball. Dropping to a third of the opacity by 40% and
              then trailing to nothing spreads the light over its whole radius,
              which is what makes it read as an area being lit instead.
              Dark mode is allowed to be a little stronger — the same alpha over
              a navy field is far less visible than over an off-white one — but
              it is still under a fifth of full. `stop-opacity` is set through
              the class so it can vary with the theme; a plain attribute cannot. */}
          <radialGradient id="km-focus" cx="50%" cy="50%">
            <stop
              offset="0%"
              className="[stop-color:#2563EB] [stop-opacity:0.26] dark:[stop-color:#38BDF8] dark:[stop-opacity:0.34]"
            />
            <stop
              offset="40%"
              className="[stop-color:#2563EB] [stop-opacity:0.11] dark:[stop-color:#38BDF8] dark:[stop-opacity:0.15]"
            />
            <stop
              offset="100%"
              className="[stop-color:#2563EB] [stop-opacity:0] dark:[stop-color:#38BDF8] dark:[stop-opacity:0]"
            />
          </radialGradient>
          {/* A gentle, even scrim rather than a directional fade.
              While the map was the hero's own backdrop it could dim hardest on
              the left, where the copy sat. As the backdrop for every page that
              no longer holds — search results and card grids run full width —
              so it settles to a light overall wash that keeps contrast off the
              text without deciding where the text will be. Cards and panels
              carry their own opaque surfaces on top of it. */}
          {/* The panel variant lifts the veil to roughly a third of the
              backdrop's. There is no body copy over the map on the auth page —
              only a wordmark and one line, both of which carry their own
              contrast — so the veil there is only keeping the map from
              competing with the form beside it, not making text legible on top
              of it. Left at full strength it washed the district out to the
              point that reusing the real map stopped being visible at all. */}
          <linearGradient id="km-veil" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              className="[stop-color:#FFFFFF] dark:[stop-color:#0F172A]"
              stopOpacity={panel ? '0.2' : '0.62'}
            />
            <stop
              offset="45%"
              className="[stop-color:#FFFFFF] dark:[stop-color:#0F172A]"
              stopOpacity={panel ? '0.14' : '0.5'}
            />
            <stop
              offset="100%"
              className="[stop-color:#FFFFFF] dark:[stop-color:#0F172A]"
              stopOpacity={panel ? '0.24' : '0.66'}
            />
          </linearGradient>
          <pattern id="km-grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path
              d="M 60 0 L 0 0 0 60"
              fill="none"
              strokeWidth="1"
              className="stroke-[#d4dce7] dark:stroke-[#1d2a3d]"
            />
          </pattern>
        </defs>

        {/* 1 — base field */}
        <rect width={VIEW.w} height={VIEW.h} className="fill-[#f4f7fb] dark:fill-[#0b1220]" />

        {/* 2 — geographic grid. The furthest layer, so it barely moves; it is
            what the closer layers are seen to move against. Oversized and
            offset so its own edge cannot travel into view. */}
        <g ref={setLayer[0]}>
          <rect
            x={-40}
            y={-40}
            width={VIEW.w + 80}
            height={VIEW.h + 80}
            fill="url(#km-grid)"
            opacity="0.7"
          />

          {/* Low ground, on the deepest layer so it sits under everything and
              barely moves — ground should not parallax like a road. */}
          {TERRAIN.map((d, i) => (
            <path
              key={`terrain-${i}`}
              d={d}
              className="fill-[#e6edf6] dark:fill-[#101c2e]"
              opacity="0.5"
            />
          ))}

          {/* Upazila divisions. Dashed hairlines, the faintest strokes here. */}
          {BOUNDARIES.map((d, i) => (
            <path
              key={`bound-${i}`}
              d={d}
              fill="none"
              strokeWidth="1"
              strokeDasharray="2 9"
              className="stroke-[#a9b8cc] dark:stroke-[#2b3a51]"
              opacity="0.55"
            />
          ))}
        </g>

        {/* 3 — urban blocks: density around the three larger towns */}
        <g ref={setLayer[1]} className="fill-[#dbe3ee] dark:fill-[#16233a]">
          {PLACES.flatMap((p, i) =>
            // A deterministic scatter — same seed, same blocks, every render.
            Array.from({ length: 5 }, (_, k) => {
              const seed = i * 7 + k * 13
              const w = 22 + ((seed * 11) % 26)
              const h = 14 + ((seed * 7) % 18)
              return (
                <rect
                  key={`${p.id}-${k}`}
                  x={p.x + (((seed * 17) % 120) - 60)}
                  y={p.y + (((seed * 23) % 90) - 45)}
                  width={w}
                  height={h}
                  rx="2"
                  opacity={0.55}
                />
              )
            }),
          )}

          {/* Smaller blocks around the minor settlements. Same deterministic
              scatter, two-thirds the size and half the opacity, so density
              falls off away from the towns the way it actually does. */}
          {MINOR.flatMap((m, i) =>
            Array.from({ length: 3 }, (_, k) => {
              const seed = i * 11 + k * 19
              return (
                <rect
                  key={`minor-block-${i}-${k}`}
                  x={m.at.x + (((seed * 13) % 74) - 37)}
                  y={m.at.y + (((seed * 29) % 56) - 28)}
                  width={12 + ((seed * 7) % 16)}
                  height={9 + ((seed * 5) % 12)}
                  rx="1.5"
                  opacity={0.3}
                />
              )
            }),
          )}
        </g>

        {/* 4 — river: the Padma along the north-west, the Gorai to the south-east */}
        <g ref={setLayer[2]} fill="none" strokeLinecap="round">
          <path
            d="M -40 150 C 180 96, 330 128, 470 212 S 690 300, 860 268 S 1120 214, 1260 246"
            strokeWidth="26"
            className="stroke-[#bcd7ee] dark:stroke-[#12405c]"
            opacity="0.75"
          />
          <path
            d="M -40 150 C 180 96, 330 128, 470 212 S 690 300, 860 268 S 1120 214, 1260 246"
            strokeWidth="10"
            className="stroke-[#8fc0e6] dark:stroke-[#1d6f96]"
            opacity="0.6"
          />
          <path
            d="M 700 400 C 790 470, 900 520, 1010 566 S 1180 640, 1250 700"
            strokeWidth="14"
            className="stroke-[#bcd7ee] dark:stroke-[#12405c]"
            opacity="0.6"
          />

          {/* Tributaries. Same hue as the channels they feed, a fifth of the
              width, so the water reads as a system rather than two stripes. */}
          {TRIBUTARIES.map((d, i) => (
            <path
              key={`trib-${i}`}
              d={d}
              strokeWidth="4"
              className="stroke-[#bcd7ee] dark:stroke-[#12405c]"
              opacity="0.5"
            />
          ))}
        </g>

        {/* 5 — roads, in hierarchy order: lanes, then local roads, then trunk.
               Painted lowest-first so the trunk network stays on top of its own
               feeders, which is what makes the hierarchy legible rather than
               just thinner. */}
        <g ref={setLayer[3]} fill="none" strokeLinecap="round">
          {LANES.map((d, i) => (
            <path
              key={`lane-${i}`}
              d={d}
              strokeWidth="1"
              className="stroke-[#cfd8e4] dark:stroke-[#22334c]"
              opacity="0.45"
            />
          ))}

          {MINOR_ROADS.map((d, i) => (
            <path
              key={`minor-road-${i}`}
              d={d}
              strokeWidth="2.5"
              className="stroke-[#cfd8e4] dark:stroke-[#22334c]"
              opacity="0.8"
            />
          ))}

          {ROADS.map((d, i) => (
            <path
              key={i}
              d={d}
              strokeWidth="7"
              className="stroke-[#cfd8e4] dark:stroke-[#22334c]"
            />
          ))}
          {ROADS.map((d, i) => (
            <path
              key={`inner-${i}`}
              d={d}
              strokeWidth="2.5"
              className="stroke-[#e8eef6] dark:stroke-[#31465f]"
            />
          ))}
        </g>

        {/* 6 — secondary routes */}
        <g ref={setLayer[4]} fill="none" strokeLinecap="round">
          {ROUTES.map((d, i) => (
            <path
              key={i}
              d={d}
              strokeWidth="2.5"
              strokeDasharray="10 12"
              className="stroke-[#93b4d8] dark:stroke-[#2f6ea0]"
              opacity="0.85"
            />
          ))}
        </g>

        {/* 7 — the focus light, travelling the journey.

            This replaced two fixed pools of light, one over Sadar and one over
            Bheramara. They were pinned to the artwork, so wherever the crop and
            the parallax happened to put them they sat there for the life of the
            page — and on a wide screen the Sadar one settled into the right of
            the frame and read as a glow stuck in the corner rather than as
            anything to do with the map.

            One light now, and it belongs to the geography: it walks Daulatpur →
            Bheramara → Mirpur → Kushtia Sadar → Kumarkhali → Khoksa along the
            same Bézier curves the trunk roads are drawn from, positioned by how
            far down the page the reader is.

            Two nested groups because each carries a different transform and an
            element only has one. The outer is the parallax layer, written by
            the shared loop with every other layer at `DEPTH.glow`, so the light
            drifts with the map and stays in register with the roads under it.
            The inner is the journey position. Composing them by nesting is what
            keeps both on the compositor. */}
        <g ref={setLayer[5]}>
          <g ref={focusRef}>
            <circle r={FOCUS_RADIUS} fill="url(#km-focus)" />
          </g>
        </g>

        {/* 8 — markers and labels.
            Held at 0.8 so place names read as part of the backdrop rather than
            competing with the hero copy sitting over them. */}
        <g ref={setLayer[6]} opacity="0.8">
          {/* Junctions, drawn before the settlements so a node sits over its
              own road joint rather than under it. */}
          {JUNCTIONS.map((j, i) => (
            <circle
              key={`junction-${i}`}
              cx={j.x}
              cy={j.y}
              r="2.5"
              className="fill-[#9db3cc] dark:fill-[#3d5372]"
              opacity="0.7"
            />
          ))}

          {/* Minor settlements. Roughly half the node and 60% the label of a
              town, and dimmer — the six upazila seats have to stay readable as
              the primary tier at a glance. */}
          {MINOR.map((m) => (
            <g key={m.name.en}>
              <circle
                cx={m.at.x}
                cy={m.at.y}
                r="3.5"
                className="fill-[#9db3cc] dark:fill-[#3d5372]"
              />
              <circle
                cx={m.at.x}
                cy={m.at.y}
                r="1.5"
                className="fill-[#ffffff] dark:fill-[#0b1220]"
              />
              <text
                x={m.at.x}
                y={m.at.y - 9}
                textAnchor="middle"
                className="text-[10px] font-semibold tracking-wide fill-[#8ba0b8] dark:fill-[#4a627f]"
              >
                {L(m.name)}
              </text>
            </g>
          ))}

          {PLACES.map((p) => {
            const isSadar = p.id === 'kushtia-sadar'
            return (
              <g key={p.id}>
                {isSadar && (
                  <circle
                    ref={isSadar ? pulseRef : undefined}
                    cx={p.x}
                    cy={p.y}
                    r="26"
                    className="fill-primary/20 animate-pulse-ring"
                  />
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isSadar ? 11 : 7}
                  className={
                    isSadar
                      ? 'fill-primary'
                      : 'fill-[#7ea6d4] dark:fill-[#4b87c4]'
                  }
                />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isSadar ? 4.5 : 3}
                  className="fill-[#ffffff] dark:fill-[#0b1220]"
                />
                <text
                  x={p.x}
                  y={p.y - (isSadar ? 24 : 18)}
                  textAnchor="middle"
                  className={cn(
                    'text-[17px] font-bold tracking-wide',
                    isSadar
                      ? 'fill-[#1f4d80] dark:fill-[#9ec9f0]'
                      : 'fill-[#5b7794] dark:fill-[#5f81a8]',
                  )}
                >
                  {L(p.name)}
                </text>
              </g>
            )
          })}
        </g>

        {/* 9 — readability veil, so hero copy sits on calm ground */}
        <rect width={VIEW.w} height={VIEW.h} fill="url(#km-veil)" />
      </svg>
    </div>
  )
}

/**
 * Memoised, because it lives in the app shell.
 *
 * `AppShell` re-renders on every navigation, and without this the whole SVG
 * would be rebuilt each time somebody moved between Healthcare and Rentals —
 * for a backdrop whose only prop is a constant class string and whose content
 * does not depend on the route at all. The one thing that legitimately changes
 * it is the language, and `useI18n` inside still drives that.
 */
export const KushtiaMap = memo(KushtiaMapImpl)
