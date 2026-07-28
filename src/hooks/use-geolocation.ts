import { useEffect, useState } from 'react'
import { KUSHTIA_CENTER } from '@/lib/config'
import type { LatLng } from '@/data/types'

type GeoState = {
  origin: LatLng
  /** True once the browser has given us a real fix. */
  isPrecise: boolean
  denied: boolean
}

/**
 * Never blocks rendering. Results appear immediately ranked against the Kushtia
 * town centre, and silently re-rank if and when a real fix arrives. Users on a
 * slow device should never wait on a permission prompt to see a hospital.
 */
export function useGeolocation(): GeoState {
  const [state, setState] = useState<GeoState>({
    origin: KUSHTIA_CENTER,
    isPrecise: false,
    denied: false,
  })

  useEffect(() => {
    if (!('geolocation' in navigator)) return

    let cancelled = false
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return
        setState({
          origin: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          isPrecise: true,
          denied: false,
        })
      },
      () => {
        if (cancelled) return
        setState((p) => ({ ...p, denied: true }))
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 },
    )

    return () => {
      cancelled = true
    }
  }, [])

  return state
}
