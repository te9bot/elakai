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
 *              visual = ease(visual -> native)     <- the fluid part
 *                          |
 *      +-------------------+-------------------+
 *      |                   |                   |
 *   map layers          the glow            the header
 *
 * TWO POSITIONS, AND ONLY ONE OF THEM IS REAL
 *
 * `native` is `window.scrollY`. The browser owns it, the compositor moves it,
 * and nothing in this file ever writes it. That is what keeps the page glued to
 * the thumb: a finger drag scrolls on the compositor whether or not the main
 * thread is free, so the document never waits for JavaScript to respond.
 *
 * `visual` is a number that chases `native` with an exponential ease. It is the
 * only thing the decorative layers read. So the parallax, the focus light and
 * the map arrive a beat after the page does — which is the whole of the "fluid,
 * soft, slightly eased" feel — while the page itself is never a beat late.
 *
 * WHY THIS IS NOT THE SMOOTH-SCROLL ENGINE THAT WAS REMOVED
 *
 * A Lenis instance used to own the document's scrolling here. It called
 * `preventDefault()` on input, converted the delta into a target, interpolated
 * toward it, and wrote the document position itself. The cost was not the
 * interpolation — it was that the browser could not begin scrolling until
 * JavaScript had run, on a main thread that was also drawing a full-viewport
 * SVG map. The first frame of every gesture waited behind that work.
 *
 * The difference is one line long: that engine interpolated *the page*, and
 * this interpolates *a number the page does not depend on*. If a frame here is
 * late, the parallax is late by a frame and the scroll is not late at all. If
 * this whole module threw, the site would still scroll perfectly.
 *
 * TIME-BASED, NOT PER-FRAME
 *
 * The obvious form of this is `visual += (native - visual) * 0.1` once per
 * frame. It is wrong on any display that is not the one it was tuned on: at
 * 120Hz it runs twice as fast as at 60Hz, so the same site feels tight on a
 * gaming monitor and sluggish on a cheap phone. `HALF_LIFE_MS` below is a
 * duration, and the per-frame factor is derived from the frame's own elapsed
 * time, so 60Hz, 90Hz and 120Hz all converge on the same curve in the same
 * number of milliseconds.
 *
 * THE RULES THIS FILE KEEPS
 *
 *   * The listener is passive and does no work beyond reading `scrollY` — the
 *     one property the browser can answer without flushing style or layout.
 *   * At most one frame is ever scheduled, for the whole site.
 *   * The loop stops when it converges. A page sitting still costs nothing.
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

/**
 * How long the gap between `visual` and `native` takes to halve.
 *
 * This is the one number that decides how the site feels, so it is worth
 * saying what is on either side of it. Too small and the ease disappears — the
 * layers snap and the page reads as stiff. Too large and the parallax visibly
 * trails the thumb, which is the exact complaint the previous engine earned:
 * motion that lags behind the finger reads as lag, not as smoothness.
 *
 * 68ms puts the layers ~98% of the way there in about a quarter of a second.
 * Fast enough that nothing feels detached from the input, slow enough that a
 * single wheel notch glides instead of jumping.
 *
 * IT WENT UP FROM 55, AND THE TOTAL SMOOTHING STILL WENT DOWN.
 *
 * This was not the only ease in the chain. components/home/kushtia-map.tsx took
 * the value published here and eased it a second time on a 70ms half-life
 * before writing a transform, so the backdrop was running two exponential eases
 * in series — roughly 125ms of combined lag, with the soft start that composing
 * two of them produces. On a wheel, where input arrives as a few large discrete
 * notches, a backdrop that sets off late and arrives late does not read as
 * smooth; it reads as stiff, which is exactly how it was described.
 *
 * The second ease is gone. This one is now the only one on the path, so it can
 * afford to be a little softer than 55 and still leave the backdrop
 * substantially more responsive than it was — about half the total lag. If the
 * glide ever needs retuning, this is the one number to turn, and there should
 * continue to be only one.
 */
const HALF_LIFE_MS = 68

/**
 * Below this, the ease is over. A twentieth of a pixel is far under anything
 * that can be drawn, and stopping matters more than the last fraction: without
 * it the loop would approach `native` forever and hold a frame open on a page
 * nobody is scrolling.
 */
const SETTLED_PX = 0.05

