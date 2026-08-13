import { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { LazyMotion, domAnimation } from 'framer-motion'

import { InfiniteBand, InfiniteHorizontalTrack } from '@/components/infinite-track'
import './index.css'

/**
 * Dev harness for `components/infinite-track.tsx`. Not part of the app: Vite
 * builds `index.html` only, so nothing here reaches a bundle.
 *
 * It exists to answer the one question the homepage cannot, because the
 * homepage always has twenty-five chips in it — does the loop still work when
 * the content is *not* that? Every control below changes the data or the box
 * around it and nothing else; the two bands underneath are configured exactly
 * as the real ones are, and the readout is measured off the live DOM.
 *
 * Note the container-width slider: it resizes the box the bands live in rather
 * than the window, which is how you check a breakpoint without a second
 * monitor. The bands cannot tell the difference — both arrive as a
 * `ResizeObserver` callback on the viewport element.
 *
 * The invariant it checks, per track: at the moment the track wraps by one
 * `unit`, the copies to the right of the fold must still cover the viewport.
 * Written out, `trackWidth >= unit + viewportWidth`. If that ever goes red, the
 * loop has a hole in it.
 */

type LabItem = {
  id: string
  label: string
  emoji: string
  /** Rendered as an inline SVG data URI, so "images" load asynchronously. */
  image: number | null
}

const WORDS = [
  'Ambulance',
  'Hospital',
  'Pharmacy',
  'Blood Bank',
  'Electrician',
  'Plumber',
  'Apartment',
  'Generator Repair and Overnight Servicing',
  'AC',
  'Diagnostic Centre',
  'Mechanic',
  'House',
  'Doctor',
  'Internet',
  'Shop',
]

const EMOJI = ['🚑', '🏥', '💊', '🩸', '🔧', '🚰', '🏢', '⚡', '❄️', '🔬', '🛠️', '🏠', '👨‍⚕️', '🌐', '🏪']

/** A coloured square, base64'd, so each size is a distinct async decode. */
function swatch(size: number, hue: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="4" fill="hsl(${hue} 70% 55%)"/></svg>`
  return `data:image/svg+xml;base64,${btoa(svg)}`
}

function build(count: number, opts: { images: boolean; longLabels: boolean }): LabItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `item-${i}`,
    label: opts.longLabels
      ? `${WORDS[i % WORDS.length]} ${'·'.repeat((i % 4) + 1)} ${i + 1}`
      : `${WORDS[i % WORDS.length]} ${i + 1}`,
    emoji: EMOJI[i % EMOJI.length],
    // Deliberately uneven: the loop must not care that item 3 is twice the
    // height of item 2, only what the row measures out to in the end.
    image: opts.images ? 14 + ((i * 7) % 22) : null,
  }))
}

function Chip({ item }: { item: LabItem }) {
  return (
    <span
      tabIndex={-1}
      className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-pill border border-line bg-surface px-3.5 text-meta font-semibold text-ink shadow-card"
    >
      {item.image ? (
        <img src={swatch(item.image, (item.image * 13) % 360)} alt="" width={item.image} height={item.image} />
      ) : (
        <span aria-hidden="true">{item.emoji}</span>
      )}
      {item.label}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Readout                                                             */
/* ------------------------------------------------------------------ */

type Reading = {
  viewport: number
  unit: number
  copies: number
  trackWidth: number
  seamless: boolean
}

function useReadings(scopeRef: React.RefObject<HTMLElement>, deps: unknown[]): Reading[] {
  const [readings, setReadings] = useState<Reading[]>([])

  useEffect(() => {
    const read = () => {
      const scope = scopeRef.current
      if (!scope) return
      const rows = [...scope.querySelectorAll<HTMLElement>('.drag-row')]
      setReadings(
        rows.map((row) => {
          const track = row.firstElementChild as HTMLElement
          const group = track.firstElementChild as HTMLElement
          const gap = parseFloat(getComputedStyle(track).columnGap) || 0
          const unit = group.getBoundingClientRect().width + gap
          const trackWidth = track.getBoundingClientRect().width
          return {
            viewport: row.clientWidth,
            unit: Math.round(unit * 10) / 10,
            copies: track.children.length,
            trackWidth: Math.round(trackWidth * 10) / 10,
            seamless: trackWidth + 0.5 >= unit + row.clientWidth,
          }
        }),
      )
    }

    const id = setInterval(read, 250)
    read()
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return readings
}

/* ------------------------------------------------------------------ */
/* Lab                                                                 */
/* ------------------------------------------------------------------ */

function Lab() {
  const [coveringCount, setCoveringCount] = useState(18)
  const [coversCount, setCoversCount] = useState(25)
  const [images, setImages] = useState(false)
  const [longLabels, setLongLabels] = useState(false)
  const [width, setWidth] = useState(1200)
  const [pending, setPending] = useState(false)
  /** Bumped by "refetch": remounts nothing, just hands the bands a new array. */
  const [generation, setGeneration] = useState(0)

  const covering = useMemo(
    () => (pending ? [] : build(coveringCount, { images, longLabels })),
    [coveringCount, images, longLabels, pending, generation],
  )
  const covers = useMemo(
    () => (pending ? [] : build(coversCount, { images, longLabels })),
    [coversCount, images, longLabels, pending, generation],
  )

  const lead = covers.slice(0, Math.ceil(covers.length / 2))
  const trail = covers.slice(Math.ceil(covers.length / 2))

  const scopeRef = useRef<HTMLDivElement>(null)
  const readings = useReadings(scopeRef, [covering, covers, width])

  /** "The API answered late." Empties both bands, then fills them 900ms later. */
  const refetch = () => {
    setPending(true)
    setGeneration((g) => g + 1)
    window.setTimeout(() => setPending(false), 900)
  }

  return (
    <div className="min-h-dvh bg-canvas p-6 text-ink">
      <h1 className="text-title">Infinite track lab</h1>
      <p className="mt-1 max-w-2xl text-body-sm text-ink-muted">
        The same engine the homepage runs, over data you can change underneath it. Nothing
        below rebuilds the bands — they are handed a different array and re-measure.
      </p>

      <div className="mt-5 flex flex-wrap items-end gap-5 rounded-card border border-line bg-surface p-4 text-meta">
        <Range label="Covering items" value={coveringCount} min={0} max={40} onChange={setCoveringCount} />
        <Range label="Covers items" value={coversCount} min={0} max={60} onChange={setCoversCount} />
        <Range label="Container width" value={width} min={280} max={1600} step={10} onChange={setWidth} />
        <Check label="Images" checked={images} onChange={setImages} />
        <Check label="Long labels" checked={longLabels} onChange={setLongLabels} />
        <button
          type="button"
          onClick={refetch}
          className="rounded-control border border-line bg-surface-2 px-3 py-1.5 font-semibold"
        >
          Simulate refetch
        </button>
      </div>

      <div
        ref={scopeRef}
        style={{ width }}
        className="mt-6 overflow-hidden rounded-card border border-line bg-surface"
      >
        <p className="border-b border-line px-4 py-2 text-micro uppercase tracking-[0.14em] text-ink-subtle">
          Covering — editorial
        </p>
        <InfiniteBand glide={0.5} handover={0.42} scrollBoost={44}>
          <InfiniteHorizontalTrack
            items={covering}
            itemKey={(item: LabItem) => item.id}
            speed={70}
            gap="0.6rem"
            className="py-3"
            renderItem={(item: LabItem) => <Chip item={item} />}
          />
        </InfiniteBand>

        <p className="border-y border-line px-4 py-2 text-micro uppercase tracking-[0.14em] text-ink-subtle">
          Everything ELAKAI covers — energetic
        </p>
        <InfiniteBand glide={1.05} handover={0.85} scrollBoost={130} className="space-y-3 py-3">
          <InfiniteHorizontalTrack
            items={lead}
            itemKey={(item: LabItem) => item.id}
            speed={88}
            gap="0.8rem"
            renderItem={(item: LabItem) => <Chip item={item} />}
          />
          <InfiniteHorizontalTrack
            items={trail}
            itemKey={(item: LabItem) => item.id}
            speed={116}
            dragMultiplier={1.34}
            scrollRate={-1}
            gap="0.8rem"
            renderItem={(item: LabItem) => <Chip item={item} />}
          />
        </InfiniteBand>
      </div>

      <table className="tnum mt-6 text-meta">
        <thead className="text-ink-subtle">
          <tr>
            {['track', 'viewport', 'unit', 'copies', 'track width', 'seamless'].map((h) => (
              <th key={h} className="px-3 py-1 text-left font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {readings.map((r, i) => (
            <tr key={i} className="border-t border-line">
              <td className="px-3 py-1">{i}</td>
              <td className="px-3 py-1">{r.viewport}</td>
              <td className="px-3 py-1">{r.unit}</td>
              <td className="px-3 py-1">{r.copies}</td>
              <td className="px-3 py-1">{r.trackWidth}</td>
              <td className={`px-3 py-1 font-bold ${r.seamless ? 'text-success' : 'text-danger'}`}>
                {r.seamless ? 'yes' : 'HOLE'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Range({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-semibold">
        {label}: <span className="tnum">{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 font-semibold">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  )
}

createRoot(document.getElementById('root')!).render(
  <LazyMotion features={domAnimation} strict>
    <Lab />
  </LazyMotion>,
)
