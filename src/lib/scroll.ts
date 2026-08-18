/* ==========================================================================
 * The one scroll pipeline for the whole site.
 *
 *      wheel / thumb / trackpad / scrollbar / Page Down
 *                          |
 *                 the browser scrolls              <- not JavaScript
 *                          |
 *                 passive 'scroll' listener        <- records a number
 *                          |
 *              one requestAnimationFrame           <- at most one in flight
 *                          |
 *      +-------------------+-------------------+
 *      |                   |                   |
 *   map layers          the glow            the header
 *
 * WHAT THIS REPLACED, AND WHY IT MATTERS
 *
 * Until now this module had a second mode. A Lenis instance owned the page's
 * scrolling on desktop: it called `preventDefault()` on wheel input, converted
 * the delta into a target, interpolated toward it every frame, wrote the
 * document position itself, and published the interpolated value here through
 * `publishScroll()`. The subscribers below then ran from *that* number rather
 * than from the browser's.
 *
 * The cost was not the interpolation. It was that the browser could not begin
 * scrolling until JavaScript had run: input landed on a main thread that was
 * also drawing a full-viewport SVG map, and the first frame of every gesture
 * waited behind that work. That is the stutter — it is worst exactly when you
 * start scrolling, which is when the main thread is busiest.
 *
 * Native scrolling has none of that shape. The compositor scrolls the page
 * whether or not the main thread is free, so the page moves on the same frame
 * the wheel turns. The visuals then follow from a passive listener; if a frame
 * is late the parallax is a frame late, and the scroll itself never is.
 *
 * THE RULES THIS FILE KEEPS
 *
 *   * The listener is passive and does no work beyond reading `scrollY` — the
 *     one property the browser can answer without flushing style or layout.
 *   * At most one frame is ever scheduled. A burst of scroll events coalesces
 *     into a single visual update.
 *   * Subscribers receive a number and are expected to write a transform. One
 *     that calls `setState` has moved the cost into React's reconciliation and
 *     defeated the point.
 *   * Nothing here writes the scroll position. `scrollY` is the browser's, and
 *     it is the truth.
 *
 * WHAT IT DELIBERATELY DOES NOT MANAGE
 *
 * `lib/infinite-track.ts` keeps its own listener. It is already the good
 * version of this — an IntersectionObserver starts and stops it, so it is only
 * subscribed while its band is on screen, and it needs the raw value inside its
 * own physics loop rather than a frame-batched one. Folding it in would mean it
 * ran while off screen, which is worse. It is not an oversight.
 * ========================================================================== */

export type ScrollSubscriber = (scrollY: number) => void

const subscribers = new Set<ScrollSubscriber>()

let latest = 0
let frame = 0
let listening = false

function flush() {
  frame = 0
  // Copied before iterating: a subscriber that unsubscribes itself during the
  // flush would otherwise mutate the set mid-iteration.
  for (const fn of [...subscribers]) {
    try {
      fn(latest)
    } catch (error) {
      // One broken subscriber must not stop the parallax for everything else.
      console.error('[elakai] scroll subscriber failed:', error)
    }
  }
}

function schedule() {
  if (frame) return
  frame = requestAnimationFrame(flush)
}

function onScroll() {
  // The entire handler. No layout read, no arithmetic, no allocation, and
  // above all no `preventDefault` — this listener is registered passive, so the
  // browser knows before calling it that it is free to scroll.
  latest = window.scrollY
  schedule()
}

function onVisibility() {
  if (document.visibilityState !== 'visible') return
  // A hidden tab delivers no frames, so anything that changed while it was away
  // — a rotation, a restored scroll position — is waiting unread.
  latest = window.scrollY
  schedule()
}

function listen() {
  if (listening) return
  listening = true
  latest = window.scrollY
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
  document.addEventListener('visibilitychange', onVisibility)
}

function unlisten() {
  if (!listening) return
  listening = false
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
  document.removeEventListener('visibilitychange', onVisibility)
  if (frame) {
    cancelAnimationFrame(frame)
    frame = 0
  }
}

/**
 * Subscribes to the scroll position. Returns the unsubscribe function.
 *
 * The subscriber is called once immediately, so a component that mounts
 * half-way down a restored page is in the right place on its first frame
 * instead of animating there from zero.
 *
 * The window listener is attached with the first subscriber and detached with
 * the last, so a route with no parallax on it — the admin panel, the auth
 * screens — has no scroll listener at all.
 */
export function onScrollFrame(fn: ScrollSubscriber): () => void {
  subscribers.add(fn)
  listen()

  fn(window.scrollY)

  return () => {
    subscribers.delete(fn)
    if (subscribers.size === 0) unlisten()
  }
}

/** The last known position, without subscribing. */
export function currentScrollY(): number {
  return listening ? latest : window.scrollY
}
