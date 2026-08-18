import { useEffect } from 'react'
import Lenis from 'lenis'

import { useReducedMotion } from './motion'
import { duringEngineFrame, publishScroll, releaseScroll } from './scroll'

/* ==========================================================================
 * The scroll engine.
 *
 * One Lenis instance, one frame loop, one authoritative scroll value that
 * everything else reads. This is the architecture, and each number in it is
 * here for a stated reason rather than copied.
 *
 * WHY THE FIRST ATTEMPT FELT WORSE THAN NO ENGINE AT ALL
 *
 * Worth recording, because it is the trap and it is not obvious.
 *
 * An earlier version of this file ran with `wheelMultiplier: 1`, on the
 * reasoning that a wheel notch should move the page exactly as far as the
 * operating system says and that changing it is how a site comes to feel wrong.
 * That reasoning is correct for a page with no interpolation and wrong for one
 * with it, in a way that produces precisely the reported symptom: needing to
 * scroll twice to get past a section.
 *
 * Native scrolling applies a notch instantly — 100 pixels, now. Interpolated
 * scrolling spreads the same 100 pixels over the several frames it takes to
 * converge, so within the moment the hand associates with "I turned the wheel"
 * only part of it has been delivered. The page has not lost the movement and it
 * arrives shortly, but it *reads* as less travel per notch than the browser
 * gives for free. Against ELAKAI's 700-800px sections, where one native notch
 * is already only an eighth of a section, making each notch feel smaller is
 * what turns "seven notches to cross a section" into "it will not let me past".
 *
 * So the multiplier is not a flourish. It is the compensation that makes an
 * interpolated wheel cover at least as much ground per notch as a native one.
 * Without it, easing is a pure tax.
 *
 * WHAT DRIVES WHAT
 *
 *                    mouse wheel
 *                         |
 *                    targetScroll          (where the wheel has asked for)
 *                         |
 *                    animatedScroll        (where the page is painted)
 *                         |
 *                  one requestAnimationFrame
 *                         |
 *            +------------+------------+
 *            |                         |
 *      publishScroll()            the document
 *            |
 *   map parallax, header, ...
 *
 * The parallax reads the *animated* value, not `window.scrollY`, so the
 * backdrop is locked to the frame the content is painted at instead of trailing
 * it. That is `publishScroll` in lib/scroll.ts.
 *
 * WHAT IT IS NOT ALLOWED TO DO
 *
 * Nothing here may ever block, delay or swallow wheel input. There is no
 * "is animating" flag, no section index, no snapping and no scroll locking
 * anywhere in this project — audited, and confirmed absent. Wheel deltas
 * accumulate into `targetScroll` unconditionally, so five fast notches are five
 * notches of travel and a reversal mid-flight retargets immediately rather than
 * finishing the old move first.
 * ========================================================================== */

/**
 * How fast the page converges on where the wheel asked it to be.
 *
 * The reference site runs 0.16 and it is a good number: high enough that the
 * page is essentially caught up within a few frames, low enough that the motion
 * still reads as eased rather than stepped. Below about 0.10 the page starts to
 * feel like it is being dragged behind the cursor.
 */
const LERP = 0.16

/**
 * Ground covered per wheel notch, as a multiple of the browser's own.
 *
 * See the note above: this is what stops interpolation costing travel. 1.45 is
 * the reference's value and it holds up here for the same reason — ELAKAI's
 * sections are tall, and the page needs to feel like it is getting somewhere.
 *
 * Deliberately not higher. Past roughly 1.6 the page starts to overshoot where
 * the eye expected to land, which is its own kind of not-in-control.
 */
const WHEEL_MULTIPLIER = 1.45

/**
 * Exponential ease-out.
 *
 * Very fast at the start and asymptotic at the end, which is the curve that
 * feels connected: almost all the distance is covered in the first few frames,
 * so the response is immediate, and the last few pixels settle rather than
 * stop dead. `1.001` rather than `1` so it actually reaches its endpoint
 * instead of approaching it forever.
 */
const EASING = (t: number): number => Math.min(1, 1.001 - Math.pow(2, -10 * t))

