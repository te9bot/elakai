import { createContext, useContext, useRef, type ReactNode } from 'react'
import { m, motionValue, useScroll, useTransform, type MotionValue } from 'framer-motion'

import { useDepth } from '@/lib/parallax'

/**
 * Scroll-linked depth for ordinary page sections.
 *
 * Two ways in:
 *
 *  - `<Parallax>` on its own, for a single element that should move against
 *    the scroll.
 *  - `<ParallaxScene>` wrapping several `<ParallaxLayer>`s, when a section's
 *    parts must move *relative to each other*. They then share one scroll
 *    observer and one progress value, so the layers can never drift out of
 *    step the way independently-measured elements do.
 *
 * This is scrubbing, not triggering: position is a continuous function of
 * scroll offset, so scrolling back up runs it backwards. Entrance animations
 * that play once and stay put are a different tool — see components/reveal.tsx
 * — and most sections here want both.
 *
 * Everything resolves to `transform` and `opacity` on a MotionValue, so no
 * frame of this touches layout or React state.
 */

/* ------------------------------------------------------------------ */
/* Ranges                                                              */
/* ------------------------------------------------------------------ */

/**
 * Which stretch of scrolling drives the animation.
 *
 *  - `cross`  the whole time the element is on screen. Continuous drift.
 *  - `enter`  from first appearing to reaching the middle. Arrivals.
 *  - `leave`  from sitting at the top to being scrolled off it. Departures.
 */
export type ParallaxRange = 'cross' | 'enter' | 'leave'

const OFFSETS = {
  cross: ['start end', 'end start'],
  enter: ['start end', 'center center'],
  leave: ['start start', 'end start'],
} as const

type Pair = [number, number]

export type ParallaxMotion = {
  /** Vertical travel in px: `[at entry, at exit]`. Positive lags the scroll
   *  and reads as distant; negative runs ahead of it and reads as near. */
  y?: Pair
  /** Horizontal travel in px. Keep small, and only inside something that
   *  clips — a layer sliding right can otherwise widen the document. */
  x?: Pair
  scale?: Pair
  rotate?: Pair
  opacity?: Pair
}

/**
 * Fold the device's depth tier into a value, holding it at its resting state.
 *
 * A tier of 0 — which is what reduced motion produces — has to leave
 * a scale at 1 and an opacity at 1, not at 0, so this interpolates toward the
 * resting value rather than multiplying.
 */
const toward = (value: number, resting: number, depth: number) =>
  resting + (value - resting) * depth

function useTrack(
  progress: MotionValue<number>,
  pair: Pair | undefined,
  resting: number,
  depth: number,
  rate: number,
) {
  const from = pair ? toward(pair[0] * rate, resting, depth) : resting
  const to = pair ? toward(pair[1] * rate, resting, depth) : resting
  return useTransform(progress, [0, 1], [from, to])
}

/**
 * `rate` scales a layer's whole motion — it is how one shared set of distances
 * produces several planes. 1 is the plane the distances were authored for.
 */
