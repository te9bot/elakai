import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Key,
  type ReactNode,
} from 'react'
import { useReducedMotion } from '@/lib/motion'
import {
  copiesFor,
  InfiniteTrackEngine,
  type BandPhysics,
  type TrackHandle,
  type TrackSpec,
} from '@/lib/infinite-track'
import { cn } from '@/lib/utils'

/**
 * The draggable infinite band, and the tracks inside it.
 *
 * Split in two on purpose. `<InfiniteBand>` is the *surface* — one pointer
 * gesture, one rAF loop, one set of physics — and `<InfiniteHorizontalTrack>`
 * is a *track*, which has its own data, speed, direction and share of that
 * gesture. A band with one track is an editorial strip; a band with two tracks
 * running at different rates is a field you can push around. Same engine,
 * different configuration, which is the whole relationship between "Covering"
 * and "Everything ELAKAI covers".
 *
 * **A track takes data, not markup.** You hand it `items` and a `renderItem`,
 * and it does the rest: measures one rendered copy, works out how many copies
 * the viewport needs, generates them from that same array, and tells the engine
 * how far one loop is. Nothing in here or in `lib/infinite-track.ts` knows how
 * many items there are or how wide any of them is. Add an item, remove one,
 * reorder them, swap the whole list for one that arrived from the API a second
 * ago — the loop re-measures and carries on. There is no duplicate array to
 * keep in step and no number to update.
 *
 * React's only jobs are mounting, counting copies, and getting out of the way:
 * every frame is a `transform` write from `lib/infinite-track.ts` on a ref.
 * There is no state in the animation path and no re-render while it runs.
 *
 * Accessibility follows `components/marquee.tsx` exactly — the band is
 * `aria-hidden` and callers pass `tabIndex={-1}` to their items. A band paints
 * every item several times over, and duplicate links in the tab order, or read
 * out four times each, are worse than none. Nothing is reachable *only* here.
 */

type BandContext = {
  /** Null under reduced motion: tracks then render as a plain scrollable rail. */
  engine: InfiniteTrackEngine | null
}

const Band = createContext<BandContext | null>(null)

/* ------------------------------------------------------------------ */
/* Band                                                                */
/* ------------------------------------------------------------------ */

export function InfiniteBand({
  children,
  className,
  ...physics
}: BandPhysics & {
  children: ReactNode
  className?: string
}) {
  const reduced = useReducedMotion()
  const surfaceRef = useRef<HTMLDivElement>(null)

  const { glide, handover, scrollBoost, dragThreshold } = physics

  // Built during render rather than in an effect: tracks register from their
  // own effects, which React runs *before* this component's, and they need an
  // engine to register with by then.
  const engineRef = useRef<InfiniteTrackEngine | null>(null)
  engineRef.current ??= new InfiniteTrackEngine(physics)
  const engine = engineRef.current

  useEffect(() => {
    engine.configure({ glide, handover, scrollBoost, dragThreshold })
  }, [engine, glide, handover, scrollBoost, dragThreshold])

  useEffect(() => {
    const surface = surfaceRef.current
    if (!surface || reduced) return

    engine.mount(surface)

    // The loop only runs while the band is worth looking at. The margin starts
    // it just before it arrives, so it is already in motion when it appears
    // rather than visibly starting from a standstill.
    const io = new IntersectionObserver(
      (entries) => {
        // `entries`, not `entries[0]`: several changes can be delivered in one
        // callback, and only the last one is the current state.
        const entry = entries[entries.length - 1]
        if (entry.isIntersecting) engine.start()
        else engine.stop()
      },
      { rootMargin: '240px 0px' },
    )
    io.observe(surface)

    return () => {
      io.disconnect()
      engine.unmount()
    }
  }, [engine, reduced])

  const context = useMemo<BandContext>(
    () => ({ engine: reduced ? null : engine }),
    [engine, reduced],
  )

  return (
    <Band.Provider value={context}>
      <div
        ref={surfaceRef}
        aria-hidden="true"
        className={cn(!reduced && 'drag-band', className)}
      >
        {children}
      </div>
    </Band.Provider>
  )
}

/* ------------------------------------------------------------------ */
/* The hook                                                            */
/* ------------------------------------------------------------------ */

/**
 * Everything a track needs to loop forever over an arbitrary list.
 *
 * Exported because the measurement contract is the interesting part and a
 * caller may want a different shell around it — a different element, a
 * different fade, items that are not chips. The three refs go on the viewport,
 * the track and the *first* copy respectively; `copies` is how many copies to
 * render.
 *
 * Recalculation is driven by four things, so the numbers cannot go stale:
 *
 *  - a `ResizeObserver` on the viewport — window resize, breakpoint, sidebar,
 *    device rotation;
 *  - the same observer on the first copy — the items themselves changing width,
 *    which covers webfonts swapping in, images decoding, and text reflowing at
 *    a new font size;
 *  - `document.fonts.ready`, because a font swap that happens off-screen is not
 *    always delivered as a resize;
 *  - `signature`, a cheap identity of the item list, so new data from the API
 *    re-measures on the same frame it renders.
 */
