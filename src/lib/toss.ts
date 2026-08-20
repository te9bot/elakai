/* ==========================================================================
 * The delete toss.
 *
 * A row that is being deleted is grabbed, lifted off the list, thrown along a
 * curve at the delete control it was dismissed from, and pulled into it. §3–§17
 * of the brief describe it; this file is the whole of it, and no screen has to
 * know how any of it works.
 *
 * WHY THE WEB ANIMATIONS API AND NOT FRAMER MOTION
 *
 * This project already carries framer-motion and uses it for everything else,
 * so choosing something different needs a reason. There are three.
 *
 *   1. The thing that flies is a clone in `document.body`, outside React's
 *      tree entirely. Framer animates elements it renders; making it drive a
 *      detached node means recreating a React root for one 430ms flight.
 *   2. The path is fourteen sampled points off a Bézier. WAAPI takes a
 *      keyframe array with explicit offsets, which is exactly that shape.
 *   3. `LazyMotion features={domAnimation}` in App.tsx deliberately omits the
 *      projection engine to save ~25kb, so framer's layout animations are not
 *      available here anyway — and this needs the FLIP below.
 *
 * WAAPI costs nothing extra, runs transform and opacity off the main thread,
 * and hands back a promise that resolves when the animation is genuinely over.
 *
 * WHAT IS MEASURED, AND HOW OFTEN
 *
 * Once. `getBoundingClientRect()` is called twice at the start — the row and
 * the trash — and never again (§7). The path is computed from those two points
 * before the first frame, and the fourteen keyframes are handed to the
 * compositor in one go. There is no rAF loop, nothing reads layout mid-flight,
 * and nothing forces a reflow while the animation is running.
 *
 * NOTHING HERE DECIDES ANYTHING
 *
 * This file animates. It does not delete, does not know what Supabase said,
 * and cannot be read as evidence that a deletion happened. The caller runs the
 * request alongside the animation and decides what to do with the answer — see
 * §16 and the call site in src/pages/admin/listings.tsx.
 * ========================================================================== */

/** §4's budget, in milliseconds. */
const PRESS_MS = 90
const LIFT_MS = 80
const FLIGHT_MS = 310
const ABSORB_MS = 120
const IMPACT_MS = 150

/** What the whole sequence costs, for a caller that needs to plan around it. */
export const TOSS_DURATION_MS = PRESS_MS + LIFT_MS + FLIGHT_MS + ABSORB_MS

/** The reduced-motion path: a plain, quick fade. See §58. */
const REDUCED_MS = 140

/** Points sampled off the curve. Fourteen is smooth at 60fps over 430ms. */
const SAMPLES = 14

export type TossHandles = {
  /** Resolves when the element is gone from view. Never rejects. */
  finished: Promise<void>
  /**
   * Puts everything back — the clone removed, the row visible and untouched.
   * Safe to call at any point, including after `finished`, and safe to call
   * twice. This is §16's failure path.
   */
  restore: () => void
}

/**
 * Throw `source` into `target`.
 *
 * `target` is the real delete control, wherever it happens to be on this
 * viewport — nothing here is a hardcoded offset, so the same call is correct on
 * a 320px phone and a 2560px desktop, in a scrolled list, and in either theme.
 */
