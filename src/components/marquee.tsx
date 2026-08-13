import { memo, type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Seamless infinite marquee.
 *
 * Deliberately not a Framer Motion component: this thing runs for the entire
 * life of the page, and a CSS keyframe on a single promoted transform costs the
 * main thread nothing after the first frame. No rAF loop, no React state, no
 * re-render — see `.marquee` in index.css for how the seam is avoided.
 *
 * Accessibility: the whole strip is `aria-hidden`, and callers must render its
 * items with `tabIndex={-1}`. A marquee necessarily paints every item several
 * times, and duplicate links in the tab order — or read out three times by a
 * screen reader — are worse than no links at all. Nothing is *only* reachable
 * here: every category in the strip also appears as a real focusable link in the
 * hero chips, the category grid, or the nav. It is a shortcut for pointer users.
 *
 * The children are rendered `copies` times, so keep them cheap and side-effect
 * free.
 */
export const Marquee = memo(function Marquee({
  children,
  /** Seconds for one full loop. Higher is slower. */
  speed = 42,
  /**
   * How many times the content is repeated across the track.
   *
   * Only (copies - 1) groups are guaranteed to be on screen at the end of a
   * loop, so this has to be high enough that (copies - 1) × content width
   * exceeds the widest viewport you care about. Two is only enough when a
   * single pass of the content is already wider than the screen.
   */
  copies = 3,
  reverse = false,
  pauseOnHover = true,
  /** Gap between items, as a CSS length. Must be a length, not a keyword. */
  gap = '0.75rem',
  /** Soften both ends into the background. */
  fade = true,
  className,
  trackClassName,
}: {
  children: ReactNode
  speed?: number
  copies?: number
  reverse?: boolean
  pauseOnHover?: boolean
  gap?: string
  fade?: boolean
  className?: string
  trackClassName?: string
}) {
  return (
    <div
      aria-hidden="true"
      data-pause-on-hover={pauseOnHover ? 'true' : 'false'}
      className={cn('marquee', fade && 'edge-fade-x', className)}
      style={
        {
          '--marquee-duration': `${speed}s`,
          '--marquee-gap': gap,
          '--marquee-copies': copies,
        } as CSSProperties
      }
    >
      <div
        className={cn('marquee-track', trackClassName)}
        // `reverse` rather than a negative offset: the keyframe stays a single
        // definition and both directions share one compositor layer setup.
        style={reverse ? { animationDirection: 'reverse' } : undefined}
      >
        {/* Copies past the first are pure seam-hiding. Reduced motion hides
            them and leaves one readable row behind. */}
        {Array.from({ length: copies }).map((_, i) => (
          <div className="marquee-group" key={i}>
            {children}
          </div>
        ))}
      </div>
    </div>
  )
})