/**
 * Whether this device has a wheel to smooth.
 *
 * The engine exists to interpolate wheel input. A phone has no wheel: with
 * `syncTouch: false` — which is the right setting, see below — Lenis on a touch
 * device smooths nothing at all. What it still does is hold a
 * `requestAnimationFrame` loop open for the life of the page, run a
 * MutationObserver on `<body>`, keep wheel and touch listeners registered, and
 * re-emit every native scroll event through its own dispatch. That is a
 * permanent 60Hz tax on the hardware least able to pay it, in exchange for no
 * visual difference whatsoever.
 *
 * So the engine simply does not start there, and native scrolling — which runs
 * on the compositor thread and survives a busy main thread — drives
 * lib/scroll.ts directly. Every parallax subscriber reads the same value from
 * the same place either way; only the source changes.
 *
 * `(pointer: coarse) and (hover: none)` rather than a width test or a user
 * agent string: it asks about the input device, which is the actual question.
 * A touchscreen laptop reports a fine pointer as well and keeps the engine; a
 * tablet does not, and gets native scrolling, which is what it should have.
 */
function hasWheelToSmooth(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return true
  return !window.matchMedia('(pointer: coarse) and (hover: none)').matches
}

export function useSmoothScroll(): void {
  const reduced = useReducedMotion()

  useEffect(() => {
    /*
     * Reduced motion gets the browser's own scroll, untouched.
     *
     * Smoothing is motion the user did not ask for, applied to the one
     * interaction they cannot avoid. Native scroll is also the more accessible
     * answer: it keeps every assistive behaviour the browser provides exactly
     * as the person has it configured.
     */
    if (reduced) return

    // Touch devices scroll natively. See `hasWheelToSmooth`.
    if (!hasWheelToSmooth()) return

    const lenis = new Lenis({
      lerp: LERP,
      easing: EASING,
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: WHEEL_MULTIPLIER,

      /*
       * Touch is left completely alone.
       *
       * `syncTouch` would route finger scrolling through the same
       * interpolation, and on a phone that is a downgrade however well tuned:
       * native touch scrolling runs on the compositor thread and survives a
       * busy main thread, where anything JavaScript does instead does not. It
       * also replaces the rubber-band and momentum people already know with an
       * imitation. Mobile keeps its own scroll and gets its smoothness from the
       * rendering fixes, which is where mobile smoothness actually comes from.
       */
      syncTouch: false,

      /*
       * One loop, owned here, rather than Lenis running its own.
       *
       * `autoRaf: true` would work, but it hides the loop and makes it
       * impossible to guarantee ordering — and ordering is the point. Within a
       * single frame the engine must advance the scroll and *then* hand the
       * resulting value to the parallax, so both are describing the same
       * moment. Two independent loops cannot promise that.
       */
      autoRaf: false,
    })

    /*
     * Reachable from the console in development only.
     *
     * Scroll behaviour is one of the few things that cannot be verified by
     * reading the code or by a synthetic event — an untrusted `WheelEvent` does
     * not drive the engine — so the instance has to be inspectable by hand.
     * Stripped from the production bundle by the `import.meta.env.DEV` guard,
     * which Vite resolves to `false` and then dead-code eliminates.
     */
    if (import.meta.env.DEV) {
      ;(window as unknown as { __lenis?: Lenis }).__lenis = lenis
    }

    let frame = 0
    function tick(time: number) {
      // Wrapped so lib/scroll.ts can tell "the engine is advancing the page
      // right now" from "the engine is relaying a native scroll event". Only
      // the first may flush subscribers synchronously; see `publishScroll`.
      duringEngineFrame(() => lenis.raf(time))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)

    // The single broadcast. Fires from inside Lenis's own update, so every
    // subscriber is working from the value the page is painted at this frame.
    lenis.on('scroll', ({ animatedScroll }: { animatedScroll: number }) => {
      publishScroll(animatedScroll)
    })

    /*
     * Stop while something has locked the page.
     *
     * Radix's dialogs and sheets prevent background scrolling by locking the
     * body, and the engine does not know that: left running it keeps
     * interpreting wheel events against a document that is not allowed to move,
     * which shows up as an open modal that judders when you scroll over it.
     * Watching for the lock covers every dialog, including future ones, rather
     * than wiring each to call `stop()` and eventually missing one.
     */
    const body = document.body
    const syncLock = () => {
      const locked =
        body.hasAttribute('data-scroll-locked') ||
        body.style.overflow === 'hidden' ||
        body.style.position === 'fixed'
      if (locked) lenis.stop()
      else lenis.start()
    }

    const observer = new MutationObserver(syncLock)
    observer.observe(body, { attributes: true, attributeFilter: ['style', 'data-scroll-locked'] })
    syncLock()

    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
      lenis.destroy()
      releaseScroll()
    }
  }, [reduced])
}
