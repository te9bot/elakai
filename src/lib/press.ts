/* ==========================================================================
 * Press feedback.
 *
 * One function, and the reason it is a function rather than a CSS
 * `:active` rule is worth stating: `:active` ends when the finger lifts. On a
 * fast tap that is forty milliseconds, which is not long enough to see, and on
 * a click that opens a dialog the button is gone before the style applies at
 * all. §19 asks for the press to be felt, so it is played rather than held.
 *
 * WHAT THIS IS NOT
 *
 * It is not a state change and it does not mean anything happened. §18 is
 * explicit that approval's success animation waits for Supabase; this is the
 * acknowledgement that the *button* was pressed, which is true the instant it
 * is true and needs no confirmation from anywhere.
 *
 * Kept separate from lib/toss.ts because that file is about one specific
 * interaction and this is used by two.
 * ========================================================================== */

/**
 * §19 — a 90ms compress and release. No overshoot, no bounce.
 *
 * `fill: 'none'` leaves the element with no inline transform when it is over,
 * so a button that is pressed twice starts from the same place both times and
 * nothing accumulates (§56).
 *
 * Silently does nothing under reduced motion and silently does nothing when the
 * element is gone — both are ordinary, and neither is worth a branch at the
 * call site.
 */
export function pressPulse(element: HTMLElement | null, reduced = false): void {
  if (!element || reduced || typeof element.animate !== 'function') return

  element.animate(
    [
      { transform: 'scale(1)' },
      { transform: 'scale(0.96)', offset: 0.45 },
      { transform: 'scale(1)' },
    ],
    { duration: 90, easing: 'ease-out', fill: 'none' },
  )
}
