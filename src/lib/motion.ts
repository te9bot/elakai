import { useEffect, useSyncExternalStore } from 'react'

import { STORAGE_KEYS } from './config'

/* ==========================================================================
 * Whether the site runs in reduced motion. One function, one answer, one place
 * to change it.
 *
 * THREE STATES, NOT TWO
 *
 *   system   follow `prefers-reduced-motion`. The default.
 *   full     play everything, whatever the OS says.
 *   reduced  play nothing non-essential, whatever the OS says.
 *
 * WHY THE OVERRIDE EXISTS, AND IT IS NOT A HEDGE
 *
 * This function used to return a hard `false` for everyone. That was recorded
 * as a deliberate decision by the site owner — ELAKAI plays its motion whatever
 * the accessibility panel says — and honouring the OS preference instead was
 * asked for twice, so it is honoured.
 *
 * But there is a fact behind that original decision worth writing down, because
 * it explains why a plain boolean is not enough: the machine ELAKAI is built on
 * has `prefers-reduced-motion: reduce` switched on. So "just respect the OS" and
 * "keep the animations" are in direct conflict *for the person who asked for
 * both*. Following the OS alone would have shown the owner a completely static
 * site and read as though the animation work had been deleted.
 *
 * A stored preference resolves it honestly rather than by picking a side.
 * Someone who has asked their device for less motion gets less motion, which is
 * the accessible default and the correct one. Anyone who wants the full
 * experience regardless — including on a machine whose OS flag is set for
 * unrelated reasons — can say so, once, and the site remembers.
 *
 * This is exactly the shape `lib/theme.tsx` already uses for dark mode: a
 * stored choice, falling back to the media query. Same convention, same
 * storage key namespace, no new pattern to learn.
 *
 * WHAT "REDUCED" TURNS OFF
 *
 * The parallax (`useDepth` returns 0, so every displacement multiplies away),
 * the map backdrop's drift, the logo intro's travel, the count-ups, the smooth
 * scrolling, and the `motion-safe:` ambient animations.
 *
 * What it does not turn off: anything that carries meaning. Spinners still
 * spin, the sign-in transition still plays as a brief hold, focus rings still
 * appear. Reduced motion is not "no feedback".
 *
 * NO PROVIDER
 *
 * An external store read through `useSyncExternalStore` rather than a context,
 * so this stays importable from anywhere — including `lib/parallax.ts`, which
 * is a plain module — and so changing the setting updates every consumer in one
 * pass without another wrapper in App.tsx.
 * ========================================================================== */

export type MotionPreference = 'system' | 'full' | 'reduced'

const QUERY = '(prefers-reduced-motion: reduce)'

function isPreference(value: string | null): value is MotionPreference {
  return value === 'system' || value === 'full' || value === 'reduced'
}

function read(): MotionPreference {
  if (typeof window === 'undefined') return 'system'
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.motion)
    if (isPreference(stored)) return stored
  } catch {
    /* private mode */
  }
  return 'system'
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

const listeners = new Set<() => void>()

let preference: MotionPreference = read()

function emit() {
  for (const fn of [...listeners]) fn()
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn)

  // The OS setting can change while the page is open, and under 'system' that
  // has to reach the UI. One media-query listener for the whole app, attached
  // with the first subscriber.
  const media = typeof window !== 'undefined' ? window.matchMedia(QUERY) : null
  const onChange = () => emit()
  media?.addEventListener('change', onChange)

  // Another tab changing the preference should not leave this one disagreeing.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEYS.motion) return
    preference = read()
    emit()
  }
  window.addEventListener('storage', onStorage)

  return () => {
    listeners.delete(fn)
    media?.removeEventListener('change', onChange)
    window.removeEventListener('storage', onStorage)
  }
}

/**
 * The resolved answer.
 *
 * Read fresh from the media query each time rather than cached, so `snapshot`
 * changes when the OS setting does and `useSyncExternalStore` re-renders. It is
 * a `matchMedia` read of an already-parsed query — cheap, and not a layout
 * read.
 */
function snapshot(): boolean {
  if (preference === 'full') return false
  if (preference === 'reduced') return true
  if (typeof window === 'undefined') return false
  return window.matchMedia(QUERY).matches
}

/** Server/first-paint value. The full experience, matching the theme provider. */
function serverSnapshot(): boolean {
  return false
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/** Typed as `boolean`, not a literal, so the fallbacks behind it stay live. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot)
}

/**
 * Publishes the resolved answer to CSS as `<html data-motion="full|reduced">`.
 *
 * WHY THIS IS NECESSARY
 *
 * Without it the preference is only half-implemented, and the half that is
 * missing is the visible one. JavaScript consumers read `useReducedMotion`, but
 * the ~19 `motion-safe:` utilities in the markup are CSS, and CSS cannot see a
 * localStorage value. Left on the bare `prefers-reduced-motion` media query
 * they would keep answering to the OS — so somebody on a machine with the OS
 * flag set could choose Full, watch the parallax come back, and still have
 * every ambient animation stay switched off, with nothing to explain why.
 *
 * The attribute makes this module the single source of truth for both
 * languages. `tailwind.config.ts` defines `motion-safe:` and `motion-reduce:`
 * against it, and `index.css` keys `scroll-behavior` off it.
 *
 * Called once, from App. It is a hook rather than a subscription set up at
 * module load so it participates in React's lifecycle and stays correct across
 * a fast refresh.
 */
export function useMotionAttribute(): void {
  const reduced = useReducedMotion()
  useEffect(() => {
    document.documentElement.dataset.motion = reduced ? 'reduced' : 'full'
  }, [reduced])
}

/** The raw preference, for the control that sets it. */
export function useMotionPreference(): MotionPreference {
  return useSyncExternalStore(
    subscribe,
    () => preference,
    () => 'system' as MotionPreference,
  )
}

export function setMotionPreference(next: MotionPreference): void {
  preference = next
  try {
    // 'system' clears the key rather than storing the word, so a visitor who
    // never chose is indistinguishable from one who chose the default — and a
    // future change to what the default means reaches both.
    if (next === 'system') localStorage.removeItem(STORAGE_KEYS.motion)
    else localStorage.setItem(STORAGE_KEYS.motion, next)
  } catch {
    /* private mode — the choice still applies for this page */
  }
  emit()
}

/**
 * Whether the OS is currently asking for reduced motion.
 *
 * Only for the settings control, so it can label the 'system' option with what
 * following the system actually means right now. Nothing else should branch on
 * this — `useReducedMotion` is the answer.
 */
export function osPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia(QUERY).matches
}
