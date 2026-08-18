import { useEffect, useSyncExternalStore } from 'react'

/* ==========================================================================
 * Whether the site runs in reduced motion. One function, one answer, one place
 * to change it.
 *
 * IT NOW FOLLOWS THE OPERATING SYSTEM.
 *
 * `prefers-reduced-motion: reduce` is set by people who get migraines, nausea
 * or vestibular symptoms from parallax and drifting backgrounds. This site used
 * to ignore it — every animation played for everyone, by explicit decision —
 * and that decision has been reversed by request.
 *
 * WHAT THIS DOES AND DOES NOT CHANGE
 *
 * For everyone who has NOT asked their operating system for less motion —
 * which is nearly everybody — absolutely nothing changes. The parallax, the map
 * backdrop's drift, the logo intro, the marquees, the count-ups and the smooth
 * scrolling all run exactly as they did. There is no new branch in their path;
 * `matches` is false and every consumer takes the same road it took before.
 *
 * For someone who HAS asked: decorative movement stops, the site keeps its
 * layout, its colour, its typography, its glow and its content. It is the same
 * site standing still, not a different site. Nothing becomes unreachable and no
 * control stops working.
 *
 * WHY THE HISTORY IS WORTH ONE PARAGRAPH
 *
 * This function has been a hard `false`, then the OS query, then a three-state
 * override backed by localStorage, then a hard `false` again. The reason it
 * oscillated: the machine ELAKAI is developed on has the OS flag switched on,
 * so honouring it showed the owner a completely static site and read as though
 * the animation work had been deleted. That is worth knowing before changing
 * this line again — if the site looks frozen on your machine, check
 * Settings → Accessibility → Display → Reduce motion before assuming a bug.
 *
 * WHERE THE ANSWER IS CONSUMED
 *
 * Every consumer already had its reduced branch written: lib/parallax.ts
 * (`useDepth` returns 0), lib/smooth-scroll.ts (native scrolling),
 * components/reveal.tsx (plain divs), components/infinite-track.tsx (a static
 * scrollable rail), components/home/kushtia-map.tsx (a still map with its
 * focus light placed rather than animated), the logo intro, the sign-in
 * transition and the count-ups. The CSS half reads `<html data-motion>`, which
 * `useMotionAttribute` below publishes, plus the media query directly so the
 * damping applies before any JavaScript has run.
 * ========================================================================== */

const QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Subscribed rather than read once, so turning the OS setting on or off during
 * a session reaches the UI without a reload. `useSyncExternalStore` is the hook
 * for exactly this shape — an external, mutable source read during render —
 * and it keeps the value consistent across every component in one pass instead
 * of letting them re-read it at different moments.
 */
function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const mql = window.matchMedia(QUERY)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

function getSnapshot(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia(QUERY).matches
}

/** False on the server, where there is no OS to ask and no motion to reduce. */
function getServerSnapshot(): boolean {
  return false
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/**
 * Publishes the answer to CSS as `<html data-motion="full" | "reduced">`.
 *
 * The CSS block in src/index.css is keyed on the media query AND on this
 * attribute — `html:not([data-motion='full'])` inside the query — for two
 * reasons. It damps before this effect has run, so there is no frame of motion
 * on first paint for someone who asked for none; and if a future in-app
 * override is added, writing `full` here is the whole of switching it back on.
 *
 * Called once, from App.
 */
export function useMotionAttribute(): void {
  const reduced = useReducedMotion()

  useEffect(() => {
    document.documentElement.dataset.motion = reduced ? 'reduced' : 'full'
  }, [reduced])
}
