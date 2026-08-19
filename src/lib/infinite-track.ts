/**
 * The measurement and physics behind the site's infinite horizontal bands.
 *
 * `components/marquee.tsx` is a CSS keyframe and nothing else, which is exactly
 * right for a strip you only ever look at. These bands you can also *grab*, and
 * that changes the problem: a hand on the content has to win over the animation
 * without the animation ever visibly losing, and the loop has to survive being
 * pushed backwards past its own start.
 *
 * Four ideas carry all of it.
 *
 *  1. **Position is a modulo, not a scroll.** Each track keeps one float —
 *     `offset` — and paints `translate3d(-(offset mod unit))`, where `unit` is
 *     the *measured* width of one repeated group plus the gap that follows it.
 *     There is no start and no end to reach, so there is nothing to reset: drag
 *     for an hour in either direction and the maths is identical every frame.
 *
 *  2. **`unit` is measured, never assumed.** It is read off the first rendered
 *     copy, and re-read whenever that copy changes size — a resize, a
 *     breakpoint, a webfont swapping in, an image finally decoding, or the item
 *     list itself changing underneath. Nothing in this file knows how many
 *     items a track holds or how wide any of them are, which is the whole point:
 *     the loop distance is a fact about the DOM, not a constant in the code.
 *
 *  3. **One velocity, blended.** Rather than switching between "auto mode" and
 *     "user mode" — the switch is what makes carousels feel mechanical — every
 *     track's velocity is a weighted mix of its own auto-scroll and the user's
 *     fling. The weight `w` decays from 1 to 0 after release, so control hands
 *     back continuously and the auto-scroll never fights the drag: at w = 1 it
 *     contributes literally nothing.
 *
 *  4. **The band is the unit of interaction, the track is the unit of motion.**
 *     One pointer gesture drives every track in the band, but each one scales it
 *     by its own `dragMultiplier`. Two tracks on one drag, moving different
 *     distances, is depth you can feel with the mouse rather than only see.
 *
 * Nothing here touches React. The whole system is refs, one rAF loop per band,
 * and one `transform` write per track per frame.
 */

/** One track inside a band. Content-independent: no widths, no counts. */
export type TrackSpec = {
  /** Auto-scroll speed in px/s. Positive runs the content right → left. */
  speed: number
  /** Travel per pixel of drag. 1 follows the cursor exactly; above 1 reads as nearer. */
  dragMultiplier?: number
  /** Signed share of the scroll-velocity boost. Opposite signs pull tracks apart. */
  scrollRate?: number
}

/** Band-wide feel. Behaviour only — never content dimensions. */
export type BandPhysics = {
  /** Seconds for a fling to decay to 1/e of its release speed. Longer glides further. */
  glide?: number
  /** Seconds for control to hand back from the user to the auto-scroll. */
  handover?: number
  /** Peak px/s that page scroll velocity may add to a track's drift. */
  scrollBoost?: number
  /** Px of horizontal travel before a press becomes a drag instead of a click. */
  dragThreshold?: number
}

/** What `addTrack` hands back, so a component can drive one track's whole life. */
export type TrackHandle = {
  /** Re-apply speed/rates without re-registering — no jump, no lost offset. */
  update(spec: TrackSpec): void
  /** Force a re-read of the loop distance. Cheap; safe to call on any suspicion. */
  remeasure(): void
  dispose(): void
}

type Track = {
  el: HTMLElement
  spec: Required<TrackSpec>
  /** Distance travelled, normalised into [0, unit) every frame. */
  offset: number
  /** Measured width of one repeated group including the gap that follows it. */
  unit: number
  /** The copy `unit` is measured from — watched for size, re-resolved on change. */
  group: Element | null
  painted: number
}

const DEFAULTS: Required<BandPhysics> = {
  glide: 0.62,
  handover: 0.5,
  scrollBoost: 70,
  dragThreshold: 6,
}

/** Past this the gesture is a throw, not a drag, and the numbers stop meaning much. */
const MAX_FLING = 5200

