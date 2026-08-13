import { LOGO_LAYERS, LOGO_VIEW_BOX, type LogoLayerName } from './logo-mark.generated'
import { cn } from '@/lib/utils'

/**
 * The pin mark, as five separable planes.
 *
 * The geometry comes from scripts/build-logo-layers.mjs, which traces
 * assets/logo parallax  animation.png. Nothing here draws the logo — this file
 * only decides how the traced planes stack and how far apart in space they
 * read.
 */

/**
 * How far forward each plane sits. These are *ratios*, not distances: a
 * consumer multiplies them by whatever travel it wants, so the sense of depth
 * stays identical whether the mark is drifting 4px under the cursor or 40px
 * across a scroll.
 *
 * The order is the artwork's own logic — the pin is the frame everything else
 * sits inside, so it is furthest back; the windowed tower is the tallest thing
 * in the scene, so it is nearest.
 */
export const LOGO_DEPTH: Record<LogoLayerName, number> = {
  pin: 0.4,
  road: 0.7,
  house: 1,
  shop: 1.25,
  tower: 1.5,
}

/** Back to front. Painting order follows depth so overlaps resolve correctly
 *  once the planes are pulled apart. */
export const LOGO_PLANES = [...LOGO_LAYERS].sort(
  (a, b) => LOGO_DEPTH[a.name] - LOGO_DEPTH[b.name],
)

const [, , VB_W, VB_H] = LOGO_VIEW_BOX.split(' ').map(Number)

/** Keeps any box holding the mark at the artwork's own proportions. */
export const LOGO_ASPECT = `${VB_W} / ${VB_H}`

/**
 * The road is the white the pin leaves behind rather than a drawn colour, so
 * it is painted in the page ground. That is exact wherever the mark sits on
 * the canvas — which is everywhere it is used.
 */
export const LOGO_GROUND = 'hsl(var(--canvas))'

export function layerFill(fill: string | null): string {
  return fill ?? LOGO_GROUND
}

/** The assembled mark, no motion. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox={LOGO_VIEW_BOX}
      className={cn('block', className)}
      role="img"
      aria-label="ELAKAI"
    >
      {LOGO_PLANES.map((layer) => (
        <path key={layer.name} d={layer.d} fill={layerFill(layer.fill)} fillRule="evenodd" />
      ))}
    </svg>
  )
}
