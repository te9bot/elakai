import { useEffect, useMemo } from 'react'
import {
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion'

import { useIsDesktop, useIsTablet, useMediaQuery } from '@/hooks/use-media-query'
import { useReducedMotion } from '@/lib/motion'

/**
 * The site's depth system.
 *
 * One idea underneath all of it: layers move at *different rates*, never at
 * different times. So every displacement here is a multiple of a single
 * `depth` scalar — killing depth kills the effect uniformly instead of leaving
 * half the layers drifting on their own.
 *
 * Everything returns a MotionValue. Scroll and pointer never enter React
 * state, so a full-page parallax costs zero re-renders and every animated
 * property stays on `transform`/`opacity`.
 *
 * This is deliberately the *only* motion system in the app. Framer Motion is
 * already the dependency the reveals are built on; adding a scroll library
 * beside it would mean two things driving the same frames.
 */

/** Session flag: the logo intro plays once per browsing session. */
const INTRO_KEY = 'elakai:intro-played'

export function introAlreadyPlayed(): boolean {
  try {
    return sessionStorage.getItem(INTRO_KEY) === '1'
  } catch {
    return false // private mode — play it, it is cheap
  }
}

export function markIntroPlayed(): void {
  try {
    sessionStorage.setItem(INTRO_KEY, '1')
  } catch {
    /* private mode */
  }
}

/* ------------------------------------------------------------------ */
/* Depth tiers                                                         */
/* ------------------------------------------------------------------ */

/**
 * How much parallax this device gets.
 *
 * Travel distances are authored against a 1440px desktop stage. Replaying them
 * at full strength on a 360px screen would drag copy up the viewport while it
 * is still being read, so the amplitude scales down while the *ratios* between
 * layers — which is what the eye actually reads as depth — stay identical.
 *
 * Zero under reduced motion: every consumer multiplies by this, so one branch
 * disables the entire system. ELAKAI never asks for it — see lib/motion.ts.
 */
export function useDepth(): number {
  const reduced = useReducedMotion()
  const isDesktop = useIsDesktop()
  const isTablet = useIsTablet()

  if (reduced) return 0
  if (isDesktop) return 1
  if (isTablet) return 0.6
  return 0.36
}

/* ------------------------------------------------------------------ */
/* Scroll progress                                                     */
/* ------------------------------------------------------------------ */

export type ParallaxRange = [number, number]

/**
 * Progress from 0 (the element's top enters the bottom of the viewport) to 1
 * (its bottom leaves the top) — the whole window in which a section is on
 * screen at all. This is the one to use for continuous, scrub-linked motion.
 */
export function useSectionProgress(ref: React.RefObject<HTMLElement>): MotionValue<number> {
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  return scrollYProgress
}

/** Progress while a section is on its way *out* the top — for hero scroll-away. */
export function useLeaveProgress(ref: React.RefObject<HTMLElement>): MotionValue<number> {
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })
  return scrollYProgress
}

/**
 * Progress across a section's *arrival* only: 0 as its top reaches the bottom
 * of the viewport, 1 once it has risen to the middle. Reveals that should
 * finish while the reader is still looking at the top of a section want this
 * rather than the full-window range.
 */
export function useEnterProgress(ref: React.RefObject<HTMLElement>): MotionValue<number> {
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'center center'],
  })
  return scrollYProgress
}

/* ------------------------------------------------------------------ */
/* Layers                                                              */
/* ------------------------------------------------------------------ */

/**
 * Maps a progress value onto a travel, scaled by the device's depth tier.
 *
 * Sign is the whole vocabulary: a positive end value means the layer lags
 * behind the scroll and reads as far away; negative means it runs ahead of it
 * and reads as close to the reader.
 */
export function useLayer(
  progress: MotionValue<number>,
  range: ParallaxRange,
  depth: number,
): MotionValue<number> {
  return useTransform(progress, [0, 1], [range[0] * depth, range[1] * depth])
}

/**
 * Same, but eased off at both ends of the section's window so a layer is never
 * caught mid-travel as it enters or leaves. Used where a shape is large enough
 * that a linear ramp would visibly slide past the section edge.
 */
export function useSettledLayer(
  progress: MotionValue<number>,
  range: ParallaxRange,
  depth: number,
): MotionValue<number> {
  return useTransform(
    progress,
    [0, 0.5, 1],
    [range[0] * depth, ((range[0] + range[1]) / 2) * depth, range[1] * depth],
  )
}

/** Interpolates a plain scalar (scale, opacity, blur radius) over progress. */
export function useScrub(
  progress: MotionValue<number>,
  stops: number[],
  values: number[],
  depth: number,
): MotionValue<number> {
  // At depth 0 every stop collapses to the resting value, which for a scale or
  // an opacity is the last one — the state the section ends up in.
  const resting = values[values.length - 1]
  return useTransform(progress, stops, depth === 0 ? values.map(() => resting) : values)
}

/* ------------------------------------------------------------------ */
/* Pointer parallax                                                    */
/* ------------------------------------------------------------------ */

export type Pointer = { x: MotionValue<number>; y: MotionValue<number> }

/**
 * Normalised cursor position, -1 to 1 on both axes, spring-smoothed.
 *
 * Mouse only. On a touch device there is no hovering cursor to parallax
 * against, and wiring a pointermove listener there buys nothing but battery.
 * The spring is what keeps this from feeling like the page is glued to the
 * mouse: the layers arrive slightly after the cursor does, which is the
 * difference between depth and a gimmick.
 */
export function usePointerParallax(enabled = true): Pointer {
  const reduced = useReducedMotion()
  const fine = useMediaQuery('(pointer: fine)')
  const active = enabled && fine && !reduced

  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)

  const x = useSpring(rawX, { stiffness: 60, damping: 20, mass: 0.6 })
  const y = useSpring(rawY, { stiffness: 60, damping: 20, mass: 0.6 })

  useEffect(() => {
    if (!active) {
      rawX.set(0)
      rawY.set(0)
      return
    }

    let frame = 0
    const onMove = (e: PointerEvent) => {
      // One write per frame: pointermove fires far faster than the compositor
      // consumes it, and each write schedules spring work.
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        rawX.set((e.clientX / window.innerWidth) * 2 - 1)
        rawY.set((e.clientY / window.innerHeight) * 2 - 1)
      })
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [active, rawX, rawY])

  return { x, y }
}

/**
 * Turns the normalised pointer into a layer displacement in px.
 *
 * `strength` is the maximum travel at the very edge of the viewport. Keep it
 * small — the point is that the user *feels* the depth rather than notices the
 * page moving, and past roughly 20px they notice.
 */
export function usePointerLayer(
  pointer: Pointer,
  strength: number,
  depth: number,
): { x: MotionValue<number>; y: MotionValue<number> } {
  const amount = strength * depth
  const x = useTransform(pointer.x, (v) => v * amount)
  const y = useTransform(pointer.y, (v) => v * amount)
  return useMemo(() => ({ x, y }), [x, y])
}