/** Page scroll speed (px/s) that saturates the scroll boost. */
const SCROLL_REFERENCE = 1400

/**
 * How far the drift is allowed to fall while the cursor is over the band.
 *
 * A fraction, not zero. Stopping the loop under the cursor is the obvious
 * reading of "pause on hover" and it is the wrong one here: the band is the
 * only thing on the page that says the section is alive, and freezing it the
 * moment somebody looks at it reads as a stall rather than as a courtesy. A
 * third of normal is slow enough to read a chip and aim at it.
 */
const MIN_HOVER_DRIFT = 0.34

/** Seconds for the hover damp to reach ~63% of its target. Slow enough to feel
 *  like the band easing off rather than a switch being thrown. */
const HOVER_TAU = 0.26

/** Cursor pixels to band pixels-per-second. Small: this is a lean, not a drag. */
const POINTER_GAIN = 2.6

/** How quickly the cursor's push decays once the hand stops moving. */
const POINTER_TAU = 0.34

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)

/** Longest a hand-back may take when the gesture was cut short rather than released. */
const CANCEL_HANDOVER = 0.28

/** Floor on a track's drift as a fraction of its own speed, so scroll cannot reverse it. */
const MIN_DRIFT = 0.15

const CAPTURE_PASSIVE = { capture: true, passive: true } as const

/**
 * Fill in the defaults, ignoring keys that are present but undefined.
 *
 * Not `{ ...DEFAULTS, ...physics }`: an omitted optional prop arrives as an
 * explicit `undefined`, and a spread happily writes that over the default. The
 * first casualty was the drag threshold, which turned every press into a drag.
 */
const settle = (physics: BandPhysics): Required<BandPhysics> => {
  const out = { ...DEFAULTS }
  for (const key of Object.keys(DEFAULTS) as (keyof BandPhysics)[]) {
    const value = physics[key]
    if (value !== undefined) out[key] = value
  }
  return out
}

/** Frame-rate independent decay: the fraction of a value surviving `dt` at time constant `tau`. */
const decay = (dt: number, tau: number) => Math.exp(-dt / tau)

/** Wrap into [0, unit). `%` alone keeps the sign, and a negative offset is a jump. */
const wrap = (value: number, unit: number) => {
  const m = value % unit
  return m < 0 ? m + unit : m
}

export class InfiniteTrackEngine {
  private physics: Required<BandPhysics>
  private tracks: Track[] = []
  private surface: HTMLElement | null = null

  private frame = 0
  private last = 0
  private running = false

  /* -- gesture ---------------------------------------------------------- */
  private pointer = -1
  private coarse = false
  private startX = 0
  private startY = 0
  private lastX = 0
  private dragging = false
  private suppressClick = false
  /** Drag distance measured but not yet folded into the tracks. */
  private pending = 0
  private samples: { t: number; x: number }[] = []

  /* -- blend ------------------------------------------------------------ */
  /** How much of each track's velocity currently comes from the user. 1 → all of it. */
  private w = 0
  private vUser = 0
  private tauV = DEFAULTS.glide
  private tauW = DEFAULTS.handover

  /* -- scroll coupling -------------------------------------------------- */
  private scrollY = 0
  private scrollAt = 0
  private scrollRaw = 0
  private scrollSmooth = 0

  /* -- hover coupling, mouse only --------------------------------------- */
  /*
   * Two pointer effects, both deliberately small, and both fine-pointer only.
   *
   * `hover` eases 0..1 while the cursor is over the band and damps the drift —
   * the strip slows so a chip can be read and aimed at, and it is a slow rather
   * than a stop because a marquee that halts under the cursor reads as broken
   * rather than as attentive.
   *
   * `vPointer` is the cursor's own horizontal speed, smoothed, folded into the
   * same push that page scroll already uses. Moving the mouse across the band
   * leans the content the way the hand went and it settles back.
   *
   * Neither exists on touch. There is no hovering cursor to read, and the
   * listener would cost work on every frame of a scroll to move nothing — the
   * profiling earlier in this project measured pointermove as the single
   * largest source of dispatch on a phone, so it is not attached there at all.
   */
  private hover = 0
  private hoverTarget = 0
  private vPointer = 0
  private lastPointerX: number | null = null
  private pointerFrame = 0

