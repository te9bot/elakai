import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MAP_DEFAULTS } from '@/lib/config'
import type { LatLng } from '@/data/types'

/**
 * Imperative Leaflet rather than react-leaflet: this module is only ever
 * reached through a dynamic import, and dropping the wrapper keeps the lazy
 * chunk meaningfully smaller.
 *
 * Leaflet's default marker icons resolve to bundler-hostile image URLs, so the
 * pin is an inline SVG divIcon instead — no extra requests, and it matches the
 * app's own mark.
 */
export default function LeafletMap({ coords, label }: { coords: LatLng; label: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!ref.current || mapRef.current) return

    const map = L.map(ref.current, {
      center: [coords.lat, coords.lng],
      zoom: MAP_DEFAULTS.detailZoom,
      scrollWheelZoom: false,
      attributionControl: true,
    })
    mapRef.current = map

    L.tileLayer(MAP_DEFAULTS.tileUrl, {
      attribution: MAP_DEFAULTS.attribution,
      maxZoom: 19,
    }).addTo(map)

    const icon = L.divIcon({
      className: 'elakai-pin',
      iconSize: [34, 44],
      iconAnchor: [17, 42],
      html: `<svg viewBox="0 0 34 44" width="34" height="44" xmlns="http://www.w3.org/2000/svg">
        <path d="M17 1C8.7 1 2 7.7 2 16c0 11 13.1 25.3 13.7 25.9a1.8 1.8 0 0 0 2.6 0C18.9 41.3 32 27 32 16 32 7.7 25.3 1 17 1Z"
              fill="#2498EB" stroke="#fff" stroke-width="2.5"/>
        <circle cx="17" cy="16" r="5.5" fill="#fff"/>
      </svg>`,
    })

    L.marker([coords.lat, coords.lng], { icon, title: label }).addTo(map)

    // The container is revealed by a state change, so Leaflet may have measured
    // it at zero height.
    requestAnimationFrame(() => map.invalidateSize())

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [coords.lat, coords.lng, label])

  return (
    <div
      ref={ref}
      className="h-64 w-full sm:h-80"
      role="application"
      aria-label={label}
    />
  )
}