/**
 * A frame longer than this was a stall, not a frame.
 *
 * After a long task, a backgrounded tab or a slow route transition, `dt` can be
 * hundreds of milliseconds. Feeding that to the ease would collapse the whole
 * gap in one step and produce the catch-up jump this is meant to avoid, so it
 * is clamped to roughly four frames' worth.
 */
const MAX_FRAME_MS = 64

/** The browser's position. Read, never written. */
let native = 0
/** The eased position. The only one the visuals see. */
let visual = 0

let frame = 0
let lastFrame = 0
let listening = false

function publish() {
  // Copied before iterating: a subscriber that unsubscribes itself during the
  // flush would otherwise mutate the set mid-iteration.
  for (const fn of [...subscribers]) {
    try {
      fn(visual)
    } catch (error) {
      // One broken subscriber must not stop the parallax for everything else.
      console.error('[elakai] scroll subscriber failed:', error)
    }
  }
}

function tick(now: number) {
  frame = 0

  const dt = Math.min(now - lastFrame, MAX_FRAME_MS)
  lastFrame = now

  const gap = native - visual

  if (Math.abs(gap) < SETTLED_PX) {
    // Land exactly, so a layer's resting transform is the one the design asks
    // for rather than one a hair off it, and then stop.
    if (visual !== native) {
      visual = native
      publish()
    }
    return
  }

  /*
   * The frame-rate independent form of `visual += gap * k`.
   *
   * `2^(-dt/halfLife)` is the fraction of the gap still left after `dt`
   * milliseconds, so one minus it is the fraction to close on this frame.
   * Doubling the refresh rate halves `dt`, which halves the step — the curve
   * through time is identical.
   */
  visual += gap * (1 - Math.pow(2, -dt / HALF_LIFE_MS))
  publish()
  schedule()
}

function schedule() {
  if (frame) return
  frame = requestAnimationFrame(tick)
}

function wake() {
  if (frame) return
  // Stamped here rather than inside `tick`, so the first frame after an idle
  // period measures its own length instead of the length of the idle period.
  lastFrame = performance.now()
  schedule()
}

function onScroll() {
  // The entire handler. No layout read, no arithmetic beyond one assignment,
  // no allocation, and above all no `preventDefault` — this listener is
  // registered passive, so the browser knows before calling it that it is free
  // to scroll.
  native = window.scrollY
  wake()
}

/**
 * Jumps both positions to wherever the page is now, with no ease.
 *
 * For the changes that are not scrolling: a resize, a rotation, a restored
 * position on returning to a hidden tab. Easing across those would draw a glide
 * the reader never asked for, and after a rotation the layers would be
 * travelling while the layout underneath them had already moved.
 */
function snap() {
  native = window.scrollY
  visual = native
  if (frame) {
    cancelAnimationFrame(frame)
    frame = 0
  }
  publish()
}

function onVisibility() {
  if (document.visibilityState !== 'visible') return
  // A hidden tab delivers no frames, so anything that changed while it was away
  // — a rotation, a restored scroll position — is waiting unread.
  snap()
}

function listen() {
  if (listening) return
  listening = true
  native = window.scrollY
  visual = native
  lastFrame = performance.now()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', snap, { passive: true })
  document.addEventListener('visibilitychange', onVisibility)
}

function unlisten() {
  if (!listening) return
  listening = false
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', snap)
  document.removeEventListener('visibilitychange', onVisibility)
  if (frame) {
    cancelAnimationFrame(frame)
    frame = 0
  }
}

/**
 * Subscribes to the eased scroll position. Returns the unsubscribe function.
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

  fn(visual)

  return () => {
    subscribers.delete(fn)
    if (subscribers.size === 0) unlisten()
  }
}

/**
 * The eased position, without subscribing.
 *
 * Deliberately the eased one and not `window.scrollY`: this is what a
 * subscriber would have been handed, so a component seeding its own state from
 * it starts in the same place the next frame will put it.
 */
export function currentScrollY(): number {
  return listening ? visual : window.scrollY
}

/**
 * The browser's own position, for the rare caller that needs the truth rather
 * than the eased picture of it — anything measuring the document, as opposed to
 * decorating it.
 */
export function nativeScrollY(): number {
  return listening ? native : window.scrollY
}