  /** Watches the measured copy of every track. Opened on first registration. */
  private sizes: ResizeObserver | null = null
  private fontsWatched = false

  constructor(physics: BandPhysics = {}) {
    this.physics = settle(physics)
  }

  configure(physics: BandPhysics): void {
    this.physics = settle(physics)
    // Mid-fling the two tails are already in flight, and re-basing a time
    // constant while it is being applied is the kink this class goes out of its
    // way to avoid. At rest there is nothing to disturb, and the next throw
    // should use the numbers it was just given — including the first call after
    // construction, where the field initialisers still hold the defaults.
    if (this.w === 0) {
      this.tauV = this.physics.glide
      this.tauW = this.physics.handover
    }
  }

  /* ------------------------------------------------------------------ */
  /* Tracks                                                              */
  /* ------------------------------------------------------------------ */

  /**
   * Register a track element. The element's first child is treated as one copy
   * of the repeated content; everything after it is duplication this class
   * neither counts nor cares about.
   *
   * Safe to call before the band is mounted: tracks register in their own
   * effects, which React runs before the parent's.
   */
  addTrack(el: HTMLElement, spec: TrackSpec): TrackHandle {
    const track: Track = {
      el,
      spec: normalise(spec),
      offset: 0,
      unit: 0,
      group: null,
      painted: NaN,
    }
    this.tracks.push(track)
    this.watchFonts()
    this.measure(track)

    return {
      update: (next) => {
        track.spec = normalise(next)
      },
      remeasure: () => this.measure(track),
      dispose: () => {
        if (track.group) this.sizes?.unobserve(track.group)
        const i = this.tracks.indexOf(track)
        if (i !== -1) this.tracks.splice(i, 1)
      },
    }
  }

  /** Re-read every loop distance. The blunt instrument, for events with no target. */
  remeasureAll(): void {
    for (const track of this.tracks) this.measure(track)
  }

  /**
   * Read one loop distance off the DOM.
   *
   * Three things make this more than a width lookup:
   *
   *  - **Exactness.** `offsetWidth` rounds to whole pixels, and a rounding error
   *    is a seam: the loop would nudge sideways by that much every time it
   *    wraps. `getBoundingClientRect` keeps the fraction, and the gap is read
   *    back off the computed style rather than assumed, because the gap is part
   *    of the repeat.
   *
   *  - **Re-targeting.** The measured copy is a DOM node React can replace when
   *    the item list changes. Re-resolving it here, and moving the observer with
   *    it, is what lets the whole track be rebuilt from new data without anyone
   *    re-registering anything.
   *
   *  - **Continuity.** When the unit changes the offset is carried across as a
   *    *fraction* of the loop rather than a distance. A band mid-loop at 60% of
   *    the way through stays at 60% when the viewport resizes or a breakpoint
   *    reflows the chips, instead of teleporting to wherever the old pixel count
   *    happens to land in the new one.
   */
  private measure(track: Track): void {
    const group = track.el.firstElementChild

    if (group !== track.group) {
      if (track.group) this.sizes?.unobserve(track.group)
      track.group = group
      if (group) this.observe(group)
    }

    if (!group) {
      track.unit = 0
      return
    }

    const gap = parseFloat(getComputedStyle(track.el).columnGap)
    const unit = group.getBoundingClientRect().width + (Number.isNaN(gap) ? 0 : gap)

    // Sub-pixel churn is not worth a repaint, and `getBoundingClientRect`
    // produces plenty of it during a resize drag.
    if (Math.abs(unit - track.unit) < 0.01) return

    const previous = track.unit
    track.unit = unit

    if (unit <= 0) return
    track.offset = previous > 0 ? wrap((track.offset / previous) * unit, unit) : wrap(track.offset, unit)
    // The painted value belongs to the old geometry; force the next frame to
    // write rather than skip on a stale comparison.
    track.painted = NaN
    this.paint()
  }

