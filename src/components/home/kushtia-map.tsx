import { memo, useEffect, useMemo, useRef } from 'react'
import { AREA_MAP } from '@/data/categories'
import type { AreaId } from '@/data/types'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useI18n } from '@/lib/i18n'
import { useReducedMotion } from '@/lib/motion'
import { onScrollFrame } from '@/lib/scroll'
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
 * Five planes at increasing depth — the far field, settlement and water, the
 * road network, the focus light and the labels — offset by both pointer
 * position and scroll position, each scaled by its own travel. The far field
 * barely moves; the labels move about three and a half times as far.
 *
 * Each plane is an absolutely-positioned HTML div holding one `<svg>`, and the
 * transform goes on the div rather than on a group inside the artwork. That
 * distinction is the whole performance story and it is written out in full
 * above `LAYERS` further down: an HTML element can be handed its own compositor
 * layer and moved, an SVG `<g>` cannot and has to be re-rasterised instead.
 *
 * The scroll half is a proportion of the *document*, not a distance, so the
 * backdrop keeps moving on the last screen of a long page as well as the first
 * — it is one continuous geographic surface under the whole site, and it should
 * behave like one.
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

/* ==========================================================================
 * THE PARALLAX, AND THE THREE THINGS THAT WERE WRONG WITH IT
 *
 * The choreography here is the one that was always intended — layers at
 * different depths, offset by scroll and pointer, combined into one transform.
 * What changed is where the transform lands and how far it runs.
 *
 * 1. IT USED TO STOP AFTER THE FIRST SCREEN AND A HALF.
 *
 * The scroll contribution was `min(scrollY, 1400) / 1400`. Past 1400px the
 * numerator stopped growing, so every layer froze and stayed frozen. The home
 * page is several times that tall, so for most of the scroll there was no
 * parallax at all — which is exactly why the effect read as "too subtle". It
 * was not subtle, it was absent for the majority of the page.
 *
 * The clamp existed for a real reason: an unbounded rate would slide the labels
 * clear of the markers they belong to on a long page. The fix is to bound the
 * *total travel* instead of the *scroll distance*. Progress is now the whole
 * document, 0 to 1, mapped onto a fixed per-layer travel in pixels. A layer
 * moves the same total distance whether the page is three screens or thirty,
 * and it is still moving on the last screen — which is the "continuous
 * geographic environment" the backdrop is supposed to be.
 *
 * 2. THE TRANSFORM WAS ON AN SVG GROUP, WHICH IS NOT COMPOSITED.
 *
 * This is the mobile stutter, and it is a property of SVG rather than of this
 * code. A transform on an HTML element with `will-change: transform` gets its
 * own compositor layer: the browser rasterises it once and then *moves* it, and
 * the move costs nothing on the main thread. A transform on an SVG `<g>` cannot
 * be handed a layer. The browser has to re-rasterise the region the group
 * covers — and these groups cover a `fixed inset-0` backdrop, so every write
 * re-rastered the entire viewport, at device pixel ratio 3 on a phone.
 *
 * The previous fix for that was to write less often (`writeStep` quantised the
 * writes to roughly one frame in four on a phone). That treats the symptom: it
 * makes the motion coarse in order to make it affordable, so the parallax got
 * choppier on exactly the devices where it was already worst.
 *
 * The artwork is now split across a small number of absolutely-positioned HTML
 * layers, one `<svg>` each, sharing a viewBox and `preserveAspectRatio` so they
 * register pixel-exactly. The transform goes on the div. Nothing re-rasterises,
 * the quantisation is gone, and every frame moves.
 *
 * 3. TWO EASES IN SERIES READ AS LAG, NOT AS SMOOTHNESS.
 *
 * lib/scroll.ts already hands out a scroll position eased on a 55ms half-life.
 * This file then eased that value again on a 70ms half-life before writing it.
 * Composing two exponential eases does not give a smoother curve, it gives a
 * slower one with a soft start — the backdrop set off late and arrived late, and
 * on a wheel, where input is a few large discrete notches, late reads as stiff.
 *
 * There is one ease now and it is upstream, shared by every scroll-linked layer
 * on the site. The pointer keeps an ease of its own because nothing eases it
 * first, and it is two numbers rather than a document position.
 *
 * WHY NOT A SMOOTH-SCROLL ENGINE. Because the page must not wait for
 * JavaScript — see the note at the top of lib/scroll.ts and the two commits
 * that added Lenis and then took it out again with measurements. The scroll
 * stays the browser's. What is eased here is the backdrop, and a backdrop that
 * glides while the page moves crisply is what actually reads as fluid.
 * ========================================================================== */

