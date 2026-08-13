import { useEffect, useRef } from 'react'
import { animate, m, useMotionValue, useTransform } from 'framer-motion'

import { useReducedMotion } from '@/lib/motion'
import { useI18n } from '@/lib/i18n'

/**
 * Counts a number up on mount.
 *
 * The value lives in a MotionValue, not React state, so the tween writes
 * straight to the text node — a 1.1s count costs zero renders instead of ~66.
 *
 * Digits are localised through `n()`, so the animation is re-run when the
 * locale changes: Bengali numerals are a different glyph set, and re-counting
 * is both simpler and nicer to look at than swapping the text mid-flight.
 */
export function CountUp({
  value,
  delay = 0,
  className,
}: {
  value: number
  delay?: number
  className?: string
}) {
  const { n, locale } = useI18n()
  const reduced = useReducedMotion()

  const count = useMotionValue(0)

  // The transform closure is created once, so it reads the formatter through a
  // ref rather than capturing a stale one from the first render.
  const format = useRef(n)
  format.current = n
  const text = useTransform(count, (v) => format.current(Math.round(v)))

  useEffect(() => {
    if (reduced) {
      count.set(value)
      return
    }

    count.set(0)
    const controls = animate(count, value, {
      duration: 1.1,
      delay,
      ease: [0.22, 1, 0.36, 1],
    })
    return () => controls.stop()
  }, [value, delay, reduced, locale, count])

  return <m.span className={className}>{text}</m.span>
}