  private observe(group: Element): void {
    // Created on first use so a band that never mounts never opens one.
    this.sizes ??= new ResizeObserver((entries) => {
      for (const entry of entries) {
        const hit = this.tracks.find((t) => t.group === entry.target)
        if (hit) this.measure(hit)
      }
    })
    this.sizes.observe(group)
  }

  /**
   * Webfonts land after first layout and every chip in every band changes width
   * when they do. `ResizeObserver` catches it on its own, but only once the
   * band is on screen and observed; this makes the correction unconditional and
   * costs one promise per band.
   */
  private watchFonts(): void {
    if (this.fontsWatched) return
    this.fontsWatched = true
    document.fonts?.ready.then(() => this.remeasureAll()).catch(() => {})
  }

  /* ------------------------------------------------------------------ */
  /* Lifecycle                                                           */
  /* ------------------------------------------------------------------ */

  mount(surface: HTMLElement): void {
    if (this.surface) this.unmount()
    this.surface = surface
    surface.addEventListener('pointerdown', this.onPointerDown)
    // Capture phase: a click on a chip has to be stopped before it reaches the
    // link, not after.
    surface.addEventListener('click', this.onClick, true)
    surface.addEventListener('dragstart', this.onDragStart)
    document.addEventListener('visibilitychange', this.onVisibility)

    // Mouse only. `(pointer: fine)` is a capability check, not a preference —
    // a coarse pointer has no hover state to read and attaching this there
    // would be per-frame work that can never move anything.
    if (window.matchMedia?.('(pointer: fine)').matches) {
      surface.addEventListener('pointerenter', this.onSurfaceEnter)
      surface.addEventListener('pointerleave', this.onSurfaceLeave)
    }
  }

  /* -- hover ------------------------------------------------------------ */

  private onSurfaceEnter = () => {
    this.hoverTarget = 1
    this.lastPointerX = null
    // Attached on enter and dropped on leave, so the handler does not exist
    // while the cursor is anywhere else on the page.
    this.surface?.addEventListener('pointermove', this.onHoverMove, { passive: true })
    this.start()
  }

  private onSurfaceLeave = () => {
    this.hoverTarget = 0
    this.lastPointerX = null
    this.surface?.removeEventListener('pointermove', this.onHoverMove)
    if (this.pointerFrame) {
      cancelAnimationFrame(this.pointerFrame)
      this.pointerFrame = 0
    }
  }

  /**
   * One sample per frame, not one per event.
   *
   * `pointermove` fires far faster than the compositor consumes it, and every
   * sample here would otherwise do arithmetic that only one of them can affect.
   * The coalescing is the same shape the map's pointer parallax uses.
   */
  private onHoverMove = (e: PointerEvent) => {
    if (this.pointerFrame) return
    const x = e.clientX
    this.pointerFrame = requestAnimationFrame(() => {
      this.pointerFrame = 0
      if (this.lastPointerX !== null) {
        // Instantaneous px/frame, folded in gently so a flick of the wrist
        // leans the band rather than throwing it.
        this.vPointer += (x - this.lastPointerX) * POINTER_GAIN
      }
      this.lastPointerX = x
    })
  }

  /**
   * Undo `mount`, and nothing else.
   *
   * Tracks are deliberately left registered. They are not the band's to drop:
   * each one is owned by the handle `addTrack` returned, and React runs a
   * track's cleanup only when that track unmounts. A band effect that re-runs
   * for its own reasons — a changed dependency, StrictMode's double invoke —
   * cleared a track list that nothing was going to rebuild, and the band came
   * back mounted, listening, and driving zero tracks.
   */
  unmount(): void {
    this.stop()
    this.endGesture(false)
    const surface = this.surface
    if (surface) {
      surface.removeEventListener('pointerdown', this.onPointerDown)
      surface.removeEventListener('click', this.onClick, true)
      surface.removeEventListener('dragstart', this.onDragStart)
      surface.removeEventListener('pointerenter', this.onSurfaceEnter)
      surface.removeEventListener('pointerleave', this.onSurfaceLeave)
      surface.removeEventListener('pointermove', this.onHoverMove)
      delete surface.dataset.dragging
    }
    document.removeEventListener('visibilitychange', this.onVisibility)
    this.surface = null
  }