export function tossToTarget({
  source,
  target,
  reduced = false,
}: {
  source: HTMLElement
  target: HTMLElement | null
  reduced?: boolean
}): TossHandles {
  let restored = false
  const cleanups: (() => void)[] = []

  function restore() {
    if (restored) return
    restored = true
    // Reverse order, so the clone goes before the styles that positioned it.
    for (let i = cleanups.length - 1; i >= 0; i--) {
      try {
        cleanups[i]()
      } catch {
        // A cleanup that throws must not prevent the rest from running: the
        // one thing worse than a failed animation is a failed animation that
        // leaves a fixed-position ghost on the screen.
      }
    }
  }

  /*
   * The honest fallback.
   *
   * §58 asks for the trajectory and the rotation to go under reduced motion,
   * and for every functional state to survive. A short fade does both: the row
   * still visibly leaves, the caller's success and failure paths are unchanged,
   * and nothing travels across the viewport.
   *
   * Also the path taken when there is no trash to aim at — a target that is not
   * on screen has no position, and throwing something at a guess is worse than
   * not throwing it.
   */
  if (reduced || !target || !source.isConnected) {
    const fade = source.animate(
      [
        { opacity: 1 },
        { opacity: 0 },
      ],
      { duration: REDUCED_MS, easing: 'ease-out', fill: 'forwards' },
    )
    cleanups.push(() => fade.cancel())
    return {
      finished: fade.finished.then(
        () => undefined,
        () => undefined,
      ),
      restore,
    }
  }

  /* ---- Measure. Twice, now, and never again. ---- */

  const from = source.getBoundingClientRect()
  const to = target.getBoundingClientRect()

  const start = { x: from.left + from.width / 2, y: from.top + from.height / 2 }
  const end = { x: to.left + to.width / 2, y: to.top + to.height / 2 }

  /*
   * §9's control point: the midpoint, lifted.
   *
   * The lift is proportional to the viewport and capped, because a fixed 160px
   * arc that reads as a gentle toss on a laptop is a loop over the address bar
   * on a phone. It is also floored, or a short throw between two rows barely
   * curves at all and the whole thing degrades into the straight slide §9 says
   * not to use.
   */
  const arc = Math.max(48, Math.min(150, window.innerHeight * 0.16))
  const control = {
    x: (start.x + end.x) / 2,
    y: Math.min(start.y, end.y) - arc,
  }

  /* ---- The clone ---- */

  const clone = buildClone(source, from)
  document.body.appendChild(clone)
  cleanups.push(() => clone.remove())

  /*
   * The original is hidden rather than removed.
   *
   * `visibility: hidden` keeps the row's height in the table, so nothing below
   * it jumps while the clone is still in the air — the list reflows once, at
   * the end, under the FLIP below. Removing the row here would produce two
   * separate movements for one deletion.
   *
   * And on the failure path this is a single property to put back. A row that
   * had been unmounted would have to be re-fetched.
   */
  const originalVisibility = source.style.visibility
  const originalPointerEvents = source.style.pointerEvents
  cleanups.push(() => {
    source.style.visibility = originalVisibility
    source.style.pointerEvents = originalPointerEvents
  })

  /* ---- Phase A: press, then lift (§5, §6) ---- */

  /*
   * Run on the clone, not on the row, and the row is hidden before the first
   * frame. One element does the whole sequence, so there is no seam where a
   * compressed row is swapped for a compressed copy of it.
   */
  source.style.visibility = 'hidden'
  source.style.pointerEvents = 'none'

  // A degree either way, chosen from the row's own position so two rows deleted
  // in a session do not tilt identically. Cheap, and it is the difference
  // between a physical toss and a canned one.
  const tilt = from.top % 2 < 1 ? -1 : 1

  const grab = clone.animate(
    [
      { transform: 'translate3d(0, 0, 0) scale(1) rotate(0deg)', opacity: 1, offset: 0 },
      // §5 — grabbed. Small, and no bounce.
      {
        transform: 'translate3d(0, 0, 0) scale(0.96) rotate(0deg)',
        opacity: 0.96,
        offset: PRESS_MS / (PRESS_MS + LIFT_MS),
      },
      // §6 — detached from the list, and tilted before the throw.
      {
        transform: `translate3d(0, -8px, 0) scale(0.97) rotate(${tilt}deg)`,
        opacity: 1,
        offset: 1,
      },
    ],
    { duration: PRESS_MS + LIFT_MS, easing: 'ease-out', fill: 'forwards' },
  )

  /* ---- Phase B: the flight, and the absorption (§9–§12) ---- */

  const dx = end.x - start.x
  const dy = end.y - start.y

  /*
   * The keyframes.
   *
   * `t` is the Bézier parameter and it is advanced along an ease-in-out curve
   * rather than linearly, so the object accelerates out of the hand, coasts,
   * and slows as it arrives — §15's shape, baked into the sampling. The
   * animation itself then runs `linear`, because applying a second easing on
   * top of an already-eased path is how motion ends up looking rubbery.
   */
  const flight: Keyframe[] = []
  for (let i = 0; i <= SAMPLES; i++) {
    const progress = i / SAMPLES
    const t = easeInOutQuad(progress)

    // Quadratic Bézier, relative to the start point — the clone is already
    // positioned there, so only the delta is needed.
    const inv = 1 - t
    const x = inv * inv * 0 + 2 * inv * t * (control.x - start.x) + t * t * dx
    const y = inv * inv * 0 + 2 * inv * t * (control.y - start.y) + t * t * dy

    /*
     * The 8px lift, spent over the first part of the flight.
     *
     * This is how the two animations join. The throw's first keyframe is
     * `translate3d(0, -8px, 0) scale(0.97) rotate(tilt)` — precisely where the
     * grab left off — so the object continues from the lifted, tilted pose
     * rather than snapping back to rest between the two.
     *
     * The alternative was `composite: 'add'`, and it is wrong here: an added
     * transform list applies the throw's translation INSIDE the grab's
     * scale(0.97) and rotate(1deg), so every distance shrinks by 3% and skews
     * by a degree. The object would miss the trash by a dozen pixels on a long
     * throw, which is exactly the kind of error a curved path makes invisible
     * and therefore hard to find.
     */
    const lift = -8 * (1 - progress)

    flight.push({
      offset: progress,
      transform: `translate3d(${x.toFixed(2)}px, ${(y + lift).toFixed(2)}px, 0) scale(${scaleAt(progress).toFixed(3)}) rotate(${rotationAt(progress, tilt).toFixed(2)}deg)`,
      // §12 — it does not disappear halfway. Opacity holds at 1 until the last
      // fifth, then goes with the final shrink into the target.
      opacity: progress < 0.82 ? 1 : Math.max(0, 1 - (progress - 0.82) / 0.18),
      easing: 'linear',
    })
  }

  const throwIt = clone.animate(flight, {
    duration: FLIGHT_MS + ABSORB_MS,
    delay: PRESS_MS + LIFT_MS,
    easing: 'linear',
    fill: 'forwards',
  })

  cleanups.push(() => {
    grab.cancel()
    throwIt.cancel()
  })

  /* ---- §13: the trash reacts ---- */

  /*
   * Fired on a timer rather than off the flight's `finished`, because it has to
   * start slightly BEFORE the object lands — a target that begins reacting
   * after the impact reads as a delayed echo rather than as a collision.
   *
   * The existing button is animated. No new element, no new icon, no particles.
   */
  const impactAt = PRESS_MS + LIFT_MS + FLIGHT_MS + ABSORB_MS - IMPACT_MS * 0.6
  const impactTimer = window.setTimeout(() => {
    if (restored || !target.isConnected) return
    target.animate(
      [
        { transform: 'scale(1) translateY(0)' },
        { transform: 'scale(1.08) translateY(-2px)', offset: 0.38 },
        { transform: 'scale(0.98) translateY(0)', offset: 0.7 },
        { transform: 'scale(1) translateY(0)' },
      ],
      {
        duration: IMPACT_MS,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        // `none`, so the button is left with no inline transform and no
        // `will-change` residue once this is over. §56.
        fill: 'none',
      },
    )
  }, Math.max(0, impactAt))
  cleanups.push(() => window.clearTimeout(impactTimer))

  const finished = throwIt.finished.then(
    () => {
      // The clone has done its job. Removing it here rather than waiting for
      // `restore` means the DOM is clean the moment the object is out of sight,
      // even if the caller is still waiting on the network.
      clone.remove()
    },
    () => {
      // Cancelled by `restore`. Nothing to do; `restore` owns the cleanup.
    },
  )

  return { finished, restore }
}