/**
 * The layers, back to front, and how far each travels.
 *
 * `travel` is the total vertical distance in CSS pixels the layer moves across
 * the *entire* document, and it is the whole depth vocabulary: the far layer
 * barely shifts, the labels move about three and a half times as far, and the
 * eye reads the difference between them as distance. Layers rise as the page is
 * scrolled down, lagging the content, which is what puts them behind it.
 *
 * These are pixels rather than the old unit-less depth multipliers because the
 * transform now lands on an HTML element instead of inside the SVG's user
 * space, so a number here is the number of pixels that actually appear.
 *
 * `point` is the maximum pointer displacement at the very edge of the viewport,
 * also in pixels. Deliberately an order of magnitude smaller than `travel`: the
 * pointer is meant to give the backdrop a little life as the cursor crosses it,
 * not to let the reader drag the district around.
 *
 * Paint order is NOT depth order — the focus light is painted above the roads
 * so it lights them, but it sits at a middle travel so it drifts with the
 * geography it is lighting rather than with the labels.
 */
const LAYERS = [
  { key: 'far', travel: 34, point: 3 },
  { key: 'mid', travel: 58, point: 6 },
  { key: 'near', travel: 88, point: 9 },
  { key: 'glow', travel: 70, point: 7 },
  { key: 'top', travel: 120, point: 13 },
] as const

/* ==========================================================================
 * THE MARGIN, AND WHY IT IS NOT SIMPLY AN OVERSIZED BOX
 *
 * A layer that translates has to have artwork past the edge of the screen or
 * its own edge scrolls into view. The obvious way to buy that is to make the
 * element bigger than the viewport — `inset: -6%` and be done.
 *
 * It does not work here, and the reason is `preserveAspectRatio="slice"`.
 * Slice scales the artwork to *cover* its box: `max(boxW / viewBoxW, boxH /
 * viewBoxH)`. Grow the box and the scale grows with it, so an oversized
 * container does not reveal more map — it magnifies the same map and crops
 * harder. A first cut at this used a 160px inset and silently zoomed the
 * district by a third, which is a redesign of the composition rather than a
 * margin.
 *
 * The viewBox has to grow by the same ratio as the box. Then the two changes
 * cancel in the scale expression exactly:
 *
 *     max(1.12 W / 1344, 1.12 H / 784)  ==  max(W / 1200, H / 700)
 *
 * and because the padded viewBox keeps the same centre — (600, 350) before and
 * after — the framing is pixel-identical to what it was, with 6% of the
 * viewport's worth of extra artwork on every side to translate into.
 *
 * WHAT THE MARGIN ACTUALLY HAS TO COVER is smaller than it looks. Only the far
 * layer carries a full-bleed fill (the grid); settlement, water, roads, the
 * light and the labels are all sparse artwork, where a translation moves marks
 * around and there is no edge to expose. So the number to beat is the far
 * layer's own travel — 34px plus 3px of pointer — not the 120px the labels
 * travel. 6% of the shortest desktop viewport this runs on is ~46px, and the
 * container underneath is painted in the field colour regardless, so nothing
 * can show through even if a layer did run out.
 * ========================================================================== */

const PAD = 0.06

const VIEW_BOX = [
  -VIEW.w * PAD,
  -VIEW.h * PAD,
  VIEW.w * (1 + PAD * 2),
  VIEW.h * (1 + PAD * 2),
].join(' ')

/**
 * How much of the parallax this viewport gets.
 *
 * Same tiering as `useDepth` in lib/parallax.ts and the same reasoning: the
 * distances above are authored against a desktop stage, and replaying them at
 * full strength on a 360px screen slides the labels further across the artwork
 * than the composition wants. Every layer is scaled by the same number, so the
 * ratios between them — which is the part the eye reads as depth — are
 * untouched. Kept here rather than imported because this runs inside an effect,
 * not a render.
 */
function depthTier(): number {
  if (typeof window === 'undefined' || !window.matchMedia) return 1
  if (window.matchMedia('(min-width: 1024px)').matches) return 1
  if (window.matchMedia('(min-width: 768px)').matches) return 0.6
  /*
   * A phone gets a fifth, not the third it used to.
   *
   * At 0.36 the stage travelled the mid layer's 58px times the tier — about
   * 21px across the whole document. That is more travel than a 6-inch screen
   * needs to read as depth, and every pixel of it is extra area the compositor
   * has to cover as the oversized stage moves under the viewport. 0.2 puts it
   * near 12px, which is inside the range the backdrop is meant to sit in and
   * still plainly visible against content that is moving a whole screen.
   *
   * This is the map's tier only. lib/parallax.ts keeps its own for the section
   * layers, deliberately: those were measured with `will-change` and found to
   * be *faster* promoted, so quietly shrinking them here would be changing
   * something that was already tuned against real numbers.
   */
  return 0.2
}

/**
 * How quickly the pointer tilt catches the cursor, as the time for the
 * remaining distance to halve.
 *
 * Only the pointer. The scroll position arrives from lib/scroll.ts already
 * eased and is written straight through — easing it twice is what made the
 * backdrop feel like it was dragging behind the wheel.
 */
const POINTER_HALF_LIFE_MS = 90

/** Below a twentieth of a pixel there is nothing left to draw. */
const SETTLED_PX = 0.05