  /** Called when the band comes on screen. Idempotent. */
  start(): void {
    if (this.running) return
    this.running = true

    const now = performance.now() / 1000
    // A band that has been off screen for a minute must not resume with a
    // minute of accumulated dt.
    this.last = now
    this.scrollY = window.scrollY
    this.scrollAt = now
    this.scrollRaw = 0
    this.scrollSmooth = 0

    // A band that was off screen at first paint has never been measured against
    // a laid-out viewport. Measuring on the way in costs one reflow, once.
    this.remeasureAll()

    window.addEventListener('scroll', this.onScroll, { passive: true })
    this.frame = requestAnimationFrame(this.tick)
  }

  /** Called when the band leaves the screen. */
  stop(): void {
    if (!this.running) return
    this.running = false
    cancelAnimationFrame(this.frame)
    window.removeEventListener('scroll', this.onScroll)
  }

  /**
   * A hidden tab runs no frames and delivers no `ResizeObserver` callbacks, so
   * anything that changed while it was away — a rotation, a devtools resize,
   * fonts finishing — is waiting unread on return. Re-base the clock and
   * re-read the geometry before the next frame consumes either.
   */
  private onVisibility = () => {
    if (document.visibilityState !== 'visible') return
    this.last = performance.now() / 1000
    this.remeasureAll()
  }

  /* ------------------------------------------------------------------ */
  /* Frame                                                               */
  /* ------------------------------------------------------------------ */

  private tick = (now: number) => {
    this.frame = requestAnimationFrame(this.tick)

    const t = now / 1000
    // Clamped: a dropped frame should cost smoothness, not teleport the band.
    const dt = clamp(t - this.last, 0, 0.05)
    this.last = t

    if (this.dragging) {
      // Direct manipulation. Nothing else contributes — the auto-scroll is not
      // damped while the user drags, it is absent.
      //
      // Ahead of the `dt` guard on purpose: drag distance is measured in pixels
      // the pointer has already travelled, not in elapsed time, so a frame that
      // arrives on the same timestamp as the last one still owes the hand its
      // movement. Dropping it there was a visible stutter on high-refresh
      // displays, where duplicate timestamps are common.
      const delta = this.pending
      this.pending = 0
      this.w = 1
      if (delta !== 0) {
        for (const track of this.tracks) track.offset += delta * track.spec.dragMultiplier
      }
    } else {
      if (dt <= 0) return
      const boost = this.scrollBoost(t, dt)

      this.vUser *= decay(dt, this.tauV)
      this.w *= decay(dt, this.tauW)
      // Below this the user's contribution is under a hundredth of a pixel a
      // second; snapping it to zero costs nothing and stops the loop carrying
      // a denormal forever.
      if (this.w < 1e-3) {
        this.w = 0
        this.vUser = 0
      }

      // Hover eases in and out rather than switching, so the slow-down is
      // something the band does and not something that happens to it.
      this.hover += (this.hoverTarget - this.hover) * (1 - decay(dt, HOVER_TAU))
      this.vPointer *= decay(dt, POINTER_TAU)
      if (Math.abs(this.vPointer) < 0.5) this.vPointer = 0

      // Never below MIN_HOVER_DRIFT of normal: a marquee that stops dead under
      // the cursor reads as broken, and the loop has to stay visibly alive
      // while somebody decides which chip to press.
      const damp = 1 - this.hover * (1 - MIN_HOVER_DRIFT)

      const auto = 1 - this.w
      for (const track of this.tracks) {
        const v =
          auto * (this.drift(track, boost) * damp + this.vPointer * track.spec.dragMultiplier) +
          this.w * this.vUser * track.spec.dragMultiplier
        track.offset += v * dt
      }
    }

    this.paint()
  }

