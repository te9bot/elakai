import { lazy, Suspense, useState } from 'react'
import { Map as MapIcon } from 'lucide-react'
import { DirectionsButton } from '@/components/directions-button'
import { LogoPlaceholder } from '@/components/brand-loader'
import type { LatLng } from '@/data/types'
import { useI18n } from '@/lib/i18n'

// Leaflet and its CSS are ~45kb gzipped and reach an external tile server.
// Neither is loaded until the user actually taps "Show map", which keeps the
// common "call this place" path free of both costs.
const LeafletMap = lazy(() => import('./leaflet-map'))

export function MapPanel({
  coords,
  coordsApprox,
  address,
  label,
}: {
  coords: LatLng
  /** True when `coords` is an area centre — see lib/directions.ts. */
  coordsApprox?: boolean
  address?: string | null
  label: string
}) {
  const { t } = useI18n()
  const [shown, setShown] = useState(false)

  return (
    <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
      {shown ? (
        <Suspense fallback={<LogoPlaceholder className="h-64 w-full sm:h-80" />}>
          <LeafletMap coords={coords} label={label} />
        </Suspense>
      ) : (
        <button
          type="button"
          onClick={() => setShown(true)}
          className="surveyor-grid group relative flex h-64 w-full flex-col items-center justify-center gap-3 bg-surface-2 transition-colors hover:bg-surface-2/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:h-80"
        >
          <span className="grid size-14 place-items-center rounded-control bg-primary text-white shadow-card transition-transform group-hover:scale-105">
            <MapIcon className="size-6" aria-hidden="true" />
          </span>
          <span className="text-body font-bold">{t('biz.showMap')}</span>
          <span className="max-w-xs px-6 text-center text-meta text-pretty text-ink-subtle">
            {t('biz.mapHint')}
          </span>
        </button>
      )}

      {/* Renders nothing when there is no real destination, leaving the map
          preview above it as the only thing in the panel. */}
      <DirectionsButton
        coords={coords}
        coordsApprox={coordsApprox}
        address={address}
        label={label}
        size="lg"
        block
        className="rounded-none border-x-0 border-b-0 border-t border-line"
      />
    </div>
  )
}