/**
 * The same threshold expressed in the pointer's own units, which are not
 * pixels.
 *
 * `pointer` and `eased` hold a normalised position, -1 to 1 from the centre of
 * the viewport; what reaches the screen is that number times a layer's `point`
 * value. Comparing the normalised figure directly against a pixel constant is a
 * unit error, and it is not a harmless one — at the deepest layer's 13px it
 * made the write threshold about two thirds of a pixel, so the pointer parallax
 * advanced in visible steps instead of gliding.
 *
 * Dividing by the largest `point` converts the pixel budget into the units
 * actually being compared. It uses the largest rather than each layer's own so
 * there is a single threshold for the whole write — and erring toward the
 * deepest layer errs toward painting slightly more often, which is the safe
 * direction. `tier` only ever scales this down, so ignoring it here keeps the
 * threshold conservative at every breakpoint.
 */
const POINTER_EPSILON = SETTLED_PX / Math.max(...LAYERS.map((l) => l.point))

/* ==========================================================================
 * SCROLL VELOCITY
 *
 * How hard the reader is scrolling, and the two things it changes: the map
 * leans a little further in the direction of travel, and the focus light comes
 * up slightly. Both settle back the moment scrolling stops.
 *
 * IT COSTS NO NEW INPUT. Velocity is the frame-over-frame change in the
 * progress value the loop already has, divided by the frame's own elapsed time.
 * There is no wheel listener, no touch listener and no second subscription —
 * adding one would be a second opinion about the scroll position, and this file
 * is deliberately downstream of lib/scroll.ts's single answer.
 *
 * IT DECAYS BY CONSTRUCTION, which is what makes "settles when scrolling stops"
 * fall out rather than needing a timer. When the reader stops, `progress` stops
 * changing, the measured velocity is zero, and the ease walks the smoothed
 * value down to zero on its own. Nothing has to detect the end of a gesture.
 * ========================================================================== */

/**
 * The velocity treated as "full tilt", in fractions of the document per second.
 *
 * A brisk wheel scroll on the home page moves through a few percent of the
 * document in a frame; 0.35/sec is a hard flick. Everything above it clamps, so
 * a trackpad slam and a scrollbar drag produce the same maximum lean instead of
 * launching the artwork off the screen — which is the "never allow runaway
 * transforms" the brief asks for, expressed as a ceiling rather than a check.
 */
const VELOCITY_FULL = 0.35

/**
 * How quickly the smoothed velocity catches the measured one.
 *
 * Slower than the pointer and much slower than the scroll itself. Velocity is
 * the noisiest signal on the page — one long frame doubles it — and a lean that
 * tracked it exactly would flicker. At 160ms a flick takes about a third of a
 * second to reach full lean and about as long to let go, which reads as weight.
 */
const VELOCITY_HALF_LIFE_MS = 160

/**
 * How far the deepest layer leans at full velocity, in pixels.
 *
 * Small on purpose, and deliberately less than a sixth of that layer's scroll
 * travel: this is a lean, not a second parallax. Shallower layers take a
 * proportion of it via their own travel, so the lean keeps the depth ordering
 * the rest of the system already establishes instead of inventing a new one.
 */
const VELOCITY_PULL = 16

/** The deepest travel, used to distribute the lean across the layers. */
const DEEPEST_TRAVEL = Math.max(...LAYERS.map((l) => l.travel))

/**
 * The focus light's resting and full-tilt opacity.
 *
 * The brief asks for "soft ambient light" that lifts while the reader is moving
 * and softens when they stop, and explicitly not for a neon glow. So the light
 * *rests* dimmed and returns to its authored strength under motion, rather than
 * over-brightening past it — the gradient's own alpha stays the ceiling, and
 * scrolling can only ever restore it, never exceed it.
 */
const GLOW_RESTING = 0.74
const GLOW_ACTIVE = 1

/** Which layer the light is, for the one opacity write below. */
const GLOW_LAYER = LAYERS.findIndex((l) => l.key === 'glow')

/**
 * How the map is being used, which is the only thing that differs between its
 * two homes.
 *
 * 'backdrop' — behind the public site. Motion comes from the reader: pointer
 *              tilt and scroll position, exactly as it always has.
 *
 * 'panel'    — the left half of the contributor entrance. There is no scroll
 *              there and often no pointer over it, so the same layers are
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
 * and the composition never returns to a pose you just watched. At these
 * periods a full traverse takes over a minute, which reads as continuous travel
 * rather than as something swinging back and forth, and it has no reset point
 * at all because a sine has nowhere to jump.
 *
 * X and Y run on different periods so a layer traces a slow Lissajous rather
 * than a diagonal line.
 */
const DRIFT_SECONDS = [67, 59, 53, 47, 43] as const

/** A fraction of the layer's scroll travel, so the drift keeps the same depth
 *  ordering the backdrop has rather than inventing a second one. */
