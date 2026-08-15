import type { LatLng } from '@/data/types'

/* ==========================================================================
 * Directions — the one place a record becomes a map destination.
 *
 * The rule this module exists to enforce: a Directions link must lead to the
 * place the user tapped, or it must not exist.
 *
 * That sounds obvious and was not what the app did. Most record types carry
 * coordinates that fall back to their upazila's centre when the real location
 * is unknown, so a listing with no surveyed position still had a `coords` pair
 * — and a Directions button built from it sent everyone in Kushtia Sadar to the
 * same point. A destination that is confidently wrong is worse than an absent
 * button: the user drives somewhere.
 *
 * So a caller must say whether its coordinates are a real position or a
 * placeholder centre, and an approximate pair is treated as no pair at all.
 * The order is:
 *
 *   1. exact coordinates      -> a directions request to that lat/lng
 *   2. a written address      -> a map search for that address
 *   3. neither                -> null, and the button does not render
 *
 * The address fallback is genuinely useful here: these are Bangladeshi
 * addresses that Google resolves well, and "আমিন ভবন, কলেজ মোড়, কুষ্টিয়া"
 * lands closer than an upazila centroid ever would.
 * ========================================================================== */

export type DirectionsTarget = {
  /** A surveyed position. Omit when unknown — do not pass an area centre. */
  coords?: LatLng | null
  /**
   * True when `coords` is a fallback (an area or district centre) rather than
   * this record's own position. Such coordinates are ignored entirely.
   */
  coordsApprox?: boolean
  /** A written address, used when there is no exact position. */
  address?: string | null
  /** The place name, used to label the destination where the map supports it. */
  label?: string | null
}

/** How a destination was resolved, for callers that want to say so. */
export type DirectionsKind = 'coords' | 'address'

export type DirectionsResolution = { href: string; kind: DirectionsKind }

function validCoords(c: LatLng | null | undefined): c is LatLng {
  return (
    !!c &&
    Number.isFinite(c.lat) &&
    Number.isFinite(c.lng) &&
    // 0,0 is the Atlantic. It is what an unset numeric column looks like once
    // it has been coalesced, so it is rejected rather than navigated to.
    !(c.lat === 0 && c.lng === 0) &&
    Math.abs(c.lat) <= 90 &&
    Math.abs(c.lng) <= 180
  )
}

/**
 * The map URL for a destination, or null when there is nothing real to point at.
 *
 * Null is the contract every caller keys off: it renders no Directions control
 * rather than a dead or misleading one.
 */
export function resolveDirections(target: DirectionsTarget): DirectionsResolution | null {
  const { coords, coordsApprox, address, label } = target

  if (!coordsApprox && validCoords(coords)) {
    const destination = `${coords.lat},${coords.lng}`
    const params = new URLSearchParams({ api: '1', destination })
    return {
      href: `https://www.google.com/maps/dir/?${params.toString()}`,
      kind: 'coords',
    }
  }

  const written = address?.trim()
  if (written) {
    // The place name is prepended when it adds information the address does
    // not already carry, which is what disambiguates two units at one address.
    const query = label && !written.includes(label) ? `${label}, ${written}` : written
    const params = new URLSearchParams({ api: '1', query })
    return {
      href: `https://www.google.com/maps/search/?${params.toString()}`,
      kind: 'address',
    }
  }

  return null
}

/** Convenience for callers that only need the URL. */
export function directionsHref(target: DirectionsTarget): string | null {
  return resolveDirections(target)?.href ?? null
}

/** Whether a Directions control should render for this record. */
export function hasDirections(target: DirectionsTarget): boolean {
  return resolveDirections(target) !== null
}
