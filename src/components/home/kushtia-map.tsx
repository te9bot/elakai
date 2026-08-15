import { useEffect, useRef, useState } from 'react'
import { AREA_MAP } from '@/data/categories'
import type { AreaId } from '@/data/types'
import { useI18n } from '@/lib/i18n'
import { useReducedMotion } from '@/lib/motion'
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

/** A gentle curve between two projected points, so roads are not rulers. */
function curve(a: { x: number; y: number }, b: { x: number; y: number }, bow = 0.12): string {
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  // Offset the control point perpendicular to the run.
  const dx = b.x - a.x
  const dy = b.y - a.y
  return `M ${a.x} ${a.y} Q ${mx - dy * bow} ${my + dx * bow} ${b.x} ${b.y}`
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

export function KushtiaMap({ className }: { className?: string }) {
  const { L } = useI18n()
  const reduced = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  /*
   * Scroll position, as a plain number.
   *
   * framer's `useScroll` was tried here and its MotionValue does not reach an
   * SVG `<g>`: under `LazyMotion` the transform is simply never written, and
   * the layers sit at `transform: none` however far the page scrolls. Rather
   * than work around that, this keeps the scroll offset in state and writes an
   * ordinary inline transform, which is what the SVG honours.
   *
   * The cost is a re-render per frame while scrolling. It is acceptable because
   * the tree below is a fixed, static set of paths — no data, no children that
   * can change — so React's work is diffing seven style strings.
   */
  const [scroll, setScroll] = useState(0)

  useEffect(() => {
    // Through the project's seam, not `matchMedia` directly.
    //
    // `lib/motion.ts` is the site's single answer on reduced motion — a
    // deliberate owner decision, currently "play for everyone" — and it exists
    // precisely so no component holds a second opinion. Querying the media
    // feature here did exactly that: on a machine with the OS setting enabled
    // the hero kept animating while this backdrop sat frozen behind it, which
    // is neither the accessible behaviour nor the intended one. Flipping that
    // one function turns this off along with everything else.
    if (reduced) return

    // Not a motion preference but a capability check, so it stays local: a
    // coarse pointer has no hover position to track, and the listener would
    // cost work and never move anything. Scroll still applies on touch.
    const fine = window.matchMedia('(pointer: fine)').matches

    /*
     * State is set straight from the handler rather than deferred to an
     * animation frame.
     *
     * The rAF wrapper that used to sit here coalesced bursts, which is the
     * usual reason to have one — but it also meant a single `cancelAnimationFrame`
     * shared between the pointer and scroll handlers could drop the other's
     * pending update, and it made the whole effect depend on frames being
     * delivered. React 18 batches these updates anyway, and both handlers do
     * nothing but arithmetic, so the coalescing was buying very little for the
     * fragility it added.
     */
    function onMove(event: MouseEvent) {
      const box = ref.current?.getBoundingClientRect()
      if (!box) return
      // -1..1 from the centre, so the shift is symmetric.
      setTilt({
        x: ((event.clientX - box.left) / box.width - 0.5) * 2,
        y: ((event.clientY - box.top) / box.height - 0.5) * 2,
      })
    }

    /*
     * Clamped, so the separation accrues over the first screen or so and then
     * holds. Without it an eight-screen page would slide the labels a hundred
     * pixels clear of the markers they belong to.
     */
    function onScroll() {
      setScroll(Math.min(window.scrollY, SCROLL_SPAN))
    }

    if (fine) window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

    return () => {
      if (fine) window.removeEventListener('mousemove', onMove)
      window.removeEventListener('scroll', onScroll)

    }
  }, [reduced])

  /**
   * A layer's pointer offset, combined with its scroll MotionValue by the
   * caller. Both scale by the same depth, which is what makes the two read as
   * one space rather than as two separate effects.
   *
   * Transform only — no `top`, no `background-position` — so the backdrop stays
   * on the compositor and never triggers layout while the page scrolls.
   */
  const layer = (depth: number) => ({
    transform: `translate3d(${tilt.x * depth}px, ${
      tilt.y * depth - (scroll / SCROLL_SPAN) * depth * 7
    }px, 0)`,
    transition: 'transform 380ms cubic-bezier(0.22, 1, 0.36, 1)',
    willChange: 'transform',
  })

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
          <radialGradient id="km-glow-a" cx="50%" cy="50%">
            <stop
              offset="0%"
              className="[stop-color:#2563EB] dark:[stop-color:#3B82F6]"
              stopOpacity="0.16"
            />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="km-glow-b" cx="50%" cy="50%">
            <stop
              offset="0%"
              className="[stop-color:#0EA5E9] dark:[stop-color:#22D3EE]"
              stopOpacity="0.12"
            />
            <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0" />
          </radialGradient>
          {/* A gentle, even scrim rather than a directional fade.
              While the map was the hero's own backdrop it could dim hardest on
              the left, where the copy sat. As the backdrop for every page that
              no longer holds — search results and card grids run full width —
              so it settles to a light overall wash that keeps contrast off the
              text without deciding where the text will be. Cards and panels
              carry their own opaque surfaces on top of it. */}
          <linearGradient id="km-veil" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              className="[stop-color:#FFFFFF] dark:[stop-color:#0F172A]"
              stopOpacity="0.62"
            />
            <stop
              offset="45%"
              className="[stop-color:#FFFFFF] dark:[stop-color:#0F172A]"
              stopOpacity="0.5"
            />
            <stop
              offset="100%"
              className="[stop-color:#FFFFFF] dark:[stop-color:#0F172A]"
              stopOpacity="0.66"
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
        <g style={layer(DEPTH.grid)}>
          <rect
            x={-40}
            y={-40}
            width={VIEW.w + 80}
            height={VIEW.h + 80}
            fill="url(#km-grid)"
            opacity="0.7"
          />
        </g>

        {/* 3 — urban blocks: density around the three larger towns */}
        <g style={layer(DEPTH.blocks)} className="fill-[#dbe3ee] dark:fill-[#16233a]">
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
        </g>

        {/* 4 — river: the Padma along the north-west, the Gorai to the south-east */}
        <g style={layer(DEPTH.river)} fill="none" strokeLinecap="round">
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
        </g>

        {/* 5 — trunk roads */}
        <g style={layer(DEPTH.roads)} fill="none" strokeLinecap="round">
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
        <g style={layer(DEPTH.routes)} fill="none" strokeLinecap="round">
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

        {/* 7 — atmospheric glow */}
        <g style={layer(DEPTH.glow)}>
          <circle cx={sadar.x} cy={sadar.y} r="300" fill="url(#km-glow-a)" />
          <circle cx={at('bheramara').x} cy={at('bheramara').y} r="240" fill="url(#km-glow-b)" />
        </g>

        {/* 8 — markers and labels.
            Held at 0.8 so place names read as part of the backdrop rather than
            competing with the hero copy sitting over them. */}
        <g style={layer(DEPTH.markers)} opacity="0.8">
          {PLACES.map((p) => {
            const isSadar = p.id === 'kushtia-sadar'
            return (
              <g key={p.id}>
                {isSadar && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="26"
                    className="fill-primary/20 motion-safe:animate-pulse-ring"
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