  /**
   * A track's automatic velocity once the page-scroll push is folded in.
   *
   * The push modulates the drift; it must never invert it. Nothing constrains
   * `scrollBoost` to be smaller than a track's `speed`, and the coverage band
   * asks for 130 px/s of boost against tracks running at 88 and 116 — so a brisk
   * scroll drove one or the other backwards every time, which is precisely what
   * a broken loop looks like: a strip that is supposed to read right-to-left
   * lurching the other way and then correcting.
   *
   * Floored at a crawl in the track's own direction rather than at zero, so a
   * track being pushed against still visibly slows without stopping or turning.
   */
  private drift(track: Track, boost: number): number {
    const { speed, scrollRate } = track.spec
    const v = speed + boost * scrollRate
    if (speed > 0) return Math.max(v, speed * MIN_DRIFT)
    if (speed < 0) return Math.min(v, speed * MIN_DRIFT)
    return v
  }

  /**
   * Vertical scroll velocity, smoothed and folded into a horizontal push.
   *
   * This is a band's parallax: scrolling into it shoves the content sideways a
   * little and it settles back, which reads as the strip sitting on a different
   * plane to the page. Gated by `1 - w` at the call site, so it cannot nudge
   * content the user is holding.
   */
  private scrollBoost(t: number, dt: number): number {
    // No scroll event for a moment means the page has stopped, and a stale
    // velocity would keep pushing.
    const raw = t - this.scrollAt > 0.12 ? 0 : this.scrollRaw
    this.scrollSmooth += (raw - this.scrollSmooth) * (1 - decay(dt, 0.16))
    return clamp(this.scrollSmooth / SCROLL_REFERENCE, -1, 1) * this.physics.scrollBoost
  }

  private paint(): void {
    for (const track of this.tracks) {
      // Unmeasured — no content yet, or an empty list. Painting a modulo by
      // zero would be `NaN`, which the compositor renders as "gone".
      if (track.unit <= 0) continue

      // Normalising the stored value too, so `offset` can never grow large
      // enough for float precision to start eating the fractional part.
      const m = wrap(track.offset, track.unit)
      track.offset = m

      if (Math.abs(m - track.painted) < 0.01) continue
      track.painted = m
      track.el.style.transform = `translate3d(${-m}px, 0, 0)`
    }
  }

  /* ------------------------------------------------------------------ */
  /* Pointer                                                             */
  /* ------------------------------------------------------------------ */

  private onPointerDown = (e: PointerEvent) => {
    if (e.button > 0) return

    // A gesture still open when a fresh press arrives is a gesture whose
    // release we never saw. That happens for reasons outside this class: a
    // context menu opening mid-drag swallows the `pointerup`, a button let go
    // past the edge of the window never reports back, and a `pointerup`
    // dispatched to a node React has already unmounted — the tracks re-render
    // whenever the copy count changes — never reaches the window to bubble.
    //
    // The old code returned here, and `pointer` is cleared nowhere but
    // `endGesture`. So one missed release wedged the band permanently: the rAF
    // loop kept drifting, which made it look alive, while every press for the
    // rest of the page's life was discarded. A new primary press is proof the
    // previous gesture is over, so close it out and take this one — through the
    // same path a cancel takes, since that is what it was.
    if (this.pointer !== -1) this.releaseControl()

    this.pointer = e.pointerId
    this.coarse = e.pointerType !== 'mouse'
    this.startX = this.lastX = e.clientX
    this.startY = e.clientY
    this.samples.length = 0
    this.suppressClick = false

    // On window rather than the surface: a fast drag leaves the band long
    // before it leaves the page, and the gesture should survive that.
    //
    // Capture phase, so the release cannot be hidden from us. Bubbling to the
    // window is the last thing to happen to a pointer event and anything in
    // between — a card, a menu, another library's gesture handler — calling
    // `stopPropagation` on the way up would strand this class mid-drag.
    // Capture runs before all of them.
    window.addEventListener('pointermove', this.onPointerMove, CAPTURE_PASSIVE)
    window.addEventListener('pointerup', this.onPointerUp, true)
    window.addEventListener('pointercancel', this.onPointerCancel, true)
    // Alt-tabbing away with the button down: no release is ever delivered.
    window.addEventListener('blur', this.onWindowBlur)
  }