function useMotionStyle(progress: MotionValue<number>, motion: ParallaxMotion, rate: number) {
  const depth = useDepth()

  // Every track is created unconditionally; an absent one resolves to a
  // constant at its resting value and costs nothing to read.
  const y = useTrack(progress, motion.y, 0, depth, rate)
  const x = useTrack(progress, motion.x, 0, depth, rate)
  const scale = useTrack(progress, motion.scale, 1, depth, rate)
  const rotate = useTrack(progress, motion.rotate, 0, depth, rate)
  const opacity = useTrack(progress, motion.opacity, 1, depth, rate)

  /*
   * Promote the ones that actually travel, and only those.
   *
   * WHY THIS IS HERE AT ALL. Removing the smooth-scroll engine handed the page
   * back to the browser, which is the right trade and also a faster one: a
   * wheel notch now moves the page its full 120px on the frame it arrives,
   * where the engine spread the same distance over a dozen eased frames. Bigger
   * steps per frame mean a bigger area to repaint per frame, and these layers
   * were being repainted rather than composited — so the peak frame cost went
   * up even as the responsiveness did.
   *
   * `will-change: transform` is what makes the difference between the two:
   * the browser rasterises the layer once and then moves it, so the size of the
   * step stops mattering. Measured under real wheel input, 1440px, 4x CPU
   * throttle, 60 notches: frames over 20ms fell from 43 to 23 and the worst
   * frame from 70ms to 40ms. Under real touch drags at 390px: 25 to 13, with
   * nothing over 32ms.
   *
   * WHY IT IS NOT RECKLESS. It is applied per element, only when that element
   * has a transform track — a layer given only `opacity` is not promoted — and
   * only when `depth` is non-zero, so a reduced-motion visitor, for whom every
   * track collapses to a constant, promotes nothing at all. On the homepage
   * that is roughly twenty section-sized layers, not the hundreds the hint is
   * usually warned about, and every one of them genuinely moves for the whole
   * time it is on screen.
   */
  const travels = Boolean(motion.y || motion.x || motion.scale || motion.rotate)
  const promote = travels && depth !== 0 ? ({ willChange: 'transform' } as const) : null

  return {
    ...promote,
    ...(motion.y ? { y } : null),
    ...(motion.x ? { x } : null),
    ...(motion.scale ? { scale } : null),
    ...(motion.rotate ? { rotate } : null),
    ...(motion.opacity ? { opacity } : null),
  }
}

/* ------------------------------------------------------------------ */
/* Standalone                                                          */
/* ------------------------------------------------------------------ */

export function Parallax({
  children,
  className,
  range = 'cross',
  rate = 1,
  ...motion
}: ParallaxMotion & {
  children: ReactNode
  className?: string
  range?: ParallaxRange
  rate?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  // Copied, not passed by reference: the table is `as const` so the tuples are
  // readonly, and useScroll's parameter is not.
  const { scrollYProgress } = useScroll({ target: ref, offset: [...OFFSETS[range]] })
  const style = useMotionStyle(scrollYProgress, motion, rate)

  return (
    // The measured element and the moving element are the same one here, which
    // is fine: `useScroll` reads layout position, and transforms do not change
    // it. The element's travel can never feed back into its own progress.
    <m.div ref={ref} className={className} style={style}>
      {children}
    </m.div>
  )
}

/* ------------------------------------------------------------------ */
/* Shared scene                                                        */
/* ------------------------------------------------------------------ */

const SceneProgress = createContext<MotionValue<number> | null>(null)

/**
 * Stand-in progress for a layer that finds no scene above it. A module
 * singleton rather than a hook, so the no-scene path costs no scroll observer
 * — the alternative is every layer opening one it will never read.
 */
const IDLE = motionValue(0)

export function ParallaxScene({
  children,
  className,
  range = 'cross',
  as: Tag = 'div',
}: {
  children: ReactNode
  className?: string
  range?: ParallaxRange
  as?: 'div' | 'section'
}) {
  const ref = useRef<HTMLDivElement>(null)
  // Copied, not passed by reference: the table is `as const` so the tuples are
  // readonly, and useScroll's parameter is not.
  const { scrollYProgress } = useScroll({ target: ref, offset: [...OFFSETS[range]] })

  return (
    <SceneProgress.Provider value={scrollYProgress}>
      <Tag ref={ref} className={className}>
        {children}
      </Tag>
    </SceneProgress.Provider>
  )
}

/**
 * A plane inside a `ParallaxScene`. Outside one it renders as a plain div, so
 * a layer can never silently animate against the wrong element.
 */
export function ParallaxLayer({
  children,
  className,
  rate = 1,
  ...motion
}: ParallaxMotion & {
  children: ReactNode
  className?: string
  rate?: number
}) {
  const progress = useContext(SceneProgress)
  const style = useMotionStyle(progress ?? IDLE, motion, rate)

  if (!progress) return <div className={className}>{children}</div>

  return (
    <m.div className={className} style={style}>
      {children}
    </m.div>
  )
}
