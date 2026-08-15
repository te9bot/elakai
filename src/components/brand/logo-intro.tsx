import { useEffect, useState } from 'react'
import { m, type Variants } from 'framer-motion'

import { useReducedMotion } from '@/lib/motion'

import {
  LOGO_ASPECT,
  LOGO_DEPTH,
  LOGO_PLANES,
  layerFill,
} from '@/components/brand/logo-mark'
import { LOGO_VIEW_BOX, type LogoLayer } from '@/components/brand/logo-mark.generated'
import {
  introAlreadyPlayed,
  markIntroPlayed,
  useDepth,
  usePointerLayer,
  usePointerParallax,
  type Pointer,
} from '@/lib/parallax'
import { REVEAL_EASE } from '@/components/reveal'

/**
 * The opening.
 *
 * This is an *overlay*, not a page. The home page is mounted, laid out and
 * painted underneath it the whole time — this only sits on top for a couple of
 * seconds and then dissolves, which is why there is no route for it, no second
 * home page, and nothing to navigate away from. Scrolling and clicking pass
 * straight through (`pointer-events-none`), so it can never trap anyone.
 *
 * The sequence, ~2.2s end to end:
 *
 *   1  the five planes are apart, lifted and slightly oversized, at zero alpha
 *   2  they fade up where they stand, still separated
 *   3  they spring together into the assembled mark, nearest plane last
 *   4  a small settle drift, plus cursor parallax, keeps the depth alive
 *   5  the whole thing scales up a touch and fades out
 *   6  the home page — already there — is simply what is left
 *
 * Under reduced motion every displacement below multiplies by a `depth` of
 * zero, so the same code path collapses to a plain cross-fade with no travel at
 * all, and the schedule shortens to match. That branch is dormant on this site
 * — see lib/motion.ts — but it is what would run if it came back.
 */

/* ------------------------------------------------------------------ */
/* Choreography                                                        */
/* ------------------------------------------------------------------ */

/** Travel of the *unit* plane at full depth, in px. Each plane scales this by
 *  its own depth ratio, so the spread stays proportional. */
const SEPARATION = 13

/** Maximum cursor travel of the nearest plane, in px. The near and far planes
 *  move in opposite directions about a mid-plane at 0.85, which is what sells
 *  the parallax as depth rather than as the whole mark sliding. */
const POINTER_REACH = 15
const MID_PLANE = 0.85

type PlaneTiming = {
  /** Starting displacement, in px. */
  lift: number
  slide: number
  /** Starting oversize, as a fraction. */
  grow: number
  /** Seconds this plane waits before springing home. */
  settle: number
}

const plane: Variants = {
  apart: (t: PlaneTiming) => ({
    x: t.slide,
    y: t.lift,
    scale: 1 + t.grow,
    opacity: 0,
  }),
  // Held apart, but visible: the eye needs a beat to read the separation
  // before it is taken away, or the assembly reads as a simple fade-in.
  shown: (t: PlaneTiming) => ({
    x: t.slide,
    y: t.lift,
    scale: 1 + t.grow,
    opacity: 1,
    // Fills 0.06s–0.78s, landing just before the assembly begins at 0.80s.
    transition: { duration: 0.72, ease: REVEAL_EASE },
  }),
  together: (t: PlaneTiming) => ({
    x: 0,
    y: 0,
    scale: 1,
    opacity: 1,
    // Softer and heavier than a UI spring, because this one has 1.7s to cross
    // rather than the ~0.9s the old schedule gave it. Keeping the previous
    // stiffness and simply waiting longer would assemble the mark in the first
    // half-second and then hold a still image for the rest of the phase.
    transition: {
      type: 'spring',
      stiffness: 62,
      damping: 17,
      mass: 1.2,
      delay: t.settle,
    },
  }),
  // Not a return to `apart` — a fraction of it, in the opposite direction, so
  // the assembled mark keeps breathing instead of freezing before it leaves.
  drift: (t: PlaneTiming) => ({
    x: t.slide * -0.2,
    y: t.lift * 0.26,
    scale: 1 + t.grow * 0.2,
    opacity: 1,
    // Fills the 2.50s–3.30s hold. Long and shallow, so the mark reads as
    // settled rather than as still moving when the dissolve starts.
    transition: { duration: 0.8, ease: REVEAL_EASE },
  }),
}