  private onWindowBlur = () => {
    if (this.pointer !== -1) this.releaseControl()
  }

  private onPointerMove = (e: PointerEvent) => {
    if (e.pointerId !== this.pointer) return

    if (!this.dragging) {
      const dx = e.clientX - this.startX
      const dy = e.clientY - this.startY

      // A touch that travels vertically is the page being scrolled. Hand the
      // gesture back rather than competing for it — `touch-action: pan-y` has
      // already let the browser start, and taking it over now would be a jerk
      // mid-scroll.
      if (
        this.coarse &&
        Math.abs(dy) > this.physics.dragThreshold &&
        Math.abs(dy) >= Math.abs(dx)
      ) {
        this.endGesture(false)
        return
      }
      if (Math.abs(dx) < this.physics.dragThreshold) return

      this.dragging = true
      if (this.surface) this.surface.dataset.dragging = 'true'
      // Only now: capturing at pointerdown would retarget the click away from
      // the chip and break every link in the band. By this point the click is
      // being suppressed anyway.
      try {
        this.surface?.setPointerCapture(this.pointer)
      } catch {
        /* pointer already gone */
      }
      // Start from where the cursor is, not from where it pressed, so the
      // content does not jump by the threshold on the first frame.
      this.lastX = e.clientX
    }

    // Cursor right → content right → less negative translate → offset falls.
    // One pixel of cursor is one pixel of track at `dragMultiplier` 1, whatever
    // the content is or how much of it there is.
    this.pending += this.lastX - e.clientX
    this.lastX = e.clientX

    this.samples.push({ t: e.timeStamp / 1000, x: e.clientX })
    if (this.samples.length > 8) this.samples.shift()
  }

  private onPointerUp = (e: PointerEvent) => {
    if (e.pointerId !== this.pointer) return

    const dragged = this.dragging
    if (dragged) {
      this.vUser = clamp(this.fling(e.timeStamp / 1000, e.clientX), -MAX_FLING, MAX_FLING)
      this.w = 1

      // A hard throw earns a longer tail. Held constant for the whole decay —
      // a time constant that moves while it is being applied is a velocity
      // curve with a kink in it, and the kink is visible.
      const heat = Math.min(Math.abs(this.vUser) / 2400, 1)
      this.tauV = this.physics.glide * (1 + heat * 0.7)

      // The hand-back scales from a *short* base rather than from the full
      // constant, because `w` is what silences the auto-scroll: velocity is
      // `(1 - w) * speed + w * vUser`, so at w = 1 the drift contributes
      // nothing and `vUser` is the only thing moving the band.
      //
      // That is right for a throw and wrong for everything else. Drag slowly,
      // hold still a moment, release: `fling` correctly reports ~0, and the old
      // line then paired w = 1 with vUser = 0 — a band stopped dead, easing
      // back in over seconds. The coverage band asks for the longest handover
      // on the page, so it stalled the longest and read as the loop having
      // broken. Tying the tail to the size of the throw means no throw, no tail.
      this.tauW = this.physics.handover * (0.15 + heat * 1.55)
    }

    this.endGesture(dragged)
  }

  private onPointerCancel = (e: PointerEvent) => {
    if (e.pointerId !== this.pointer) return
    this.releaseControl()
  }

  /**
   * Hand the band back after a gesture that was cut short rather than let go.
   *
   * A cancelled pointer has no meaningful release velocity, so there is no
   * fling — but "no fling" has to be said explicitly, and the old code left
   * both blend terms untouched. `tick` pins `w = 1` on every dragging frame
   * while `vUser` still holds the *previous* gesture's decayed velocity, so a
   * cancel resumed on a stale number: usually zero, sometimes a leftover throw
   * in the wrong direction.
   *
   * Zero is the honest velocity here, and at `w = 1` it contributes exactly
   * that — which means the auto-scroll, gated by `1 - w`, is fully suppressed
   * until `w` decays. On the throw's time constant that is seconds of a band
   * sitting still after the hand has gone. The hand-back is what should ease,
   * not stall, so it runs on its own short constant.
   */
  private releaseControl(): void {
    this.vUser = 0
    this.tauW = Math.min(this.physics.handover, CANCEL_HANDOVER)
    this.endGesture(this.dragging)
  }

