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
    transition: { duration: 0.34, ease: REVEAL_EASE },
  }),
  together: (t: PlaneTiming) => ({
    x: 0,
    y: 0,
    scale: 1,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 150,
      damping: 21,
      mass: 0.9,
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
    transition: { duration: 0.75, ease: REVEAL_EASE },
  }),
}

/** Spelled out rather than derived from `plane`: `Variants` carries an index
 *  signature, so `keyof` it widens to `string | number` and stops typing
 *  `animate` at all. */
type Phase = 'apart' | 'shown' | 'together' | 'drift'

/** Milliseconds from mount. The last entry is when the overlay unmounts. */
const SCHEDULE: { at: number; phase?: Phase; done?: true }[] = [
  { at: 40, phase: 'shown' },
  { at: 430, phase: 'together' },
  { at: 1240, phase: 'drift' },
  { at: 1760, done: true },
]

const REDUCED_SCHEDULE: { at: number; phase?: Phase; done?: true }[] = [
  { at: 20, phase: 'shown' },
  { at: 40, phase: 'together' },
  { at: 700, done: true },
]

/** How long the overlay takes to dissolve once `done` is reached. */
const EXIT_MS = 480

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
    settle: 0.06 * ratio,
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
    const timers = schedule.map((step) =>
      setTimeout(() => {
        if (step.phase) setPhase(step.phase)
        if (step.done) setLeaving(true)
      }, step.at),
    )

    // Marked at the end, not the start: an intro abandoned halfway through —
    // by a reload, or by React remounting this in development — has not been
    // seen, and should still be owed.
    const finish = setTimeout(
      () => {
        markIntroPlayed()
        setPlaying(false)
      },
      (schedule[schedule.length - 1]?.at ?? 0) + EXIT_MS,
    )

    return () => {
      timers.forEach(clearTimeout)
      clearTimeout(finish)
    }
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