/** Spelled out rather than derived from `plane`: `Variants` carries an index
 *  signature, so `keyof` it widens to `string | number` and stops typing
 *  `animate` at all. */
type Phase = 'apart' | 'shown' | 'together' | 'drift'

/**
 * The intro runs for exactly four seconds, mount to unmount.
 *
 *   0.00 – 0.80   planes fade up where they stand, still separated
 *   0.80 – 2.50   they spring together into the assembled mark
 *   2.50 – 3.30   the finished mark holds, drifting slightly
 *   3.30 – 4.00   it scales up a touch and the overlay dissolves
 *
 * `TOTAL_MS` is asserted below rather than written down twice, so the phase
 * boundaries and the advertised duration cannot drift apart.
 *
 * Four seconds is a long time to hold a screen, and it is only defensible
 * because nothing is being withheld: this is an overlay over a home page that
 * is already mounted, painted and — since it is `pointer-events-none` — already
 * scrollable and clickable underneath. It is also once per session
 * (`introAlreadyPlayed`), so it is not a toll paid on every navigation.
 */
const SCHEDULE: { at: number; phase?: Phase; done?: true }[] = [
  // Not 0: one frame of `apart` has to paint first, or the fade has nothing to
  // start from and the planes appear already visible.
  { at: 60, phase: 'shown' },
  { at: 800, phase: 'together' },
  { at: 2500, phase: 'drift' },
  { at: 3300, done: true },
]

/**
 * Reduced motion keeps its short schedule deliberately.
 *
 * The four seconds above buy time to watch something assemble. With every
 * displacement multiplied by a depth of zero there is nothing to watch, so the
 * same duration would be four seconds of a static logo between the person and
 * the site they asked for — which is the opposite of the accommodation.
 */
const REDUCED_SCHEDULE: { at: number; phase?: Phase; done?: true }[] = [
  { at: 20, phase: 'shown' },
  { at: 40, phase: 'together' },
  { at: 700, done: true },
]

/** How long the overlay takes to dissolve once `done` is reached. */
const EXIT_MS = 700

/** The advertised total: the last step, plus the dissolve that follows it. */
export const INTRO_TOTAL_MS = SCHEDULE[SCHEDULE.length - 1].at + EXIT_MS

if (INTRO_TOTAL_MS !== 4000) {
  // A loud failure in development rather than a silently 3.8s intro after
  // someone nudges a phase boundary.
  console.warn(
    `[elakai] logo intro is ${INTRO_TOTAL_MS}ms, expected 4000ms. ` +
      'Adjust SCHEDULE or EXIT_MS in components/brand/logo-intro.tsx.',
  )
}

/* ------------------------------------------------------------------ */
/* One plane                                                           */
/* ------------------------------------------------------------------ */

function Plane({
  layer,
  phase,
  pointer,
  depth,
}: {
  layer: LogoLayer
  phase: Phase
  pointer: Pointer
  depth: number
}) {
  const ratio = LOGO_DEPTH[layer.name]
  const reach = (ratio - MID_PLANE) * POINTER_REACH

  // Two calls rather than one: the cursor's vertical range is the short axis of
  // most screens, so matching its horizontal travel there overstates the tilt.
  const across = usePointerLayer(pointer, reach, depth)
  const down = usePointerLayer(pointer, reach * 0.55, depth)

  const timing: PlaneTiming = {
    lift: -SEPARATION * ratio * depth,
    slide: SEPARATION * 0.52 * ratio * depth,
    grow: 0.055 * ratio * depth,
    // Widened with the longer assembly phase: at the old 0.06 the five planes
    // were effectively simultaneous across 1.7s, which loses the "nearest
    // plane last" reading the separation is there to set up.
    settle: 0.17 * ratio,
  }

  return (
    // The cursor plane and the choreography plane are separate elements
    // because they both drive `transform`, and one element has only one.
    <m.div className="absolute inset-0" style={{ x: across.x, y: down.y }}>
      <m.svg
        viewBox={LOGO_VIEW_BOX}
        // overflow-visible: the planes are oversized and displaced while they
        // are apart, and the viewBox is trimmed tight to the artwork.
        className="size-full overflow-visible"
        custom={timing}
        variants={plane}
        initial="apart"
        animate={phase}
      >
        <path d={layer.d} fill={layerFill(layer.fill)} fillRule="evenodd" />
      </m.svg>
    </m.div>
  )
}

