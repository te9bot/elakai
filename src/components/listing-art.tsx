import { artGradient } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Icon } from '@/components/icon'
import type { IconName } from '@/data/types'

/**
 * Stand-in for photography. Deterministic per seed, drawn entirely in CSS/SVG,
 * so there is no image request, no decode cost, and no layout shift — all of
 * which matter more than a stock photo would on a slow connection.
 */
export function ListingArt({
  seed,
  icon,
  className,
  rounded = true,
}: {
  seed: number
  icon: IconName
  className?: string
  rounded?: boolean
}) {
  const { from, to, angle } = artGradient(seed)

  return (
    <div
      className={cn(
        'relative isolate overflow-hidden bg-surface-2',
        rounded && 'rounded-control',
        className,
      )}
      style={{ backgroundImage: `linear-gradient(${angle}deg, ${from}, ${to})` }}
      aria-hidden="true"
    >
      {/* Faint contour lines — reads as a map fragment without costing a request. */}
      <svg
        className="absolute inset-0 size-full opacity-[0.18]"
        viewBox="0 0 200 200"
        preserveAspectRatio="xMidYMid slice"
      >
        <g fill="none" stroke="#fff" strokeWidth="1.25">
          <circle cx={40 + (seed % 5) * 22} cy={60 + (seed % 3) * 18} r="26" />
          <circle cx={40 + (seed % 5) * 22} cy={60 + (seed % 3) * 18} r="46" />
          <circle cx={40 + (seed % 5) * 22} cy={60 + (seed % 3) * 18} r="70" />
          <path d={`M0 ${150 - (seed % 4) * 12} Q 60 ${110 - (seed % 3) * 10} 120 ${146} T 200 ${128}`} />
          <path d={`M0 ${176 - (seed % 4) * 10} Q 70 ${140 - (seed % 3) * 8} 130 ${170} T 200 ${156}`} />
        </g>
      </svg>

      <div className="absolute inset-0 grid place-items-center">
        <Icon name={icon} className="size-10 text-white/85" strokeWidth={1.6} />
      </div>

      {/* Bottom scrim so overlaid text stays legible on every gradient. */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/25 to-transparent" />
    </div>
  )
}
