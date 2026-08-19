import { memo } from 'react'

import {
  KUSHTIA_DISTRICT,
  KUSHTIA_PADMA,
  KUSHTIA_PRIMARY_ROADS,
  KUSHTIA_TRIBUTARIES,
  KUSHTIA_TRUNK_ROADS,
} from '@/data/kushtia-geo.generated'

/* ==========================================================================
 * The real Kushtia ground, as one static layer.
 *
 * Split out of kushtia-map.tsx because it is the half that never changes: no
 * refs, no state, no props that vary, nothing the animation loop touches. The
 * map component keeps the parts that move — the focus light, the markers and
 * the veil — and mounts this once.
 *
 * WHY IT IS ONE LAYER AND NOT FIVE
 *
 * The artwork this replaces had grid, blocks, river, roads and routes on five
 * separate parallax depths, and that was the right call for invented geometry:
 * shapes that mean nothing in particular can slide against each other and the
 * eye reads depth. Real geography cannot. The Padma *is* the district's
 * northern boundary, so a Padma that drifts against the district outline does
 * not read as depth — it reads as the map coming apart. The roads meet the
 * rivers at real bridges. Everything here is the same piece of ground and it
 * moves as one piece.
 *
 * That is also cheaper: one transform write per frame instead of five, and one
 * promoted layer instead of five.
 *
 * Geometry © OpenStreetMap contributors (ODbL). The attribution is rendered by
 * the map component — see KUSHTIA_ATTRIBUTION.
 * ========================================================================== */

/**
 * Everything is clipped to the district except the Padma.
 *
 * The road and river networks were fetched over a bounding box, so they run
 * well past Kushtia into Rajshahi and Jhenaidah. Clipping makes the
 * composition read as one district rather than as a rectangle cut out of
 * Bangladesh. The Padma is the exception on purpose: it is the boundary
 * itself, so clipping it to the boundary would thin it to nothing along the
 * very edge it defines.
 */
function GroundImpl({ clipId }: { clipId: string }) {
  return (
    <>
      {/* Land. A fill rather than a stroke, so the district reads as a place
          with an inside rather than as an outline drawn on the page. */}
      <path d={KUSHTIA_DISTRICT} className="fill-[#ffffff]/70 dark:fill-[#111c2e]/70" />

      <g clipPath={`url(#${clipId})`}>
        {/* Primary roads first, then trunk over them: the hierarchy is drawn
            in the order a reader should notice it. */}
        <path
          d={KUSHTIA_PRIMARY_ROADS}
          fill="none"
          strokeLinecap="round"
          strokeWidth={1.5}
          className="stroke-[#dbe3ee] dark:stroke-[#1b2942]"
        />
        <path
          d={KUSHTIA_TRUNK_ROADS}
          fill="none"
          strokeLinecap="round"
          strokeWidth={2.1}
          className="stroke-[#cbd5e1] dark:stroke-[#24354f]"
        />
        {/* Gorai-Madhumati, Kumar Nod, Ichhamoti, Mathavanga. */}
        <path
          d={KUSHTIA_TRIBUTARIES}
          fill="none"
          strokeLinecap="round"
          strokeWidth={1.9}
          className="stroke-[#7dd3fc]/80 dark:stroke-[#1e4e6b]"
        />
      </g>

      {/* The Padma, unclipped — it is the northern boundary, not a feature
          inside it. The strongest line on the map, which is what it is on the
          ground. */}
      <path
        d={KUSHTIA_PADMA}
        fill="none"
        strokeLinecap="round"
        strokeWidth={3.2}
        className="stroke-[#38bdf8]/90 dark:stroke-[#38bdf8]/70"
      />

      {/* The district edge, drawn last so it sits over the roads that run up
          to it. Deliberately quiet: the shape is already legible from the land
          fill, and a heavy outline would make this read as a chart. */}
      <path
        d={KUSHTIA_DISTRICT}
        fill="none"
        strokeWidth={1.4}
        className="stroke-[#cbd5e1] dark:stroke-[#24344b]"
      />
    </>
  )
}

/**
 * Memoised on an empty prop surface.
 *
 * `clipId` is the only input and it is a constant at every call site, so this
 * subtree renders once for the life of the page. The map above it re-renders
 * on locale changes; there is no reason for ~1,900 points of path data to be
 * diffed when somebody switches to English.
 */
export const MapGround = memo(GroundImpl)