/* ------------------------------------------------------------------ */
/* Overlay                                                             */
/* ------------------------------------------------------------------ */

export function LogoIntro() {
  const reduced = useReducedMotion()
  const scrollDepth = useDepth()

  // The intro is a focal, full-screen moment rather than something read past,
  // so a phone gets more of the effect here than it does while scrolling — but
  // reduced motion still zeroes it, because `useDepth` returns 0 for that.
  const depth = scrollDepth === 0 ? 0 : Math.max(scrollDepth, 0.62)

  const [playing, setPlaying] = useState(() => !introAlreadyPlayed())
  const [phase, setPhase] = useState<Phase>('apart')
  const [leaving, setLeaving] = useState(false)

  // Left live through the exit on purpose. Switching it off at `leaving`
  // springs every plane back to centre underneath the fade, which reads as a
  // flinch right at the moment the mark is meant to be settling away.
  const pointer = usePointerParallax(playing)

  useEffect(() => {
    if (!playing) return

    const schedule = reduced ? REDUCED_SCHEDULE : SCHEDULE
    const total = (schedule[schedule.length - 1]?.at ?? 0) + EXIT_MS
    const t0 = performance.now()

    /*
     * Driven by elapsed time on an animation frame, not by a chain of
     * setTimeouts.
     *
     * `setTimeout` guarantees a floor, never a ceiling: a busy main thread —
     * React mounting the page underneath, the hero map rasterising, the first
     * queries resolving — pushes every timer out, and the delays accumulate
     * down the chain. Measured, that put a schedule adding up to 4000ms at
     * 4676ms.
     *
     * Comparing `performance.now()` against fixed offsets instead means a late
     * frame cannot compound: each step fires on the first frame at or after its
     * own mark, so the total is accurate to roughly one frame regardless of
     * what else the page is doing.
     */
    let frame = 0
    let next = 0

    const tick = () => {
      const elapsed = performance.now() - t0

      while (next < schedule.length && elapsed >= schedule[next].at) {
        const step = schedule[next]
        if (step.phase) setPhase(step.phase)
        if (step.done) setLeaving(true)
        next++
      }

      if (elapsed >= total) {
        // Marked at the end, not the start: an intro abandoned halfway through
        // — by a reload, or by React remounting this in development — has not
        // been seen, and should still be owed.
        markIntroPlayed()
        setPlaying(false)
        return
      }

      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, reduced])

  if (!playing) return null

  return (
    // aria-hidden and pointer-events-none throughout: the home page underneath
    // is already complete and already reachable, and nothing here is content.
    <m.div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[100] grid place-items-center bg-canvas"
      initial={{ opacity: 1 }}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: EXIT_MS / 1000, ease: REVEAL_EASE }}
    >
      <div
        aria-hidden="true"
        className="glow-primary absolute size-[min(120vw,720px)] motion-safe:animate-float"
      />

      <m.div
        className="relative w-[min(52vw,208px)]"
        style={{ aspectRatio: LOGO_ASPECT }}
        initial={{ scale: 1 }}
        animate={{ scale: leaving ? 1 + 0.07 * depth : 1 }}
        transition={{ duration: EXIT_MS / 1000, ease: REVEAL_EASE }}
      >
        {LOGO_PLANES.map((layer) => (
          <Plane
            key={layer.name}
            layer={layer}
            phase={phase}
            pointer={pointer}
            depth={depth}
          />
        ))}
      </m.div>
    </m.div>
  )
}