const DRIFT_RATIO = 0.28

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
  const stageRef = useRef<HTMLDivElement>(null)
  const layerRefs = useRef<(HTMLDivElement | null)[]>([])
  const focusRef = useRef<SVGGElement | null>(null)

  const panel = variant === 'panel'

  /*
   * Whether the layers move independently or as one sheet.
   *
   * THIS IS THE MOBILE SCROLL BUDGET, AND IT IS ABOUT FILL RATE RATHER THAN
   * ABOUT THE TRANSFORMS.
   *
   * Promoting the five layers is what makes the transforms free, but it also
   * asks the compositor to hold five full-viewport textures and blend all five
   * every frame. On a phone at device pixel ratio 3 that is both real memory
   * and real overdraw, on the weakest GPU the site runs on — and it buys depth
   * separation measured in a few tens of pixels, on the screen where the
   * separation is scaled down to 0.36 anyway and hardest to see.
   *
   * So a phone moves the whole stage as a single promoted layer: one texture,
   * one transform, no overdraw beyond what the artwork already costs, and the
   * map still drifts against the content. Tablets and desktops, which have the
   * fill rate to spare and the screen size to show the effect, get the real
   * thing.
   *
   * A hook rather than a `matchMedia` read inside the effect, so crossing the
   * breakpoint tears the old configuration down and builds the new one through
   * React's own cleanup instead of leaving a half-configured loop behind.
   */
  const layered = useMediaQuery('(min-width: 768px)')

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

      // Five writes, no reads. Every one lands on a promoted HTML layer, so
      // this is five compositor moves rather than five rasterisations.
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]
        if (!node) continue
        const amp = LAYERS[i].travel * DRIFT_RATIO
        const x = Math.sin((t / DRIFT_SECONDS[i]) * Math.PI * 2) * amp
        const y = Math.sin((t / (DRIFT_SECONDS[i] * 1.37)) * Math.PI * 2 + i) * amp * 0.55
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
     * It does not start until the browser is idle, it stops when the panel is
     * off-screen, and it stops when the tab is hidden. The login form is
     * interactive first; the map arrives a moment later and nobody is waiting
     * on it.
     *
     * `base` is re-stamped when the loop actually begins rather than at mount,
     * so a deferred or paused start does not make the light jump to wherever
     * the clock had wandered while nothing was drawing.
     */
    let running = false
    let visible = false

    function play() {
      if (running || !visible || document.visibilityState !== 'visible') return
      running = true
      // Hinted only while something is actually moving. Five promoted layers
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
    // The backdrop's own driver. Untouched in spirit, and inert in the panel
    // variant.
    if (panel) return

    // Through the project's seam, not `matchMedia` directly.
    //
    // `lib/motion.ts` is the site's single answer on reduced motion, and it
    // exists precisely so no component holds a second opinion. Flipping that
    // one function turns this off along with everything else.
    if (reduced) return

    const nodes = layerRefs.current
    const stage = stageRef.current
    // Which elements this run actually drives. On a phone that is the single
    // stage; everywhere else it is the five layers. One array either way, so
    // the loop below has no branch in it.
    const driven: (HTMLElement | null)[] = layered ? nodes : [stage]
    if (!driven.length) return

    // Not a motion preference but a capability check, so it stays local: a
    // coarse pointer has no hover position to track, and the listener would
    // cost work and never move anything. Scroll still applies on touch.
    //
    // Both halves are required, and `hover` is the one that matters. A laptop
    // with a touchscreen reports `pointer: fine` for its trackpad, and so does
    // a phone the moment a stylus or a mouse is paired — `pointer: fine` alone
    // would attach a mousemove listener on hardware that has no hovering
    // cursor to follow. `hover: hover` is the feature that actually asks
    // whether the primary input can rest over the page without committing to a
    // press, which is exactly the thing this parallax reads.
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches

    /*
     * How far through the document the reader is, 0 to 1. The one number the
     * whole backdrop is a function of.
     *
     * This replaced a clamp at 1400px of scroll — see the note above `LAYERS`.
     * Because it is a proportion rather than a distance, the travel below is
     * bounded no matter how long the page is, while still running the entire
     * length of it.
     */
    let progress = 0

    /**
     * The smoothed, clamped scroll velocity, -1 to 1.
     *
     * Negative is scrolling up and positive is scrolling down, so the lean in
     * `paint` reverses on its own when the reader turns around — there is no
     * direction flag anywhere, and therefore nothing that can be left pointing
     * the wrong way at the moment the gesture changes.
     */
    let velocity = 0
    /** Where `progress` was on the previous frame, to difference against. */
    let lastProgress = 0

    /*
     * The pointer, tracked separately and eased on its own, because it arrives
     * from a different event and has to be able to change without discarding
     * the scroll contribution. The two are added at the point of writing — one
     * transform per layer, never two systems writing the same element.
     */
    const pointer = { x: 0, y: 0 }
    const eased = { x: 0, y: 0 }

    /*
     * How far the document can scroll, and the tier that depends on the
     * viewport. Both read here and on resize rather than per frame.
     *
     * `scrollHeight` in particular is a forced synchronous layout — the browser
     * cannot answer it without first flushing pending style and layout work —
     * and reading it inside the scroll path is the most expensive place to ask.
     * Pages do grow as cards load, so a ResizeObserver on the document element
     * refreshes it when the height actually changes rather than on the chance
     * that it might have.
     */
    let scrollLength = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
    let tier = depthTier()

    /*
     * The element's box, measured once and on resize rather than per event.
     *
     * Reading `getBoundingClientRect()` inside a `mousemove` handler is a
     * forced synchronous layout, and on an element that covers the whole
     * viewport that is the most expensive question you can ask at the highest
     * frequency you can ask it. This element is `fixed inset-0`, so the answer
     * only changes when the viewport does.
     */
    let box = ref.current?.getBoundingClientRect() ?? null

    /*
     * Resize, coalesced to one frame and skipped when nothing it reads changed.
     *
     * THIS IS A PHONE PROBLEM AND ONLY A PHONE PROBLEM, which is why it is
     * worth the lines. On a desktop `resize` fires while a window is dragged and
     * never during scrolling. On Android and iOS the address bar collapses as
     * you scroll down and returns as you scroll up, and every step of that fires
     * `resize` — in the middle of the gesture. Each one landed here and read
     * `getBoundingClientRect()` and `scrollHeight`: two forced synchronous
     * layouts, at scroll frequency, in the moment the browser has least time to
     * spare. No emulator reproduces it, because no emulator has an address bar
     * that hides.
     *
     * Two guards. The rAF coalesces a burst into one measurement per frame, in
     * the frame's own read phase rather than inside the event. The dimension
     * check is what makes the common case free: the toolbar changes the viewport
     * height, so a height that has genuinely changed still re-measures and the
     * repeated events reporting the same height do not.
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
    let lastDraw = 0

    /** The last position written, so a frame that would change nothing does not
     *  touch the DOM at all. */
    let written = { x: Number.NaN, y: Number.NaN, p: Number.NaN, v: Number.NaN }
    /** The last position written to the focus light, in whole SVG units. */
    let litAt = { x: Number.NaN, y: Number.NaN }

    /*
     * The focus light's position along the journey, held separately from the
     * parallax so it can ease at its own rate — slower, so it drifts rather
     * than tracks, which is what makes it feel like a camera rather than a
     * cursor.
     */
    const focus = { current: 0, target: 0 }

    /** The fraction of a remaining distance to close on a frame of `dt` ms. */
    const ease = (dt: number, halfLife: number) => 1 - Math.pow(2, -dt / halfLife)

    /*
     * The single writer.
     *
     * Scroll and pointer are combined here and nowhere else, so an element
     * never has one system's transform overwritten by another's. On a phone
     * `driven` is the one stage element and it takes the mid layer's travel;
     * everywhere else each layer takes its own.
     */
    function paint() {
      for (let i = 0; i < driven.length; i++) {
        const node = driven[i]
        if (!node) continue
        const layer = layered ? LAYERS[i] : LAYERS[1]
        /*
         * One transform, three contributions, added rather than layered.
         *
         * Pointer tilt, scroll parallax and the velocity lean all resolve into
         * a single `translate3d` per element. Nothing here reads back what it
         * wrote and no second system touches these nodes, so the three can
         * never fight over the same property — which is the failure mode the
         * brief calls out and the one the old React-state version actually had.
         *
         * The lean is scaled by the layer's share of the deepest travel, so it
         * inherits the depth ordering instead of asserting its own.
         */
        const lean = velocity * VELOCITY_PULL * (layer.travel / DEEPEST_TRAVEL) * tier
        const y = eased.y * layer.point * tier - progress * layer.travel * tier - lean
        const x = eased.x * layer.point * tier
        node.style.transform = `translate3d(${x}px, ${y}px, 0)`
      }
    }

    /*
     * The light's strength, written only when it changes by something visible.
     *
     * Separate from `paint` because it is one element and one property, and
     * because on a phone the layers are not individually driven — the stage
     * moves instead — but the light should still respond. Opacity is the right
     * property for it: like transform it stays on the compositor, so this costs
     * nothing beyond the write.
     */
    let litOpacity = Number.NaN

    function glow() {
      const node = nodes[GLOW_LAYER]
      if (!node) return
      const next = GLOW_RESTING + (GLOW_ACTIVE - GLOW_RESTING) * Math.abs(velocity) * tier
      if (Math.abs(next - litOpacity) < 0.01) return
      litOpacity = next
      node.style.opacity = next.toFixed(3)
    }

    function draw(now: number) {
      running = true
      frame = requestAnimationFrame(draw)

      // Clamped: after a long task or a hidden tab this would otherwise be
      // hundreds of milliseconds and the ease would finish in a single step.
      const dt = Math.min(now - lastDraw, 64)
      lastDraw = now

      const dx = pointer.x - eased.x
      const dy = pointer.y - eased.y
      const df = focus.target - focus.current

      /*
       * Velocity, measured from the value the loop already has.
       *
       * `progress` only changes when lib/scroll.ts publishes, so once the
       * reader stops this difference is zero every frame and the ease below
       * walks `velocity` back to rest without anything having to notice that
       * the gesture ended.
       */
      const instant = dt > 0 ? (progress - lastProgress) / (dt / 1000) : 0
      lastProgress = progress
      const clamped = Math.max(-1, Math.min(1, instant / VELOCITY_FULL))
      velocity += (clamped - velocity) * ease(dt, VELOCITY_HALF_LIFE_MS)

      // Comfortably tighter than the write threshold, so the loop always lands
      // its final paint before it decides there is nothing left to do.
      //
      // Velocity is part of the test for the same reason the light is: the
      // parallax can be at rest while the lean is still unwinding, and stopping
      // there would freeze the map mid-lean until the next input.
      const settled =
        Math.abs(dx) < POINTER_EPSILON / 10 &&
        Math.abs(dy) < POINTER_EPSILON / 10 &&
        Math.abs(df) < 0.0004 &&
        Math.abs(velocity) < 0.002 &&
        progress === written.p

      // Nothing left to move. Stop the loop entirely rather than burning a
      // frame forever on a page that is sitting still — the next input calls
      // `wake()` and it picks up where it left off.
      //
      // The light is part of that test: without it the loop could settle the
      // parallax and stop while the light was still mid-journey, freezing it
      // part-way between two towns until the next scroll event.
      if (settled) {
        cancelAnimationFrame(frame)
        running = false
        // Land the lean exactly at rest rather than a thousandth short of it,
        // so the resting pose is the one the design asks for and the next
        // gesture starts from a known zero.
        if (velocity !== 0) {
          velocity = 0
          written = { x: eased.x, y: eased.y, p: progress, v: 0 }
          paint()
          glow()
        }
        for (const node of driven) node?.style.removeProperty('will-change')
        return
      }

      const step = ease(dt, POINTER_HALF_LIFE_MS)
      eased.x += dx * step
      eased.y += dy * step

      // Eases slower than the parallax, so the light lags the page a little and
      // reads as something travelling rather than something pinned to scroll.
      focus.current += df * ease(dt, FOCUS_HALF_LIFE_MS)
      if (focusRef.current) {
        const p = pointOnJourney(focus.current)
        // Rounded to whole units — a third of a CSS pixel on a phone, less on a
        // desktop. The light is a 300-unit gradient and moving it repaints its
        // own layer, so a sub-pixel rewrite is a repaint for nothing.
        const lx = Math.round(p.x)
        const ly = Math.round(p.y)
        if (lx !== litAt.x || ly !== litAt.y) {
          litAt = { x: lx, y: ly }
          focusRef.current.style.transform = `translate3d(${lx}px, ${ly}px, 0)`
        }
      }

      /*
       * Writes, no reads — and only when a write would change something.
       *
       * The quantisation that used to guard this is gone with the reason for
       * it. These transforms land on promoted HTML layers now, so a write is a
       * compositor move rather than a re-rasterisation of the viewport, and
       * there is no longer anything to be gained by moving in visible steps.
       * What remains is the cheap check that the value actually changed.
       */
      if (
        Math.abs(eased.x - written.x) >= POINTER_EPSILON ||
        Math.abs(eased.y - written.y) >= POINTER_EPSILON ||
        // A hundredth of full velocity is ~0.16px of lean on the deepest layer.
        Math.abs(velocity - written.v) >= 0.01 ||
        progress !== written.p
      ) {
        written = { x: eased.x, y: eased.y, p: progress, v: velocity }
        paint()
      }

      glow()
    }

    function wake() {
      if (running) return
      // Stamped here rather than inside `draw`, so the first frame after an idle
      // period measures its own length instead of the length of the idle period
      // — which would otherwise collapse the whole remaining distance in one
      // step and show up as a jump.
      lastDraw = performance.now()
      // Hinted only while something is actually moving. A permanent
      // `will-change: transform` on five full-viewport layers asks the
      // compositor to hold five textures for the life of the page, which costs
      // memory on exactly the low-end phones this is meant to feel smooth on.
      for (const node of driven) node?.style.setProperty('will-change', 'transform')
      frame = requestAnimationFrame(draw)
    }

    function progressAt(scrollY: number): number {
      if (scrollLength <= 0) return 0
      return Math.min(Math.max(scrollY / scrollLength, 0), 1)
    }

    function onMove(event: MouseEvent) {
      if (!box) return
      // -1..1 from the centre, so the shift is symmetric.
      pointer.x = ((event.clientX - box.left) / box.width - 0.5) * 2
      pointer.y = ((event.clientY - box.top) / box.height - 0.5) * 2
      wake()
    }

    // Through the shared loop rather than its own listener — see lib/scroll.ts.
    // The value arrives already eased and already batched to one frame, so this
    // never recomputes more often than it can paint, and it is written straight
    // through rather than eased a second time.
    const unsubscribe = onScrollFrame((scrollY) => {
      progress = progressAt(scrollY)
      focus.target = progress
      wake()
    })

    // Seeded and painted once, before any frame runs. The loop only writes
    // while something is moving, and at the top of a restored page nothing is —
    // without this the layers keep `transform: none` and the light sits at the
    // viewBox origin until the reader happens to scroll.
    focus.current = focus.target
    eased.x = pointer.x
    eased.y = pointer.y
    /*
     * Seeded, and this line is load-bearing on a restored page.
     *
     * `lastProgress` starts at 0, so without this the first frame differences
     * the restored position against the top of the document and measures a
     * velocity of the entire page in one frame — which clamps to full tilt and
     * shows up as the map lurching sideways the instant a deep-linked or
     * reloaded page settles. Starting it level means the first measured
     * velocity is zero, which is the truth: nobody has scrolled yet.
     */
    lastProgress = progress
    written = { x: eased.x, y: eased.y, p: progress, v: velocity }
    paint()
    glow()
    if (focusRef.current) {
      const p = pointOnJourney(focus.current)
      litAt = { x: Math.round(p.x), y: Math.round(p.y) }
      focusRef.current.style.transform = `translate3d(${litAt.x}px, ${litAt.y}px, 0)`
    }

    /*
     * A hidden tab delivers no frames. Stopping on the way out means a
     * backgrounded ELAKAI is not holding promoted compositor layers, and
     * re-measuring on the way in means it does not snap when it comes back.
     */
    function onVisibility() {
      if (document.visibilityState === 'visible') {
        remeasure()
        wake()
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
      // Never leave the hint behind on an unmount mid-animation, and never
      // leave a stale transform on an element this run was driving — crossing
      // the breakpoint changes which element that is, and the one being
      // abandoned has to go back to rest or its offset is frozen in.
      for (const node of driven) {
        node?.style.removeProperty('will-change')
        node?.style.removeProperty('transform')
      }
      // The light's dimmed resting state belongs to this run. Someone turning
      // reduced motion on mid-session tears the effect down and gets no further
      // frames, so without this the glow would stay held at its scrolling
      // resting value forever instead of returning to full authored strength.
      nodes[GLOW_LAYER]?.style.removeProperty('opacity')
    }
  }, [reduced, panel, layered])

  /**
   * Assigns each layer div its slot in `layerRefs`.
   *
   * Index-based rather than named, so the loop above can walk `LAYERS` and the
   * refs in lockstep without a lookup per frame.
   */
  const setLayer = useMemo(
    () =>
      LAYERS.map((_, i) => (node: HTMLDivElement | null) => {
        layerRefs.current[i] = node
      }),
    [],
  )

  return (
    /*
     * The field colour lives on the container rather than on a rect inside the
     * artwork, so there is always an opaque floor under every layer. Whatever
     * the parallax does, the reader can never see through the backdrop to the
     * page background — which is the failure the oversize below is the first
     * line of defence against and this is the last.
     */
    <div
      ref={ref}
      aria-hidden="true"
      className={cn(
        'pointer-events-none overflow-hidden bg-[#f4f7fb] dark:bg-[#0b1220]',
        className,
      )}
    >
      {/*
        The moving stage.

        Oversized by exactly the ratio `VIEW_BOX` is padded by, which is what
        makes the margin free rather than a zoom — see the note above `PAD`. The
        two have to be changed together or the composition reframes.

        On a phone this element is the one that moves; everywhere else it is a
        static frame and the layers inside it move. Either way it is the only
        element carrying the oversize, so the layers stay `inset-0` against it
        and register with each other exactly.
      */}
      <div ref={stageRef} className="absolute inset-[-6%]">
        {/* 1 — the far field: grid, low ground and the upazila divisions.
            The furthest layer, so it moves least; it is what the closer layers
            are seen to move against. */}
        <div ref={setLayer[0]} className="absolute inset-0">
          <svg
            viewBox={VIEW_BOX}
            preserveAspectRatio="xMidYMid slice"
            className="size-full"
            role="presentation"
            focusable="false"
          >
            <defs>
              <pattern id="km-grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path
                  d="M 60 0 L 0 0 0 60"
                  fill="none"
                  strokeWidth="1"
                  className="stroke-[#d4dce7] dark:stroke-[#1d2a3d]"
                />
              </pattern>
            </defs>

            {/* The one full-bleed fill in the whole backdrop, and therefore the
                one thing with an edge that could travel into view. Drawn well
                past the padded viewBox on every side so it cannot: the layer
                itself moves 34px at most, and this clears that several times
                over at every viewport the site runs at. */}
            <rect
              x={-VIEW.w * 0.2}
              y={-VIEW.h * 0.2}
              width={VIEW.w * 1.4}
              height={VIEW.h * 1.4}
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
          </svg>
        </div>

        {/* 2 — settlement density and the water.
            Urban blocks and the two river systems sat three depth units apart
            before this split and share one layer now: three units out of a
            hundred was never a separation anyone could see, and it is a whole
            compositor texture saved on every device. */}
        <div ref={setLayer[1]} className="absolute inset-0">
          <svg
            viewBox={VIEW_BOX}
            preserveAspectRatio="xMidYMid slice"
            className="size-full"
            role="presentation"
            focusable="false"
          >
            <g className="fill-[#dbe3ee] dark:fill-[#16233a]">
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

            {/* The Padma along the north-west, the Gorai to the south-east. */}
            <g fill="none" strokeLinecap="round">
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
          </svg>
        </div>

        {/* 3 — the road network, in hierarchy order: lanes, then local roads,
               then trunk, then the dashed secondary routes. Painted
               lowest-first so the trunk network stays on top of its own
               feeders, which is what makes the hierarchy legible rather than
               just thinner. */}
        <div ref={setLayer[2]} className="absolute inset-0">
          <svg
            viewBox={VIEW_BOX}
            preserveAspectRatio="xMidYMid slice"
            className="size-full"
            role="presentation"
            focusable="false"
          >
            <g fill="none" strokeLinecap="round">
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

              {ROUTES.map((d, i) => (
                <path
                  key={`route-${i}`}
                  d={d}
                  strokeWidth="2.5"
                  strokeDasharray="10 12"
                  className="stroke-[#93b4d8] dark:stroke-[#2f6ea0]"
                  opacity="0.85"
                />
              ))}
            </g>
          </svg>
        </div>

        {/* 4 — the focus light, travelling the journey.

            It walks Daulatpur → Bheramara → Mirpur → Kushtia Sadar →
            Kumarkhali → Khoksa along the same Bézier curves the trunk roads are
            drawn from, positioned by how far down the page the reader is.

            Its own layer, and that is the point. The light moves every frame
            the page is scrolling, and while it lived inside the one big SVG
            every step of its journey invalidated the raster of the entire map.
            Alone on a layer that holds nothing but a gradient, it repaints only
            itself.

            Two nested elements because each carries a different transform and
            an element only has one. The div is the parallax plane, written by
            the shared loop with every other layer, so the light drifts with the
            map and stays in register with the roads under it. The inner group
            is the journey position. Composing them by nesting is what keeps the
            parallax half on the compositor. */}
        <div ref={setLayer[3]} className="absolute inset-0">
          <svg
            viewBox={VIEW_BOX}
            preserveAspectRatio="xMidYMid slice"
            className="size-full"
            role="presentation"
            focusable="false"
          >
            <defs>
              {/* Three stops rather than two, and the middle one carries most of
                  the work: a straight centre-to-edge fade has a visible bright
                  core and reads as a ball. Dropping to a third of the opacity by
                  40% and then trailing to nothing spreads the light over its
                  whole radius, which is what makes it read as an area being lit
                  instead. Dark mode is allowed to be a little stronger — the
                  same alpha over a navy field is far less visible than over an
                  off-white one — but it is still under a fifth of full.
                  `stop-opacity` is set through the class so it can vary with the
                  theme; a plain attribute cannot. */}
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
            </defs>
            <g ref={focusRef}>
              <circle r={FOCUS_RADIUS} fill="url(#km-focus)" />
            </g>
          </svg>
        </div>

        {/* 5 — markers and labels, the nearest plane and therefore the one that
               moves most. Held at 0.8 so place names read as part of the
               backdrop rather than competing with the hero copy over them. */}
        <div ref={setLayer[4]} className="absolute inset-0">
          <svg
            viewBox={VIEW_BOX}
            preserveAspectRatio="xMidYMid slice"
            className="size-full"
            role="presentation"
            focusable="false"
          >
            <g opacity="0.8">
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
                  town, and dimmer — the six upazila seats have to stay readable
                  as the primary tier at a glance. */}
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
                        isSadar ? 'fill-primary' : 'fill-[#7ea6d4] dark:fill-[#4b87c4]'
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
          </svg>
        </div>
      </div>

      {/*
        The readability veil, so hero copy sits on calm ground.

        Outside the stage and never transformed. It is the one part of the
        backdrop that must stay locked to the viewport: it is what keeps text
        legible over the map, so it has to cover exactly the screen and carry
        none of the parallax. Being static also means it is rasterised once and
        never again, which is why it stays an SVG gradient rather than becoming
        another moving layer.

        A gentle, even scrim rather than a directional fade. While the map was
        the hero's own backdrop it could dim hardest on the left where the copy
        sat; as the backdrop for every page that no longer holds — search
        results and card grids run full width — so it settles to a light overall
        wash that keeps contrast off the text without deciding where the text
        will be. Cards and panels carry their own opaque surfaces on top of it.

        The panel variant lifts the veil to roughly a third of the backdrop's.
        There is no body copy over the map on the auth page — only a wordmark
        and one line, both of which carry their own contrast — so the veil there
        is only keeping the map from competing with the form beside it, not
        making text legible on top of it. Left at full strength it washed the
        district out to the point that reusing the real map stopped being
        visible at all.
      */}
      <svg
        className="absolute inset-0 size-full"
        preserveAspectRatio="none"
        role="presentation"
        focusable="false"
      >
        <defs>
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
        </defs>
        <rect width="100%" height="100%" fill="url(#km-veil)" />
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
