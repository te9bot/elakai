import { m, type Variants } from 'framer-motion'

import { useReducedMotion } from '@/lib/motion'
import { Children, type ReactNode } from 'react'

/**
 * Reveal primitives.
 *
 * Two families live here:
 *
 *  - `RevealGroup` / `RevealItem` — an orchestrated *entrance*, played once on
 *    mount. Used by the hero.
 *  - `Reveal` / `Stagger` / `StaggerItem` — *scroll-triggered* reveals, played
 *    when the element crosses into the viewport. Used by every section below
 *    the hero.
 *
 * This is the one place Framer Motion earns its payload: staggers where each
 * child's delay derives from its position in a shared sequence. CSS
 * animation-delay can fake it, but not while staying in step with content that
 * changes length between locales — Bangla and English copy wrap to different
 * heights, and the spring settles correctly for both.
 *
 * Long result lists deliberately do NOT use this; they stay on CSS keyframes so
 * a 60-item list costs no JS animation work on a budget phone.
 *
 * Every component here collapses to a plain <div> under reduced motion — no
 * wrapper animation, no viewport observer, content present immediately. That
 * branch is dormant on this site; see lib/motion.ts.
 */

/** The house easing curve, shared with `ease-out` in tailwind.config.ts. */
const EASE = [0.22, 1, 0.36, 1] as const

/*
 * WHEN A REVEAL IS ALLOWED TO START.
 *
 * This used to be `{ once: true, amount: 0.2 }` and the comment above it
 * claimed it fired "a little before the element is fully in view". It did not.
 * `amount` is an IntersectionObserver threshold, so 0.2 means a fifth of the
 * element had to be *inside* the viewport before anything moved. The reveal
 * therefore always began after the reader could already see the thing that was
 * about to move — which is the "it sat there, then caught up" complaint.
 *
 * It was worst on a phone, for a reason that is easy to miss on a desktop: the
 * card grids are `sm:grid-cols-2 lg:grid-cols-3`, so on a narrow screen they
 * collapse to one very tall column. `amount` is a fraction of the *observed
 * element*, and for a stagger that element is the whole grid. A fifth of a
 * three-row desktop grid is a sliver; a fifth of the same grid as an eight-card
 * single column is most of a screen. Measured at 390x844, cards were starting
 * their entrance 500-1000px above the top of the viewport.
 *
 * Two changes, and neither one touches what the animation looks like:
 *
 *   `amount: 0` — any part of the element counts, rather than a fraction of it.
 *   This is what stops a tall container from holding its own children back.
 *
 *   `margin: PRE_ROLL` — a positive bottom rootMargin, which grows the
 *   observer's root box downward so an element is called in view while it is
 *   still below the fold. This is the pre-activation range: by the time the
 *   card is actually on screen its entrance is already part-way through, so it
 *   arrives moving instead of arriving and then starting.
 *
 * A percentage rather than a pixel count, so the head start scales with the
 * device: about 210px of pre-roll on a 390x844 phone, about 250px on a laptop.
 * At a brisk 1000px/s thumb flick that is roughly 200ms of runway, which is
 * most of a 550ms entrance already spent before the card is visible.
 *
 * `once: true` is unchanged — a reveal still never replays on scroll back.
 */
const PRE_ROLL = '0px 0px 25% 0px'
const VIEWPORT = { once: true, amount: 0, margin: PRE_ROLL } as const

/* ------------------------------------------------------------------ */
/* Entrance (on mount)                                                 */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* Scroll-triggered                                                    */
/* ------------------------------------------------------------------ */

/**
 * How an element arrives. Sections pick different ones deliberately — a page
 * where everything fades up from below reads as a template.
 */
export type RevealMotion =
  | 'up'
  | 'down'
  | 'left' // enters from the left
  | 'right' // enters from the right
  | 'scale'
  | 'blur'
  | 'clip' // wipes open left to right
  | 'fade'

function hiddenState(motion: RevealMotion, distance: number) {
  switch (motion) {
    case 'up':
      return { opacity: 0, y: distance }
    case 'down':
      return { opacity: 0, y: -distance }
    case 'left':
      return { opacity: 0, x: -distance }
    case 'right':
      return { opacity: 0, x: distance }
    case 'scale':
      return { opacity: 0, scale: 0.94, y: distance * 0.4 }
    case 'blur':
      // Blur is the most expensive reveal we use, so it is reserved for a
      // single headline per section rather than every card in a grid.
      return { opacity: 0, y: distance * 0.5, filter: 'blur(10px)' }
    case 'clip':
      // A wipe rather than a move. Note this clips overflow for the duration,
      // so it belongs on text and rules — not on anything casting a shadow.
      return { opacity: 1, clipPath: 'inset(0 100% 0 0)' }
    case 'fade':
      return { opacity: 0 }
  }
}

