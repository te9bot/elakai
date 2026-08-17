import { Sparkles } from 'lucide-react'

import {
  osPrefersReducedMotion,
  setMotionPreference,
  useMotionPreference,
  useReducedMotion,
  type MotionPreference,
} from '@/lib/motion'
import { cn } from '@/lib/utils'

/* ==========================================================================
 * The motion control.
 *
 * WHY THIS EXISTS AT ALL
 *
 * `prefers-reduced-motion` is a good default and a bad only-option. It is a
 * single OS-wide switch that people turn on for reasons that have nothing to do
 * with this site — to save battery, because a different application was making
 * them queasy, because it came on with a "reduce transparency" setting they
 * actually wanted — and once it is on, every site they visit becomes still,
 * with no way to say "not this one".
 *
 * So the OS preference is followed by default, because that is the accessible
 * behaviour and the right one, and this exists so it is not a trap.
 *
 * WHY IT IS IN THE FOOTER
 *
 * The header already carries language, theme, search and Contribute, and it ran
 * out of room at 1024px once Contribute arrived. This is a set-once preference,
 * not something anyone reaches for twice, and the footer is where the site's
 * other quiet controls belong. It is also the last thing in the tab order,
 * which is the correct place for a setting rather than an action.
 * ========================================================================== */

const OPTIONS: { id: MotionPreference; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'full', label: 'Full' },
  { id: 'reduced', label: 'Reduced' },
]

export function MotionPreferenceControl() {
  const preference = useMotionPreference()
  const reduced = useReducedMotion()
  const osReduced = osPrefersReducedMotion()

  return (
    <div>
      <h2 className="flex items-center gap-1.5 text-micro uppercase text-ink-subtle">
        <Sparkles className="size-3.5" aria-hidden="true" />
        Animation
      </h2>

      <div
        role="radiogroup"
        aria-label="Animation preference"
        className="mt-3 inline-flex rounded-pill bg-surface-2 p-1"
      >
        {OPTIONS.map((option) => {
          const active = preference === option.id
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setMotionPreference(option.id)}
              className={cn(
                'rounded-pill px-3 py-1.5 text-meta font-semibold transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                active
                  ? 'bg-surface text-ink shadow-card'
                  : 'text-ink-muted hover:text-ink',
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      {/*
       * Says what the current choice actually results in, rather than leaving
       * "System" to be guessed at. On a machine with the OS flag set, "System"
       * and "Reduced" do the same thing, and a person wondering why the site is
       * still needs to be told that here rather than having to find their
       * operating system's accessibility panel to work it out.
       */}
      <p className="mt-2 max-w-[30ch] text-meta text-pretty text-ink-subtle">
        {preference === 'system'
          ? osReduced
            ? 'Your device asks for reduced motion, so parallax and background movement are off.'
            : 'Following your device setting. Parallax and background movement are on.'
          : reduced
            ? 'Parallax and background movement are off on this device.'
            : 'Parallax and background movement are on, whatever your device asks for.'}
      </p>
    </div>
  )
}