/* ------------------------------------------------------------------ */
/* Shape of the throw                                                  */
/* ------------------------------------------------------------------ */

/** §11. Shrinks gently in flight, then hard as the target takes it. */
function scaleAt(progress: number): number {
  if (progress <= 0.55) return lerp(0.97, 0.9, progress / 0.55)
  if (progress <= 0.82) return lerp(0.9, 0.65, (progress - 0.55) / 0.27)
  // The absorption. Squared so it accelerates inward — §15's ease-in, applied
  // to the property that actually carries the "pulled in" feeling.
  const t = (progress - 0.82) / 0.18
  return lerp(0.65, 0.2, t * t)
}

/** §10. Within ±10°, and it settles rather than spinning. */
function rotationAt(progress: number, tilt: number): number {
  if (progress <= 0.35) return lerp(tilt, -6 * tilt, progress / 0.35)
  if (progress <= 0.7) return lerp(-6 * tilt, 8 * tilt, (progress - 0.35) / 0.35)
  return lerp(8 * tilt, 0, (progress - 0.7) / 0.3)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t))
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
}

/* ------------------------------------------------------------------ */
/* The clone                                                           */
/* ------------------------------------------------------------------ */

/**
 * A visual copy of `source`, fixed at the position it currently occupies.
 *
 * TABLE ROWS ARE THE AWKWARD CASE, AND THEY ARE THE CASE THIS IS FOR
 *
 * The listings screen is a `<table>`, so the thing being deleted is a `<tr>`. A
 * detached `<tr>` has no table to size its cells against: dropped into
 * `document.body` it collapses to the width of its content and the "copy" looks
 * nothing like the row it copied. So a row is wrapped back into a minimal
 * `<table><tbody>` and every cell is given the pixel width it actually had.
 *
 * `<li>` and plain elements need none of that and are cloned directly, which is
 * why this takes the general shape rather than assuming a table — the same
 * function serves the submissions queue, which is a list.
 *
 * The clone is inert by construction: `pointer-events: none`, `aria-hidden`,
 * and every id stripped so nothing in the document ends up with two elements
 * answering to the same id while it is in the air.
 */
