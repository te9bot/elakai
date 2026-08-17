/* ==========================================================================
 * One scroll listener for the whole site.
 *
 * WHY
 *
 * Before this there were three independent `window.addEventListener('scroll')`
 * registrations — the map backdrop, the header, and each infinite band — every
 * one of them doing its own work on every scroll event, on its own schedule,
 * with no idea the others existed. That is the shape the browser is worst at:
 * N handlers firing at wheel frequency, each free to read layout and each free
 * to trigger its own render.
 *
 * This is the single loop everything else subscribes to:
 *
 *      browser scroll event
 *              |
 *      record scrollY  (no work, no layout read)
 *              |
 *      one requestAnimationFrame
 *              |
 *      +-------+--------+---------+
 *      |                |         |
 *   parallax         header    background
 *
 * The listener itself does nothing but store a number. All the work happens
 * once per frame, in frame order, after the browser has already decided where
 * the page is — which is the only moment at which reading it is free and
 * writing to it is not going to be undone.
 *
 * WHAT IT DELIBERATELY DOES NOT MANAGE
 *
 * `lib/infinite-track.ts` keeps its own listener. It is already the good
 * version of this — an IntersectionObserver starts and stops it, so it is only
 * subscribed while its band is actually on screen, and it needs the raw value
 * inside its own physics loop rather than a frame-batched one. Folding it in
 * would mean it ran while off screen, which is worse. It is not an oversight.
 *
 * NO REACT
 *
 * Nothing here touches state. Subscribers are handed a number and are expected
 * to write a transform. A subscriber that calls `setState` has moved the cost
 * back into reconciliation and defeated the point.
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
  // The entire handler. No layout read, no arithmetic, no allocation — reading
  // `scrollY` is the one property the browser can answer without flushing
  // pending style and layout work.
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
