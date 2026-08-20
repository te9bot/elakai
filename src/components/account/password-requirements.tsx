import { AnimatePresence, m } from 'framer-motion'
import { Check, ShieldCheck } from 'lucide-react'

import type { PasswordEvaluation } from '@/lib/password'
import { cn } from '@/lib/utils'

/* ==========================================================================
 * The live password panel.
 *
 * Nothing here is new furniture: the type scale is `text-meta`, the colours are
 * `success` and `ink-subtle`, the icon set is the one already in the app, and
 * the whole thing sits inside the existing <Field> under the password input.
 * §41 asks for the checklist; it does not ask for a new visual language, and
 * this deliberately introduces none.
 *
 * REQUIRED AND RECOMMENDED READ DIFFERENTLY
 *
 * The length rule is the only one that stops the form, so it is the only one
 * with an emphasis: unmet, it is `text-ink-muted` like a live instruction.
 * The other four are `text-ink-subtle` — present, legible, clearly optional.
 * A panel that shouted five identical demands would teach people that four of
 * them can be ignored, which is the opposite of what the fifth needs.
 *
 * THE ANIMATION IS 140ms AND DOES NOT BOUNCE (§42)
 *
 * Ticking a line is confirmation, not celebration, and there are five of them
 * on one screen. A spring with overshoot on each would turn typing a password
 * into a fairground. The tick scales 0.8 → 1 with a plain ease-out over 140ms,
 * inside the 120–180ms the brief asks for, and the row it sits in does not move
 * at all — only the marker changes, so the list never reflows under the cursor.
 *
 * `initial={false}` on the AnimatePresence is what stops all five animating at
 * once when a password manager fills the field: on the very first commit the
 * already-met rules appear ticked rather than tick themselves.
 *
 * REDUCED MOTION is handled a level up. <MotionConfig reducedMotion="user"> in
 * App.tsx makes every `m` element here settle on its target frame instantly,
 * so somebody who asked for less motion still sees the state change — just not
 * the transition into it. Nothing is unreachable and no information is lost.
 * ========================================================================== */

export function PasswordRequirements({
  evaluation,
  /** Wired into the field's aria-describedby so the panel is announced with it. */
  id,
  className,
}: {
  evaluation: PasswordEvaluation
  id?: string
  className?: string
}) {
  const { rules, valid, strong, lengthy } = evaluation

  /*
   * Once the password is long enough, the composition advice retires.
   *
   * A twenty-character passphrase does not need three greyed-out lines telling
   * it to add a symbol — that reads as failure against a password that is
   * already better than anything the checklist would have produced. The length
   * rule stays visible because it is the one that is actually required.
   */
  const shown = lengthy ? rules.filter((r) => r.required) : rules

  return (
    <div
      id={id}
      className={cn('space-y-1.5', className)}
      /*
       * Polite, and on the container rather than on each row: a screen reader
       * should hear "at least 8 characters, met" as the requirement is
       * satisfied, not a stream of announcements on every keystroke.
       */
      aria-live="polite"
    >
      <ul className="space-y-1">
        {shown.map((rule) => (
          <li
            key={rule.id}
            className={cn(
              'flex items-center gap-2 text-meta transition-colors duration-150',
              rule.met
                ? 'text-success-ink'
                : rule.required
                  ? 'text-ink-muted'
                  : 'text-ink-subtle',
            )}
          >
            <span
              className={cn(
                'relative grid size-4 shrink-0 place-items-center rounded-full border transition-colors duration-150',
                rule.met ? 'border-success bg-success-soft' : 'border-line',
              )}
              aria-hidden="true"
            >
              <AnimatePresence initial={false}>
                {rule.met && (
                  <m.span
                    key="tick"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute inset-0 grid place-items-center"
                  >
                    <Check className="size-2.5 text-success" strokeWidth={3.5} />
                  </m.span>
                )}
              </AnimatePresence>
            </span>

            {/*
             * The label carries the state for anyone not seeing the marker.
             * `sr-only` rather than a title attribute: titles are not announced
             * reliably and are invisible on touch.
             */}
            <span>{rule.label}</span>
            <span className="sr-only">{rule.met ? ' — met' : ' — not met yet'}</span>
          </li>
        ))}
      </ul>

      {/*
       * §41's closing line, and it says which of the two things happened.
       * "Meets the requirements" is the truth once the length rule passes;
       * "strong" is reserved for when the recommendations are in too, because
       * telling somebody their eight lowercase letters are strong is a lie the
       * panel would be caught in.
       */}
      <AnimatePresence initial={false}>
        {valid && (
          <m.p
            key="summary"
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-1.5 pt-0.5 text-meta font-semibold text-success-ink"
          >
            <ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
            {strong || lengthy
              ? 'Password meets the requirements.'
              : 'Password meets the requirements. A number or symbol would make it stronger.'}
          </m.p>
        )}
      </AnimatePresence>
    </div>
  )
}
