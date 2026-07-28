import { m, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

/**
 * Orchestrated entrance for the homepage hero.
 *
 * This is the one place Framer Motion earns its payload: a staggered reveal
 * where each child's delay derives from its position in a shared sequence.
 * CSS animation-delay can fake it, but not while staying in step with content
 * that changes length between locales — Bangla and English hero copy wrap to
 * different heights, and the spring settles correctly for both.
 *
 * Long result lists deliberately do NOT use this; they stay on CSS keyframes so
 * a 60-item list costs no JS animation work on a budget phone.
 */

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07, delayChildren: 0.04 },
  },
}

const item = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 260, damping: 26, mass: 0.7 },
  },
}

export function RevealGroup({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const reduced = useReducedMotion()

  if (reduced) return <div className={className}>{children}</div>

  return (
    <m.div variants={container} initial="hidden" animate="show" className={className}>
      {children}
    </m.div>
  )
}

export function RevealItem({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const reduced = useReducedMotion()

  if (reduced) return <div className={className}>{children}</div>

  return (
    <m.div variants={item} className={className}>
      {children}
    </m.div>
  )
}