export function useInfiniteHorizontalScroll({
  engine,
  signature,
  enabled,
  speed,
  dragMultiplier,
  scrollRate,
}: TrackSpec & {
  engine: InfiniteTrackEngine | null
  /** Changes whenever the item list does. See `InfiniteHorizontalTrack`. */
  signature: string
  /** False for an empty list: there is nothing to measure or register. */
  enabled: boolean
}) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const groupRef = useRef<HTMLDivElement>(null)
  const handleRef = useRef<TrackHandle | null>(null)

  /**
   * Starts at one and is corrected before the first paint by the layout effect
   * below. Guessing high instead would mean rendering copies that may not be
   * needed — on a phone, over a list the admin has just doubled, that is real
   * work — and guessing low costs one synchronous re-render.
   */
  const [copies, setCopies] = useState(1)

  const live = Boolean(engine) && enabled

  // Registration is deliberately independent of the physics: a speed change
  // re-configures the existing track rather than dropping and re-adding it,
  // which would reset the offset and jump the band.
  useEffect(() => {
    const track = trackRef.current
    if (!engine || !track || !enabled) return

    const handle = engine.addTrack(track, { speed: 0 })
    handleRef.current = handle

    return () => {
      handleRef.current = null
      handle.dispose()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, enabled])

  useEffect(() => {
    handleRef.current?.update({ speed, dragMultiplier, scrollRate })
  }, [speed, dragMultiplier, scrollRate, live])

  const recount = useCallback(() => {
    const viewport = viewportRef.current
    const track = trackRef.current
    const group = groupRef.current
    if (!viewport || !track || !group) return

    const gap = parseFloat(getComputedStyle(track).columnGap)
    const unit = group.getBoundingClientRect().width + (Number.isNaN(gap) ? 0 : gap)
    // Nothing laid out yet. The observers will call back when there is.
    if (!(unit > 0)) return

    const next = copiesFor(viewport.clientWidth, unit)
    setCopies((prev) => (prev === next ? prev : next))
    handleRef.current?.remeasure()
  }, [])

  useLayoutEffect(() => {
    if (!live) return
    const viewport = viewportRef.current
    const group = groupRef.current
    if (!viewport || !group) return

    // The viewport and the first copy, never the track: the track's width is
    // what `recount` changes, and observing it would be a feedback loop.
    const sizes = new ResizeObserver(() => recount())
    sizes.observe(viewport)
    sizes.observe(group)

    // `load` does not bubble, so this has to be a capture-phase listener. It
    // catches images that finish after layout has already settled around them.
    group.addEventListener('load', recount, true)

    let alive = true
    document.fonts?.ready
      .then(() => {
        if (alive) recount()
      })
      .catch(() => {})

    recount()

    return () => {
      alive = false
      sizes.disconnect()
      group.removeEventListener('load', recount, true)
    }
    // `signature` re-runs this when the data changes, which re-measures a track
    // whose content has just been replaced.
  }, [live, signature, recount])

  return { viewportRef, trackRef, groupRef, copies, live }
}

/* ------------------------------------------------------------------ */
/* Track                                                               */
/* ------------------------------------------------------------------ */

export type InfiniteHorizontalTrackProps<T> = TrackSpec & {
  /** The single source of truth. Render, duplication and loop all come from it. */
  items: readonly T[]
  renderItem: (item: T, index: number) => ReactNode
  /**
   * Stable identity per item. Defaults to the item itself when it is a string
   * or a number, and to the index otherwise — pass one for objects so React
   * reconciles rather than rebuilds when the list changes.
   */
  itemKey?: (item: T, index: number) => Key
  /** Gap between items, as a CSS length. Must be a length, not a keyword —
   *  the engine reads it back off the track to size one loop. */
  gap?: string
  /** Soften both ends into the background so items enter and leave. */
  fade?: boolean
  className?: string
}

export function InfiniteHorizontalTrack<T>({
  items,
  renderItem,
  itemKey,
  speed,
  dragMultiplier = 1,
  scrollRate = 1,
  gap = '0.75rem',
  fade = true,
  className,
}: InfiniteHorizontalTrackProps<T>) {
  const band = useContext(Band)
  const engine = band?.engine ?? null

  const keyOf = useCallback(
    (item: T, index: number): Key => {
      if (itemKey) return itemKey(item, index)
      return typeof item === 'string' || typeof item === 'number' ? item : index
    },
    [itemKey],
  )

  // One pass over a list of tens of items, once per render. It is both the
  // React key source and the "has the data changed?" signal the measurement
  // effect watches, so the two can never disagree about what is on screen.
  const signature = useMemo(
    () => items.map((item, i) => String(keyOf(item, i))).join(' '),
    [items, keyOf],
  )

  const { viewportRef, trackRef, groupRef, copies, live } = useInfiniteHorizontalScroll({
    engine,
    signature,
    enabled: items.length > 0,
    speed,
    dragMultiplier,
    scrollRate,
  })

  const spacing = { '--drag-gap': gap } as CSSProperties

  // An empty list is not a broken band, it is a band with nothing to say yet —
  // the first render before the API answers, or a section the admin has
  // emptied. Render nothing rather than an empty bordered strip.
  if (items.length === 0) return null

  const copy = (index: number) => items.map((item, i) => (
    <Fragment key={`${index} ${keyOf(item, i)}`}>{renderItem(item, i)}</Fragment>
  ))

  // Reduced motion: an ordinary scrollable rail with one readable copy, built
  // from the same array. The band above has already dropped its cursor and
  // gesture handling.
  if (!live) {
    return (
      <div
        className={cn('drag-row-static', fade && 'edge-fade-x', className)}
        style={spacing}
      >
        <div className="drag-group">{copy(0)}</div>
      </div>
    )
  }

  return (
    <div
      ref={viewportRef}
      className={cn('drag-row', fade && 'edge-fade-x', className)}
      style={spacing}
    >
      <div ref={trackRef} className="drag-track">
        {Array.from({ length: copies }, (_, index) => (
          <div
            className="drag-group"
            key={index}
            ref={index === 0 ? groupRef : undefined}
          >
            {copy(index)}
          </div>
        ))}
      </div>
    </div>
  )
}