function buildClone(source: HTMLElement, rect: DOMRect): HTMLElement {
  const copy = source.cloneNode(true) as HTMLElement
  stripIdentity(copy)

  let flying: HTMLElement = copy

  if (source.tagName === 'TR') {
    const originalCells = Array.from(source.children) as HTMLElement[]
    const copiedCells = Array.from(copy.children) as HTMLElement[]
    originalCells.forEach((cell, index) => {
      const target = copiedCells[index]
      if (target) target.style.width = `${cell.getBoundingClientRect().width}px`
    })

    const table = document.createElement('table')
    // Copied so the row keeps its border treatment, its font and its cell
    // padding — those live on the table in this design, not on the row.
    table.className = (source.closest('table')?.className ?? '') + ' w-full'
    table.style.tableLayout = 'fixed'
    table.style.borderCollapse = 'collapse'
    const body = document.createElement('tbody')
    body.appendChild(copy)
    table.appendChild(body)

    flying = document.createElement('div')
    flying.appendChild(table)
  }

  Object.assign(flying.style, {
    position: 'fixed',
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    margin: '0',
    // Above the admin shell and the toast region, below nothing that matters.
    zIndex: '70',
    pointerEvents: 'none',
    // The transforms below are about the object's own centre, which is what
    // makes the tilt read as a tumble rather than as a swing from one corner.
    transformOrigin: 'center center',
    // A layer for the duration of the flight. The clone is removed when it
    // lands, so this is not a permanent promotion — §55's objection is to
    // `will-change` that outlives its animation, which this cannot.
    willChange: 'transform, opacity',
    /*
     * The row is drawn on the page background, so a copy of it is transparent
     * and the interface shows straight through the thing in flight. The colour
     * is taken from the nearest ancestor that actually paints one — on this
     * table that is the surface the table sits on, not the `<tr>`, which has no
     * background of its own in either theme.
     */
    backgroundColor: opaqueBackground(source),
    borderRadius: getComputedStyle(source).borderRadius,
    overflow: 'hidden',
  } satisfies Partial<CSSStyleDeclaration>)

  flying.setAttribute('aria-hidden', 'true')
  return flying
}

