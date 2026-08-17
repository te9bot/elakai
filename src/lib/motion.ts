import { useEffect } from 'react'

/* ==========================================================================
 * Whether the site runs in reduced motion. One function, one answer, one place
 * to change it.
 *
 * IT IS ALWAYS FULL.
 *
 * ELAKAI plays its motion for everyone: the parallax, the map backdrop's
 * drift, the contributor page's map, the logo intro, the marquees, the
 * count-ups and the smooth scrolling. There is no setting, no stored
 * preference, and no branch on `prefers-reduced-motion`. Asked for explicitly
 * by the site owner.
 *
 * WHAT WAS HERE BEFORE
 *
 * A three-state preference — follow the system, force full, force reduced —
 * backed by localStorage and surfaced as a control in the footer. That control
 * and its storage key are gone. The history is worth one paragraph because it
 * is the reason this file looks over-built for what it now does:
 *
 * The function originally returned a hard `false`, then was changed to honour
 * the OS, then gained the three-state override because those two turned out to
 * conflict for the person who asked for both — the machine ELAKAI is developed
 * on has `prefers-reduced-motion: reduce` switched on, so "respect the OS"
 * showed the owner a completely static site and read as though the animation
 * work had been deleted. The override resolved that. Removing the control
 * resolves it the other way, permanently.
 *
 * WHAT THIS COSTS, PLAINLY
 *
 * `prefers-reduced-motion` is set by people who get migraines, nausea or
 * vestibular symptoms from parallax and drifting backgrounds. Ignoring it
 * means those visitors get the full experience with no way to turn it down.
 * That is a real cost and it is being accepted deliberately rather than
 * overlooked.
 *
 * HOW TO PUT IT BACK
 *
 * Everything funnels through the two functions below, so it is a small change:
 *
 *   1. `useReducedMotion` returns `window.matchMedia('(prefers-reduced-motion:
 *      reduce)').matches` instead of `false` — ideally through
 *      `useSyncExternalStore` so a mid-session OS change reaches the UI.
 *   2. `useMotionAttribute` writes `reduced` when it does.
 *   3. Add back an `html[data-motion='reduced']` block in src/index.css that
 *      damps animation and transition durations. One rule covers every
 *      ambient animation at once; do not reach for `motion-safe:` again, which
 *      never worked here — see the note in tailwind.config.ts.
 *
 * Nothing else branches on motion. Every consumer — lib/parallax.ts,
 * lib/smooth-scroll.ts, components/home/kushtia-map.tsx, the logo intro, the
 * count-ups, App.tsx's MotionConfig — reads `useReducedMotion`, and the CSS
 * half reads the attribute. Those two are the whole surface.
 * ========================================================================== */

/**
 * Always `false`.
 *
 * Typed as `boolean` rather than `false` on purpose: every consumer still has
 * its reduced-motion branch written and compiling, so restoring the preference
 * is a change to this function and nothing else. Narrowing the return type to
 * the literal would let TypeScript prune those branches as unreachable and
 * they would rot.
 */
export function useReducedMotion(): boolean {
  return false
}

/**
 * Publishes the answer to CSS as `<html data-motion="full">`.
 *
 * Nothing keys off it today — the ambient animations are written plain and
 * always apply, and the CSS reduced block is gone — so this is a hook for the
 * restore path rather than something load-bearing right now. It is kept
 * because it is the seam: step 3 above adds one `html[data-motion='reduced']`
 * rule and it immediately has something true to match on, with no sweep
 * through the markup. It also means anything inspecting the DOM sees a
 * definite state rather than an absent attribute.
 *
 * Called once, from App.
 */
export function useMotionAttribute(): void {
  useEffect(() => {
    document.documentElement.dataset.motion = 'full'
  }, [])
}
