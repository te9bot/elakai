import { useEffect, useState } from 'react'
import { m } from 'framer-motion'

import { useReducedMotion } from '@/lib/motion'

import {
  LOGO_ASPECT,
  LOGO_DEPTH,
  LOGO_PLANES,
  layerFill,
} from '@/components/brand/logo-mark'
import { LOGO_VIEW_BOX } from '@/components/brand/logo-mark.generated'
import { REVEAL_EASE } from '@/components/reveal'

/* ==========================================================================
 * The moment between "signed in" and the dashboard.
 *
 * §11 of the brief. The sequence it describes, and what each part is doing:
 *
 *   button enters loading state    the sign-in form's own concern, not this
 *   authentication succeeds        this component mounts
 *   login UI fades and scales      the form animates out under this overlay
 *   the mark appears               the five planes fade up, held apart
 *   depth movement                 they spring together, nearest plane last
 *   smooth transition              the overlay dissolves
 *   contributor dashboard          already mounted underneath
 *
 * SEVEN HUNDRED MILLISECONDS OF ASSEMBLY, NOT FOUR SECONDS
 *
 * The home page intro (components/brand/logo-intro.tsx) runs for four seconds
 * and is right to. It plays once per session over a page that is already
 * painted and already interactive, so it withholds nothing.
 *
 * This is the opposite situation. It sits between someone pressing a button and
 * the thing they pressed it for, which means every millisecond is a millisecond
 * of waiting. So it borrows the intro's vocabulary — the same five planes, the
 * same depth ratios, the same easing — and runs it in roughly a fifth of the
 * time. Long enough to read as deliberate, short enough that nobody times it.
 *
 * REDUCED MOTION
 *
 * Through `@/lib/motion`, the site's single answer, like everything else.
 *
 * This component briefly read framer's hook directly instead, because at the
 * time that seam returned a hard `false` for everyone and §11 asked for the
 * preference to be respected here specifically. That exception is gone: the
 * seam now reports the OS preference, so there is no longer anything to make an
 * exception to, and no second opinion in the tree.
 *
 * What reduced motion costs here is nothing: with the travel removed this is a
 * brief brand hold rather than a screen that stops working, and the navigation
 * it guards fires from a timer either way.
 * ========================================================================== */

/** Travel of the unit plane at full depth, in px, before assembly. */
const SEPARATION = 11

type Phase = 'apart' | 'shown' | 'together'

/**
 *   0.00 – 0.05  planes painted apart at zero alpha
 *   0.05 – 0.30  they fade up where they stand
 *   0.30 – 0.95  they spring together
 *   0.95 – 1.25  the overlay dissolves; the dashboard is already behind it
 */
const SCHEDULE: { at: number; phase?: Phase; done?: true }[] = [
  { at: 50, phase: 'shown' },
  { at: 300, phase: 'together' },
  { at: 950, done: true },
]

/**
 * With no motion there is nothing to watch assemble, so holding the same
 * duration would be a second of a static logo between someone and the screen
 * they asked for — the opposite of an accommodation.
 */
const REDUCED_SCHEDULE: { at: number; phase?: Phase; done?: true }[] = [
  { at: 20, phase: 'shown' },
  { at: 30, phase: 'together' },
  { at: 420, done: true },
]

const EXIT_MS = 300

export const TRANSITION_MS = SCHEDULE[SCHEDULE.length - 1].at + EXIT_MS

/**
 * Plays once, then calls `onDone`.
 *
 * `onDone` is what navigates. Keeping the navigation outside this component
 * means a failure in the animation can never strand somebody on an overlay: the
 * timer fires regardless of what the planes did.
 */
export function SignInTransition({
  onDone,
  label = 'Signing you in',
}: {
  onDone: () => void
  label?: string
}) {
  const reduced = useReducedMotion()
  const [phase, setPhase] = useState<Phase>('apart')
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const schedule = reduced ? REDUCED_SCHEDULE : SCHEDULE
    const exit = reduced ? 200 : EXIT_MS

    const timers = schedule.map((step) =>
      window.setTimeout(() => {
        if (step.phase) setPhase(step.phase)
        if (step.done) setLeaving(true)
      }, step.at),
    )

    // The one timer that matters. It is set from the schedule rather than
    // chained off an animation callback, so a dropped frame or a backgrounded
    // tab cannot leave the overlay up with nothing behind it.
    const finish = window.setTimeout(
      onDone,
      schedule[schedule.length - 1].at + exit,
    )

    return () => {
      timers.forEach(window.clearTimeout)
      window.clearTimeout(finish)
    }
  }, [onDone, reduced])

  const depth = reduced ? 0 : 1

  return (
    <m.div
      // `polite` rather than `assertive`: this is a progress note, not an
      // interruption, and it is followed immediately by the dashboard.
      role="status"
      aria-live="polite"
      initial={{ opacity: 0 }}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: leaving ? (reduced ? 0.2 : 0.3) : 0.18, ease: REVEAL_EASE }}
      className="fixed inset-0 z-[100] grid place-items-center bg-canvas"
    >
      <m.div
        animate={{ scale: leaving && !reduced ? 1.06 : 1 }}
        transition={{ duration: 0.3, ease: REVEAL_EASE }}
        className="flex flex-col items-center gap-5"
      >
        <div className="w-[132px] sm:w-[152px]" style={{ aspectRatio: LOGO_ASPECT }}>
          <svg viewBox={LOGO_VIEW_BOX} className="block size-full" role="img" aria-label="ELAKAI">
            {LOGO_PLANES.map((layer) => {
              const ratio = LOGO_DEPTH[layer.name]
              return (
                <m.path
                  key={layer.name}
                  d={layer.d}
                  fill={layerFill(layer.fill)}
                  fillRule="evenodd"
                  initial={false}
                  animate={phase}
                  variants={{
                    apart: {
                      opacity: 0,
                      y: -SEPARATION * ratio * depth,
                      x: SEPARATION * 0.45 * ratio * depth,
                      scale: 1 + 0.05 * ratio * depth,
                    },
                    shown: {
                      opacity: 1,
                      y: -SEPARATION * ratio * depth,
                      x: SEPARATION * 0.45 * ratio * depth,
                      scale: 1 + 0.05 * ratio * depth,
                      transition: { duration: 0.25, ease: REVEAL_EASE },
                    },
                    together: {
                      opacity: 1,
                      y: 0,
                      x: 0,
                      scale: 1,
                      transition: reduced
                        ? { duration: 0.15, ease: REVEAL_EASE }
                        : {
                            type: 'spring',
                            stiffness: 130,
                            damping: 18,
                            mass: 0.9,
                            // Nearest plane last, which is what reads as depth
                            // rather than as one shape sliding.
                            delay: (1.5 - ratio) * 0.11,
                          },
                    },
                  }}
                  style={{ transformOrigin: 'center' }}
                />
              )
            })}
          </svg>
        </div>

        <p className="text-meta font-semibold tracking-wide text-ink-subtle">{label}</p>
      </m.div>
    </m.div>
  )
}