function shownState(motion: RevealMotion) {
  return {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    ...(motion === 'blur' ? { filter: 'blur(0px)' } : null),
    ...(motion === 'clip' ? { clipPath: 'inset(0 0% 0 0)' } : null),
  }
}

function buildVariants(
  motion: RevealMotion,
  distance: number,
  duration: number,
  delay: number,
): Variants {
  return {
    hidden: hiddenState(motion, distance),
    show: {
      ...shownState(motion),
      transition: { duration, delay, ease: EASE },
    },
  }
}

export function Reveal({
  children,
  className,
  motion = 'up',
  distance = 28,
  duration = 0.65,
  delay = 0,
  amount = VIEWPORT.amount,
}: {
  children: ReactNode
  className?: string
  motion?: RevealMotion
  /** Travel in px. Kept small — a long slide reads as a page that is loading. */
  distance?: number
  duration?: number
  delay?: number
  /** Fraction of the element that must be visible before it plays. */
  amount?: number
}) {
  const reduced = useReducedMotion()

  if (reduced) return <div className={className}>{children}</div>

  return (
    <m.div
      className={className}
      variants={buildVariants(motion, distance, duration, delay)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount, margin: PRE_ROLL }}
    >
      {children}
    </m.div>
  )
}

/* ------------------------------------------------------------------ */
/* Scroll-triggered stagger                                            */
/* ------------------------------------------------------------------ */

type StaggerTag = 'div' | 'ul' | 'ol' | 'nav'

const STAGGER_TAGS = { div: m.div, ul: m.ul, ol: m.ol, nav: m.nav } as const
const ITEM_TAGS = { div: m.div, li: m.li } as const

/*
 * The longest a group is allowed to take to walk all of its children.
 *
 * `staggerChildren` is a wall-clock gap, and it has nothing to do with where
 * the page has scrolled to. Eight children at 0.06s is a 420ms tail, and a
 * thumb flick moves the page about 1000px/s — so the last card in that group
 * began its entrance roughly 400px after its own arrival, which is the exact
 * shape of "it waited and then caught up". The pre-roll above buys back about
 * 200ms of that; this caps the rest.
 *
 * Small groups are untouched: three cards at 0.09s is 180ms, already inside the
 * budget, so the rhythm the design was tuned with survives. Only the long rails
 * get compressed, and they are the ones that were visibly late.
 */
const MAX_STAGGER_TAIL = 0.26

const staggerContainer = (gap: number, delay: number, count: number): Variants => {
  const steps = Math.max(count - 1, 1)
  const staggerChildren = Math.min(gap, MAX_STAGGER_TAIL / steps)
  return {
    hidden: {},
    show: { transition: { staggerChildren, delayChildren: delay } },
  }
}

/**
 * Parent of a set of `StaggerItem`s. Renders as whatever tag the layout needs
 * so a stagger can wrap a real `<ul>` or the `.rail` flex row directly, without
 * an extra div breaking `.rail > *`.
 */
export function Stagger({
  children,
  className,
  as = 'div',
  gap = 0.075,
  delay = 0,
  amount = VIEWPORT.amount,
  ...rest
}: {
  children: ReactNode
  className?: string
  as?: StaggerTag
  /** Seconds between consecutive children. */
  gap?: number
  delay?: number
  amount?: number
  'aria-label'?: string
}) {
  const reduced = useReducedMotion()
  const Tag = STAGGER_TAGS[as]
  const Plain = as

  if (reduced) {
    return (
      <Plain className={className} {...rest}>
        {children}
      </Plain>
    )
  }

  return (
    <Tag
      className={className}
      variants={staggerContainer(gap, delay, Children.count(children))}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount, margin: PRE_ROLL }}
      {...rest}
    >
      {children}
    </Tag>
  )
}

export function StaggerItem({
  children,
  className,
  as = 'div',
  motion = 'up',
  distance = 22,
  duration = 0.55,
}: {
  children: ReactNode
  className?: string
  as?: keyof typeof ITEM_TAGS
  motion?: RevealMotion
  distance?: number
  duration?: number
}) {
  const reduced = useReducedMotion()
  const Tag = ITEM_TAGS[as]
  const Plain = as

  if (reduced) return <Plain className={className}>{children}</Plain>

  return (
    <Tag className={className} variants={buildVariants(motion, distance, duration, 0)}>
      {children}
    </Tag>
  )
}

export { EASE as REVEAL_EASE }