/**
 * The first painted background at or above `element`.
 *
 * Walks up rather than guessing a token, so it is correct in light mode, in
 * dark mode, and on any surface a row is ever moved onto — the answer comes
 * from the computed style the browser is already using to paint the thing being
 * copied. Falls back to the canvas variable, and then to the page background,
 * so there is always a colour rather than a hole.
 */
function opaqueBackground(element: HTMLElement): string {
  let node: HTMLElement | null = element
  while (node && node !== document.body) {
    const colour = getComputedStyle(node).backgroundColor
    // Anything that is not fully transparent. `rgba(0, 0, 0, 0)` and
    // `transparent` are the two spellings browsers return for "nothing here".
    if (colour && colour !== 'transparent' && !/,\s*0\s*\)$/.test(colour)) {
      return colour
    }
    node = node.parentElement
  }
  return getComputedStyle(document.body).backgroundColor || '#fff'
}

/** Ids, names and focusability, removed from a copy that must not be reachable. */
function stripIdentity(node: HTMLElement) {
  node.removeAttribute('id')
  node.setAttribute('aria-hidden', 'true')
  node.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'))
  node.querySelectorAll('a, button, input, select, textarea').forEach((el) => {
    el.setAttribute('tabindex', '-1')
    el.setAttribute('aria-hidden', 'true')
  })
}

/* ==========================================================================
 * FLIP — the list settling afterwards (§14)
 *
 * First, Last, Invert, Play, and no more than that. The rows that remain are
 * measured before the deleted one leaves the DOM and again after, and each one
 * is transformed back to where it was and released.
 *
 * WHY NOT ANIMATE EVERY ROW INDIVIDUALLY
 *
 * §14 asks for the surrounding elements to settle, not for a cascade. Only rows
 * that actually moved are animated — everything above the deleted row has a
 * delta of zero and is skipped entirely — so a deletion at the bottom of a long
 * table animates nothing at all, which is correct: nothing moved.
 * ========================================================================== */

export type FlipSnapshot = Map<string, number>

/**
 * Where every row is now.
 *
 * Keyed on `data-flip-key`, which the caller puts on each row. An index would
 * be wrong the moment the list is sorted or filtered — the whole point is to
 * follow a row through a change in the list, and after a delete every index
 * below the gap refers to a different row.
 */
export function captureRows(container: HTMLElement | null): FlipSnapshot {
  const snapshot: FlipSnapshot = new Map()
  if (!container) return snapshot
  container.querySelectorAll<HTMLElement>('[data-flip-key]').forEach((row) => {
    const key = row.dataset.flipKey
    if (key) snapshot.set(key, row.getBoundingClientRect().top)
  })
  return snapshot
}

/**
 * Move each surviving row from where it was to where it is.
 *
 * Called from a layout effect, after React has committed the new list and
 * before the browser has painted it — so the inverse transform is applied in
 * the same frame the row moved, and there is no flash of the settled position.
 */
export function playFlip(
  container: HTMLElement | null,
  before: FlipSnapshot,
  { reduced = false, duration = 260 }: { reduced?: boolean; duration?: number } = {},
): void {
  // §58: the list still reflows, it simply does so immediately. No transform is
  // applied, so nothing moves under someone who asked for nothing to move.
  if (!container || reduced || before.size === 0) return

  container.querySelectorAll<HTMLElement>('[data-flip-key]').forEach((row) => {
    const key = row.dataset.flipKey
    if (!key) return
    const previousTop = before.get(key)
    if (previousTop === undefined) return

    const delta = previousTop - row.getBoundingClientRect().top
    // Sub-pixel deltas are not movement; animating them costs a layer for
    // nothing. A row that did not move is left alone.
    if (Math.abs(delta) < 1) return

    row.animate(
      [
        { transform: `translate3d(0, ${delta}px, 0)` },
        { transform: 'translate3d(0, 0, 0)' },
      ],
      {
        duration,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        // `none` again: the row is left with no inline transform, so a later
        // hover, a re-sort or a second delete starts from a clean element.
        fill: 'none',
      },
    )
  })
}
