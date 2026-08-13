/**
 * Whether the site runs in reduced motion. One function, one answer, one place
 * to change it.
 *
 * ELAKAI's answer is **no**: the entrance choreography, the parallax, the
 * count-ups, the logo intro and the two infinite bands all play for everyone,
 * whatever the operating system's accessibility panel says. That is a
 * deliberate product decision by the site owner, not an oversight, and it is
 * why every component imports this rather than framer-motion's
 * `useReducedMotion` — there is no second opinion anywhere in the tree.
 *
 * What that costs, stated honestly so nobody has to rediscover it: the OS
 * setting exists because for some people large or continuous motion causes
 * nausea, dizziness or migraine, and this site no longer offers them a way out.
 * Everything else that setting normally reaches is off too — the `motion-safe:`
 * utilities (redefined in `tailwind.config.ts` to apply unconditionally), the
 * blanket transition shortening that used to sit in `index.css`, and framer's
 * own handling (pinned in `App.tsx`).
 *
 * The reduced-motion code paths are all still there, in every component, behind
 * this one call. Returning the media query again is the whole of putting it
 * back:
 *
 * ```ts
 * import { useReducedMotion as useOsPreference } from 'framer-motion'
 * export const useReducedMotion = (): boolean => useOsPreference() ?? false
 * ```
 *
 * ...along with reverting the two `motion-safe` / `motion-reduce` variants in
 * the Tailwind config and `reducedMotion` in `App.tsx`.
 */

/** Typed as `boolean`, not `false`, so the fallbacks behind it stay live code. */
export function useReducedMotion(): boolean {
  return false
}
