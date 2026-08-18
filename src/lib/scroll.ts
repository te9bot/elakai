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

/**
 * True while the smooth-scroll engine is driving.
 *
 * When it is, the engine calls `publishScroll` from inside its own frame loop
 * and the native `scroll` listener stands down. That is what makes the
 * animated scroll value — the interpolated one the page is actually painted at
 * — the single source of truth, rather than having the parallax read the raw
 * document position and drift a frame out of step with the engine moving it.
 *
 * Native events remain the fallback: reduced motion, touch, and any browser
 * where the engine did not start.
 */
let driven = false

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
  // Ignored while the engine is driving: it publishes the interpolated value
  // from its own loop, and taking the raw document position here as well would
  // mean two writers racing to set `latest` within a frame.
  if (driven) return
  // The entire handler. No layout read, no arithmetic, no allocation — reading
  // `scrollY` is the one property the browser can answer without flushing
  // pending style and layout work.
  latest = window.scrollY
  schedule()
}

/**
 * True only for the moment the engine is inside its own `raf` callback.
 *
 * This is what tells a synchronous flush from a dangerous one. See
 * `publishScroll`.
 */
let insideEngineFrame = false

/** Wraps the engine's per-frame advance. Called from lib/smooth-scroll.ts. */
export function duringEngineFrame(advance: () => void): void {
  insideEngineFrame = true
  try {
    advance()
  } finally {
    insideEngineFrame = false
  }
}

/**
 * Called by the smooth-scroll engine with the value the page is being painted
 * at.
 *
 * Flushes synchronously *when the engine is mid-frame*, and only then. The
 * engine already is the frame loop at that moment, so deferring would put every
 * parallax layer exactly one frame behind the scroll it is locked to — visible
 * as the backdrop lagging the content on a fast flick.
 *
 * The condition is new and it matters on touch. Lenis runs with `syncTouch:
 * false`, so a finger scroll is a native scroll — and Lenis reports it by
 * emitting from inside the browser's own `scroll` event handler, not from its
 * frame loop. The unconditional flush that was here therefore ran every
 * subscriber synchronously inside the scroll event: the map's journey
 * calculation, its transform writes, the header's threshold check, all of it,
 * at scroll-event frequency rather than once per frame, in the one callback
 * where the browser is waiting to composite. That is the shape that makes a
 * page feel like it is dragging behind the thumb. Off the engine's frame, the
 * value is recorded and a single frame is scheduled — the same discipline as a
 * raw scroll event.
 */
export function publishScroll(scrollY: number): void {
  driven = true
  latest = scrollY
  if (!insideEngineFrame) {
    schedule()
    return
  }
  if (frame) {
    cancelAnimationFrame(frame)
    frame = 0
  }
  flush()
}

/** The engine has stopped; native scroll events take over again. */
export function releaseScroll(): void {
  driven = false
  insideEngineFrame = false
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