  /**
   * Release velocity, averaged over the tail of the gesture.
   *
   * One frame's delta is mostly noise, and the whole gesture is history the
   * user stopped caring about the moment they changed direction. ~90ms is the
   * window in which the throw actually happened. This is the *only* source of
   * momentum in the system — there is no fixed fling distance anywhere.
   */
  private fling(t: number, x: number): number {
    if (!this.samples.length) return 0

    const cutoff = t - 0.09
    let ref = this.samples[0]
    for (let i = this.samples.length - 1; i >= 0; i--) {
      ref = this.samples[i]
      if (ref.t <= cutoff) break
    }

    const dt = t - ref.t
    if (dt < 0.008) return 0
    return -(x - ref.x) / dt
  }

  private endGesture(dragged: boolean): void {
    if (this.pointer === -1) return

    // Fold in the last sliver of drag so releasing never drops a frame of
    // movement on the floor.
    for (const track of this.tracks) track.offset += this.pending * track.spec.dragMultiplier
    this.pending = 0

    try {
      if (this.surface?.hasPointerCapture(this.pointer)) {
        this.surface.releasePointerCapture(this.pointer)
      }
    } catch {
      /* pointer already gone */
    }

    // Flags have to match the registration or the listener is never found.
    window.removeEventListener('pointermove', this.onPointerMove, CAPTURE_PASSIVE)
    window.removeEventListener('pointerup', this.onPointerUp, true)
    window.removeEventListener('pointercancel', this.onPointerCancel, true)
    window.removeEventListener('blur', this.onWindowBlur)

    this.pointer = -1
    this.dragging = false
    this.samples.length = 0
    if (this.surface) delete this.surface.dataset.dragging
    // Consumed by the click that pointerup is about to produce; cleared on the
    // next pointerdown if that click never arrives.
    this.suppressClick = dragged
  }

  /** A drag that ends on a chip must not also open it. */
  private onClick = (e: MouseEvent) => {
    if (!this.suppressClick) return
    this.suppressClick = false
    e.preventDefault()
    e.stopPropagation()
  }

  /** Anchors and images are natively draggable, and that steals the gesture. */
  private onDragStart = (e: Event) => {
    e.preventDefault()
  }

  private onScroll = () => {
    const y = window.scrollY
    const t = performance.now() / 1000
    const dt = t - this.scrollAt

    // A long gap is a new scroll starting, not a slow one continuing.
    if (dt > 0.2) this.scrollRaw = 0
    else if (dt > 0.001) this.scrollRaw = (y - this.scrollY) / dt

    this.scrollY = y
    this.scrollAt = t
  }
}

/** `??`, not a spread default: an omitted optional prop arrives as `undefined`. */
function normalise(spec: TrackSpec): Required<TrackSpec> {
  return {
    speed: spec.speed,
    dragMultiplier: spec.dragMultiplier ?? 1,
    scrollRate: spec.scrollRate ?? 1,
  }
}

/**
 * How many copies of the content a track needs.
 *
 * The track wraps by exactly one `unit`, so at the moment it wraps the copies
 * that remain to the right of the fold have to still cover the viewport. That
 * needs `ceil(viewport / unit) + 1`, and one more buys the subpixel margin.
 *
 * Everything here is measured. One wide item and eighty narrow ones both land
 * on a correct answer, and so does the same list at 320px and at 2560px.
 */
export function copiesFor(viewportWidth: number, unit: number): number {
  if (!(unit > 0) || !(viewportWidth > 0)) return 1
  return Math.ceil(viewportWidth / unit) + 2
}
